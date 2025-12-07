# UC14 - QUẢN LÝ BẢNG (TABLES)

## 1. THÔNG TIN CƠ BẢN

- **Mã UC:** UC14
- **Tên:** Quản lý bảng dữ liệu
- **Mô tả:** Cho phép người dùng tạo, xem, sửa, xóa bảng dữ liệu với rows và columns
- **Actor:** User (Authenticated)
- **Precondition:** User đã đăng nhập
- **Postcondition:** Bảng được tạo/cập nhật/xóa thành công
- **Trạng thái:** ❌ Chưa triển khai
- **Ưu tiên:** 🔴 CAO
- **Thời gian ước tính:** 1.5 tuần
- **Dependencies:** 
  - ✅ Authentication (UC01-UC06)
  - ✅ Documents system (UC07-UC13)
- **Tech Stack:** Convex, React, TypeScript, Tanstack Table

---

## 2. LUỒNG XỬ LÝ

### Main Flow: Tạo bảng mới

1. User click "Tạo bảng" trong document
2. System hiển thị table editor
3. User nhập tên columns và thêm rows
4. User nhập dữ liệu vào cells
5. System auto-save table data
6. System hiển thị bảng với dữ liệu

### Alternative Flow 1: Import từ CSV

3a. User chọn "Import CSV"
3b. System parse CSV file
3c. System tạo columns và rows từ CSV
3d. Continue từ step 5

### Alternative Flow 2: Sử dụng template

3a. User chọn template (Student grades, Schedule, etc.)
3b. System tạo bảng với columns predefined
3c. Continue từ step 4

### Exception Flow

- 2a. Nếu document đã có table → Show existing table
- 4a. Nếu validation fail → Show error inline
- 5a. Nếu network error → Retry auto-save
- *. Nếu unauthorized → Redirect to login

---

## 3. BIỂU ĐỒ HOẠT ĐỘNG

```
[User] → [Create Table] → [Define Columns] → [Add Rows] → [Fill Data] → [Auto-save]
                                                                              ↓
                                                                         [Display Table]
            ↓ (Import CSV)
       [Parse CSV] → [Create Structure] → [Fill Data] → [Auto-save]
```

---

## 4. DATABASE SCHEMA

### 4.1. Tables Table

```typescript
// convex/schema.ts
export default defineSchema({
  // ... existing documents table ...
  
  tables: defineTable({
    documentId: v.id("documents"),      // Link to parent document
    userId: v.string(),                  // Owner
    name: v.string(),                    // Table name
    columns: v.array(v.object({          // Column definitions
      id: v.string(),                    // Unique column ID
      name: v.string(),                  // Column name
      type: v.string(),                  // "text" | "number" | "date" | "select" | "checkbox"
      options: v.optional(v.array(v.string())), // For select type
      width: v.optional(v.number()),     // Column width in px
    })),
    rows: v.array(v.object({             // Row data
      id: v.string(),                    // Unique row ID
      cells: v.object({}),               // Dynamic: { [columnId]: value }
      createdAt: v.number(),
      updatedAt: v.number(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_document", ["documentId"])
    .index("by_user", ["userId"])
    .index("by_user_document", ["userId", "documentId"]),
});
```

### 4.2. Tương thích với Documents hiện tại

```typescript
// Không cần thay đổi documents table
// Table sẽ được embed trong document content hoặc link qua documentId
```

---

## 5. API ENDPOINTS

### 5.1. Create Table

```typescript
// convex/tables.ts
export const createTable = mutation({
  args: {
    documentId: v.id("documents"),
    name: v.string(),
    columns: v.array(v.object({
      id: v.string(),
      name: v.string(),
      type: v.string(),
      options: v.optional(v.array(v.string())),
      width: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    // Verify document ownership
    const document = await ctx.db.get(args.documentId);
    if (!document || document.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    const tableId = await ctx.db.insert("tables", {
      documentId: args.documentId,
      userId,
      name: args.name,
      columns: args.columns,
      rows: [], // Empty initially
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return tableId;
  },
});
```

### 5.2. Get Table by Document

```typescript
export const getTableByDocument = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    const table = await ctx.db
      .query("tables")
      .withIndex("by_user_document", (q) =>
        q.eq("userId", userId).eq("documentId", args.documentId)
      )
      .first();
    
    return table;
  },
});
```

### 5.3. Update Table

```typescript
export const updateTable = mutation({
  args: {
    id: v.id("tables"),
    name: v.optional(v.string()),
    columns: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      type: v.string(),
      options: v.optional(v.array(v.string())),
      width: v.optional(v.number()),
    }))),
    rows: v.optional(v.array(v.object({
      id: v.string(),
      cells: v.object({}),
      createdAt: v.number(),
      updatedAt: v.number(),
    }))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    const { id, ...updates } = args;
    
    const existingTable = await ctx.db.get(id);
    if (!existingTable || existingTable.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});
```

