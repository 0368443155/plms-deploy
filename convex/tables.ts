import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Create a new table with columns
 */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    columns: v.array(
      v.object({
        name: v.string(),
        type: v.string(), // "text", "number", "date", "select", "checkbox"
        config: v.optional(v.string()), // JSON config (e.g., select options)
        width: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Validate title
    if (!args.title || args.title.trim() === "") {
      throw new Error("Table title is required");
    }

    // Validate columns
    if (!args.columns || args.columns.length === 0) {
      throw new Error("At least one column is required");
    }

    // Validate column types
    const validTypes = ["text", "number", "date", "select", "checkbox"];
    for (const column of args.columns) {
      if (!validTypes.includes(column.type)) {
        throw new Error(`Invalid column type: ${column.type}. Must be one of: ${validTypes.join(", ")}`);
      }
      if (!column.name || column.name.trim() === "") {
        throw new Error("Column name is required");
      }
    }

    // Step 1: Create table
    const tableId = await ctx.db.insert("tables", {
      userId,
      title: args.title,
      description: args.description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Step 2: Create columns
    await Promise.all(
      args.columns.map((column, index) =>
        ctx.db.insert("tableColumns", {
          tableId,
          name: column.name,
          type: column.type,
          order: index,
          config: column.config,
          width: column.width,
        })
      )
    );

    return tableId;
  },
});

/**
 * Get table data (table + columns + rows + cells)
 */
export const getById = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Get table
    const table = await ctx.db.get(args.tableId);
    if (!table) {
      return null; // Return null instead of throwing error
    }

    if (table.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Get columns (sorted by order)
    const columns = await ctx.db
      .query("tableColumns")
      .withIndex("by_table_order", (q) => q.eq("tableId", args.tableId))
      .collect();

    // Get rows (sorted by order)
    const rows = await ctx.db
      .query("tableRows")
      .withIndex("by_table_order", (q) => q.eq("tableId", args.tableId))
      .collect();

    // Get all cells for this table
    const cellsData = await Promise.all(
      rows.map((row) =>
        ctx.db
          .query("tableCells")
          .withIndex("by_row", (q) => q.eq("rowId", row._id))
          .collect()
      )
    );

    // Transform to UI-friendly format
    const rowsWithCells = rows.map((row, index) => ({
      _id: row._id,
      order: row.order,
      cells: cellsData[index].reduce((acc, cell) => {
        acc[cell.columnId] = cell.value;
        return acc;
      }, {} as Record<string, string>),
    }));

    return {
      table,
      columns,
      rows: rowsWithCells,
    };
  },
});

/**
 * Get all tables for the current user
 */
export const getAll = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const tables = await ctx.db
      .query("tables")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return tables;
  },
});

/**
 * Add a new row to a table
 */