### 5.4. Add Row

```typescript
export const addRow = mutation({
  args: {
    tableId: v.id("tables"),
    cells: v.object({}), // { [columnId]: value }
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    const table = await ctx.db.get(args.tableId);
    
    if (!table || table.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    const newRow = {
      id: crypto.randomUUID(),
      cells: args.cells,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await ctx.db.patch(args.tableId, {
      rows: [...table.rows, newRow],
      updatedAt: Date.now(),
    });
    
    return newRow.id;
  },
});
```

### 5.5. Update Cell

```typescript
export const updateCell = mutation({
  args: {
    tableId: v.id("tables"),
    rowId: v.string(),
    columnId: v.string(),
    value: v.any(), // Can be string, number, boolean, etc.
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    const table = await ctx.db.get(args.tableId);
    
    if (!table || table.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    const updatedRows = table.rows.map((row) => {
      if (row.id === args.rowId) {
        return {
          ...row,
          cells: {
            ...row.cells,
            [args.columnId]: args.value,
          },
          updatedAt: Date.now(),
        };
      }
      return row;
    });
    
    await ctx.db.patch(args.tableId, {
      rows: updatedRows,
      updatedAt: Date.now(),
    });
  },
});
```

### 5.6. Delete Row

```typescript
export const deleteRow = mutation({
  args: {
    tableId: v.id("tables"),
    rowId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    const table = await ctx.db.get(args.tableId);
    
    if (!table || table.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    const updatedRows = table.rows.filter((row) => row.id !== args.rowId);
    
    await ctx.db.patch(args.tableId, {
      rows: updatedRows,
      updatedAt: Date.now(),
    });
  },
});
```

### 5.7. Delete Table

```typescript
export const deleteTable = mutation({
  args: { id: v.id("tables") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    const table = await ctx.db.get(args.id);
    
    if (!table || table.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.delete(args.id);
  },
});
```

---

## 6. UI COMPONENTS

### 6.1. Component Structure

```
components/table/
├── table-view.tsx           # Main table component
├── table-header.tsx         # Column headers with sorting
├── table-row.tsx            # Row component
├── table-cell.tsx           # Editable cell
├── add-column-button.tsx    # Add new column
├── add-row-button.tsx       # Add new row
├── column-type-selector.tsx # Select column type
└── table-toolbar.tsx        # Actions (export, import, etc.)
```

### 6.2. TableView Component

```typescript
// components/table/table-view.tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Download, Upload } from "lucide-react";

interface TableViewProps {
  documentId: Id<"documents">;
}

export const TableView = ({ documentId }: TableViewProps) => {
  const table = useQuery(api.tables.getTableByDocument, { documentId });
  const updateCell = useMutation(api.tables.updateCell);
  const addRow = useMutation(api.tables.addRow);
  const addColumn = useMutation(api.tables.addColumn);
  
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);
  
  if (!table) {
    return <CreateTableButton documentId={documentId} />;
  }
  
  const handleCellChange = async (
    rowId: string,
    columnId: string,
    value: any
  ) => {
    await updateCell({
      tableId: table._id,
      rowId,
      columnId,
      value,
    });
    setEditingCell(null);
  };
  
  return (
    <div className="w-full overflow-x-auto">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <Button onClick={() => addRow({ tableId: table._id, cells: {} })}>
          <Plus className="h-4 w-4 mr-2" />
          Add Row
        </Button>
        <Button onClick={() => addColumn({ tableId: table._id })}>
          <Plus className="h-4 w-4 mr-2" />
          Add Column
        </Button>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
      </div>
      
      {/* Table */}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {table.columns.map((column) => (
              <th
                key={column.id}
                className="border p-2 bg-gray-100 dark:bg-gray-800"
                style={{ width: column.width }}
              >
                {column.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.id}>
              {table.columns.map((column) => (
                <td
                  key={column.id}
                  className="border p-2"
                  onClick={() => setEditingCell({ rowId: row.id, columnId: column.id })}
                >
                  {editingCell?.rowId === row.id &&
                  editingCell?.columnId === column.id ? (
                    <input
                      type="text"
                      defaultValue={row.cells[column.id] || ""}
                      onBlur={(e) =>
                        handleCellChange(row.id, column.id, e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleCellChange(row.id, column.id, e.currentTarget.value);
                        }
                      }}
                      autoFocus
                      className="w-full bg-transparent outline-none"
                    />
                  ) : (
                    <span>{row.cells[column.id] || ""}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### 6.3. Integration với Documents

```typescript
// app/(main)/(routes)/documents/[documentId]/page.tsx
import { TableView } from "@/components/table/table-view";

const DocumentIdPage = ({ params }: { params: { documentId: string } }) => {
  const document = useQuery(api.documents.getById, {
    documentId: params.documentId as Id<"documents">,
  });
  
  return (
    <div>
      {/* Existing document content */}
      <Editor documentId={params.documentId} />
      
      {/* Table section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Data Table</h2>
        <TableView documentId={params.documentId as Id<"documents">} />
      </div>
    </div>
  );
};
```

---

## 7. VALIDATION RULES

| Field | Rule | Error Message |
|-------|------|---------------|
| Table name | Required, max 100 chars | "Tên bảng không được để trống" |
| Column name | Required, max 50 chars | "Tên cột không được để trống" |
| Column type | Must be valid type | "Loại cột không hợp lệ" |
| Cell value (number) | Must be number | "Giá trị phải là số" |
| Cell value (date) | Must be valid date | "Ngày không hợp lệ" |

---

## 8. ERROR HANDLING

| Error Code | Condition | Message | Action |
|------------|-----------|---------|--------|
| `NOT_AUTHENTICATED` | User not logged in | "Vui lòng đăng nhập" | Redirect to login |
| `UNAUTHORIZED` | Not table owner | "Bạn không có quyền chỉnh sửa bảng này" | Show error toast |
| `NOT_FOUND` | Table not found | "Không tìm thấy bảng" | Show error toast |
| `INVALID_COLUMN_TYPE` | Invalid column type | "Loại cột không hợp lệ" | Show error toast |
| `NETWORK_ERROR` | Network failure | "Lỗi kết nối. Đang thử lại..." | Auto-retry |

---

## 9. TEST CASES

### Functional Tests:

**TC01: Create Table**
- Input: documentId, table name, columns
- Expected: Table created successfully
- Actual: ⏳ Pending

**TC02: Add Row**
- Input: tableId, cell data
- Expected: Row added to table
- Actual: ⏳ Pending

**TC03: Update Cell**
- Input: tableId, rowId, columnId, value
- Expected: Cell updated
- Actual: ⏳ Pending

**TC04: Delete Row**
- Input: tableId, rowId
- Expected: Row deleted
- Actual: ⏳ Pending

**TC05: Import CSV**
- Input: CSV file
- Expected: Table created from CSV
- Actual: ⏳ Pending

### Non-functional Tests:

**Performance:**
- Table with 1000 rows: < 1s load time
- Cell update: < 100ms
- Actual: ⏳ Pending

**Security:**
- Authorization check: Must verify userId
- Input sanitization: Must sanitize cell values
- Actual: ⏳ Pending

---

## 10. CODE EXAMPLES

### 10.1. Create Table

```typescript
// Usage in component
const createTable = useMutation(api.tables.createTable);

const handleCreateTable = async () => {
  const tableId = await createTable({
    documentId: documentId,
    name: "Student Grades",
    columns: [
      { id: "col1", name: "Student Name", type: "text" },
      { id: "col2", name: "Grade", type: "number" },
      { id: "col3", name: "Pass/Fail", type: "checkbox" },
    ],
  });
  
  toast.success("Table created!");
};
```

### 10.2. Update Cell

```typescript
const updateCell = useMutation(api.tables.updateCell);

const handleCellUpdate = async (rowId: string, columnId: string, value: any) => {
  await updateCell({
    tableId: table._id,
    rowId,
    columnId,
    value,
  });
};
```

---

## 11. SECURITY CONSIDERATIONS

- ✅ **Authentication:** Require login for all operations
- ✅ **Authorization:** Verify userId on all mutations
- ✅ **Input Validation:** Sanitize cell values to prevent XSS
- ✅ **Data Integrity:** Validate column types before saving
- ✅ **Access Control:** Only table owner can edit

---

## 12. PERFORMANCE OPTIMIZATION

- ✅ **Database:** Index on documentId, userId
- ✅ **Queries:** Use withIndex for filtering
- ✅ **Updates:** Debounce cell updates (300ms)
- ✅ **Rendering:** Virtual scrolling for large tables (react-window)
- ✅ **Caching:** Convex real-time subscriptions

---

## 13. RELATED USE CASES

- **UC07:** Tạo trang mới - Table belongs to document
- **UC08:** Cập nhật trang - Table is part of document content
- **UC11:** Xóa trang - Cascade delete table when document archived
- **UC12:** Khôi phục/Xóa vĩnh viễn - Handle table deletion

---

## 14. REFERENCES

- [Convex Documentation](https://docs.convex.dev/)
- [Tanstack Table](https://tanstack.com/table/v8)
- [CSV Parser](https://www.papaparse.com/)
- [Implementation Guide](../UPDATE_GUIDE.md)

---

**Tạo bởi:** AI Assistant  
**Ngày:** 08/12/2025  
**Trạng thái:** Ready for implementation  
**Ước tính:** 1.5 tuần