export const addRow = mutation({
  args: {
    tableId: v.id("tables"),
    cells: v.optional(v.record(v.string(), v.string())), // { columnId: value }
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Verify table ownership
    const table = await ctx.db.get(args.tableId);
    if (!table) {
      throw new Error("Table not found");
    }

    if (table.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Get current row count for order
    const existingRows = await ctx.db
      .query("tableRows")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .collect();

    // Create row
    const rowId = await ctx.db.insert("tableRows", {
      tableId: args.tableId,
      order: existingRows.length,
      createdAt: Date.now(),
    });

    // Create cells if provided
    if (args.cells) {
      // Verify all column IDs exist
      const columns = await ctx.db
        .query("tableColumns")
        .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
        .collect();

      const columnIds = new Set(columns.map((col) => col._id));

      await Promise.all(
        Object.entries(args.cells).map(async ([columnId, value]) => {
          if (!columnIds.has(columnId as Id<"tableColumns">)) {
            throw new Error(`Column ${columnId} not found`);
          }

          await ctx.db.insert("tableCells", {
            rowId,
            columnId: columnId as Id<"tableColumns">,
            value: value || "",
          });
        })
      );
    }

    // Update table timestamp
    await ctx.db.patch(args.tableId, {
      updatedAt: Date.now(),
    });

    return rowId;
  },
});

/**
 * Update a cell value
 */
export const updateCell = mutation({
  args: {
    rowId: v.id("tableRows"),
    columnId: v.id("tableColumns"),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Verify ownership through row -> table
    const row = await ctx.db.get(args.rowId);
    if (!row) {
      throw new Error("Row not found");
    }

    const table = await ctx.db.get(row.tableId);
    if (!table) {
      throw new Error("Table not found");
    }

    if (table.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Verify column belongs to the same table
    const column = await ctx.db.get(args.columnId);
    if (!column || column.tableId !== row.tableId) {
      throw new Error("Column does not belong to this table");
    }

    // Find existing cell
    const existingCell = await ctx.db
      .query("tableCells")
      .withIndex("by_row_column", (q) =>
        q.eq("rowId", args.rowId).eq("columnId", args.columnId)
      )
      .first();

    if (existingCell) {
      // Update existing cell
      await ctx.db.patch(existingCell._id, { value: args.value });
    } else {
      // Create new cell
      await ctx.db.insert("tableCells", {
        rowId: args.rowId,
        columnId: args.columnId,
        value: args.value,
      });
    }

    // Update table timestamp
    await ctx.db.patch(row.tableId, {
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a row
 */
export const deleteRow = mutation({
  args: { rowId: v.id("tableRows") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Verify ownership
    const row = await ctx.db.get(args.rowId);
    if (!row) {
      throw new Error("Row not found");
    }

    const table = await ctx.db.get(row.tableId);
    if (!table) {
      throw new Error("Table not found");
    }

    if (table.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Delete all cells in this row
    const cells = await ctx.db
      .query("tableCells")
      .withIndex("by_row", (q) => q.eq("rowId", args.rowId))
      .collect();

    await Promise.all(cells.map((cell) => ctx.db.delete(cell._id)));

    // Delete row
    await ctx.db.delete(args.rowId);

    // Update table timestamp
    await ctx.db.patch(row.tableId, {
      updatedAt: Date.now(),
    });
  },
});

/**
 * Add a new column to a table
 */
export const addColumn = mutation({
  args: {
    tableId: v.id("tables"),
    name: v.string(),
    type: v.string(),
    config: v.optional(v.string()),
    width: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Verify ownership
    const table = await ctx.db.get(args.tableId);
    if (!table) {
      throw new Error("Table not found");
    }

    if (table.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Validate column name
    if (!args.name || args.name.trim() === "") {
      throw new Error("Column name is required");
    }

    // Validate column type
    const validTypes = ["text", "number", "date", "select", "checkbox"];
    if (!validTypes.includes(args.type)) {
      throw new Error(`Invalid column type: ${args.type}. Must be one of: ${validTypes.join(", ")}`);
    }

    // Get current column count for order
    const existingColumns = await ctx.db
      .query("tableColumns")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .collect();

    // Create column
    const columnId = await ctx.db.insert("tableColumns", {
      tableId: args.tableId,
      name: args.name,
      type: args.type,
      order: existingColumns.length,
      config: args.config,
      width: args.width,
    });

    // Update table timestamp
    await ctx.db.patch(args.tableId, {
      updatedAt: Date.now(),
    });

    return columnId;
  },
});

/**
 * Update a table (title, description)
 */
export const update = mutation({
  args: {
    id: v.id("tables"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const { id, ...updates } = args;

    const table = await ctx.db.get(id);
    if (!table) {
      throw new Error("Table not found");
    }

    if (table.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Validate title if provided
    if (updates.title !== undefined && (!updates.title || updates.title.trim() === "")) {
      throw new Error("Table title cannot be empty");
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a table (cascade delete columns, rows, cells)
 */
export const remove = mutation({
  args: { id: v.id("tables") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const table = await ctx.db.get(args.id);
    if (!table) {
      throw new Error("Table not found");
    }

    if (table.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Delete all columns
    const columns = await ctx.db
      .query("tableColumns")
      .withIndex("by_table", (q) => q.eq("tableId", args.id))
      .collect();
    await Promise.all(columns.map((col) => ctx.db.delete(col._id)));

    // Delete all rows and their cells
    const rows = await ctx.db
      .query("tableRows")
      .withIndex("by_table", (q) => q.eq("tableId", args.id))
      .collect();

    for (const row of rows) {
      const cells = await ctx.db
        .query("tableCells")
        .withIndex("by_row", (q) => q.eq("rowId", row._id))
        .collect();
      await Promise.all(cells.map((cell) => ctx.db.delete(cell._id)));
      await ctx.db.delete(row._id);
    }

    // Delete table
    await ctx.db.delete(args.id);
  },
});

