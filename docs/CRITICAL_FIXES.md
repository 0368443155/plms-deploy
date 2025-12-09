# 🔧 DETAILED FIX GUIDE - UC14 & UC19

**Mục đích:** Hướng dẫn chi tiết fix schema mismatch cho UC14 và UC19

---

## 🔴 CRITICAL FIX #1: UC14 - Tables Schema

### Vấn đề

Tài liệu hiện tại sử dụng **denormalized schema** (1 table với nested arrays), nhưng `schema_new.ts` sử dụng **normalized schema** (4 separate tables).

### So sánh

#### ❌ Tài liệu hiện tại (WRONG):
```typescript
tables: defineTable({
  documentId: v.id("documents"),
  userId: v.string(),
  name: v.string(),
  columns: v.array(v.object({      // ❌ Nested array
    id: v.string(),
    name: v.string(),
    type: v.string(),
    // ...
  })),
  rows: v.array(v.object({          // ❌ Nested array
    id: v.string(),
    cells: v.object({}),            // ❌ Dynamic object
    // ...
  })),
})
```

#### ✅ Schema thực tế (CORRECT):
```typescript
// Table 1: Tables metadata
tables: defineTable({
  userId: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})

// Table 2: Columns definition
tableColumns: defineTable({
  tableId: v.id("tables"),
  name: v.string(),
  type: v.string(),
  order: v.number(),
  config: v.optional(v.string()),
  width: v.optional(v.number()),
})

// Table 3: Rows
tableRows: defineTable({
  tableId: v.id("tables"),
  order: v.number(),
  createdAt: v.number(),
})

// Table 4: Cells data
tableCells: defineTable({
  rowId: v.id("tableRows"),
  columnId: v.id("tableColumns"),
  value: v.string(),
})
```

### Tại sao normalized schema tốt hơn?

1. ✅ **Scalability:** Dễ dàng thêm/xóa columns/rows
2. ✅ **Performance:** Indexes hiệu quả hơn
3. ✅ **Flexibility:** Dễ dàng query specific cells
4. ✅ **Data integrity:** Foreign keys ensure consistency

### APIs cần rewrite

#### 1. Create Table

**Tài liệu hiện tại:**
```typescript
export const createTable = mutation({
  args: {
    documentId: v.id("documents"),
    name: v.string(),
    columns: v.array(v.object({...})),  // ❌
  },
  handler: async (ctx, args) => {
    const tableId = await ctx.db.insert("tables", {
      documentId: args.documentId,
      userId,
      name: args.name,
      columns: args.columns,  // ❌ Direct insert
      rows: [],
    });
    return tableId;
  },
});
```

**Fixed version:**
```typescript
export const createTable = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    columns: v.array(v.object({
      name: v.string(),
      type: v.string(),
      config: v.optional(v.string()),
      width: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
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
```

#### 2. Add Row

**Fixed version:**
```typescript
export const addRow = mutation({
  args: {
    tableId: v.id("tables"),
    cells: v.optional(v.record(v.string(), v.string())), // { columnId: value }
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    // Verify table ownership
    const table = await ctx.db.get(args.tableId);
    if (!table || table.userId !== userId) {
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
      await Promise.all(
        Object.entries(args.cells).map(([columnId, value]) =>
          ctx.db.insert("tableCells", {
            rowId,
            columnId: columnId as Id<"tableColumns">,
            value,
          })
        )
      );
    }
    
    return rowId;
  },
});
```

#### 3. Update Cell

**Fixed version:**
```typescript
export const updateCell = mutation({
  args: {
    rowId: v.id("tableRows"),
    columnId: v.id("tableColumns"),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    // Verify ownership through row -> table
    const row = await ctx.db.get(args.rowId);
    if (!row) throw new Error("Row not found");
    
    const table = await ctx.db.get(row.tableId);
    if (!table || table.userId !== userId) {
      throw new Error("Unauthorized");
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
  },
});
```

#### 4. Get Table Data

**Fixed version:**
```typescript
export const getTableData = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    // Get table
    const table = await ctx.db.get(args.tableId);
    if (!table || table.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    // Get columns
    const columns = await ctx.db
      .query("tableColumns")
      .withIndex("by_table_order", (q) => q.eq("tableId", args.tableId))
      .collect();
    
    // Get rows
    const rows = await ctx.db
      .query("tableRows")
      .withIndex("by_table_order", (q) => q.eq("tableId", args.tableId))
      .collect();
    
    // Get all cells for this table
    const cells = await Promise.all(
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
      cells: cells[index].reduce((acc, cell) => {
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
```

---

## 🔴 CRITICAL FIX #2: UC19 - Chat Schema

### Vấn đề

Tài liệu sử dụng **single table** với `conversationId`, nhưng `schema_new.ts` sử dụng **2 separate tables** (sessions + messages).

### So sánh

#### ❌ Tài liệu hiện tại (WRONG):
```typescript
aiChats: defineTable({
  documentId: v.id("documents"),
  userId: v.string(),
  conversationId: v.string(),  // ❌ String ID
  role: v.string(),
  content: v.string(),
  // ...
})
```

#### ✅ Schema thực tế (CORRECT):
```typescript
// Table 1: Chat sessions
chatSessions: defineTable({
  userId: v.string(),
  documentId: v.id("documents"),
  title: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})

// Table 2: Chat messages
chatMessages: defineTable({
  sessionId: v.id("chatSessions"),  // ✅ Proper foreign key
  role: v.string(),
  content: v.string(),
  model: v.optional(v.string()),
  tokens: v.optional(v.number()),
  createdAt: v.number(),
})
```

### Tại sao 2 tables tốt hơn?

1. ✅ **Better organization:** Sessions và messages tách biệt
2. ✅ **Easier queries:** Query sessions list, then messages
3. ✅ **Metadata:** Session có thể có title, summary, etc.
4. ✅ **Performance:** Index on sessionId hiệu quả hơn

### APIs cần rewrite

#### 1. Chat with AI

**Fixed version:**
```typescript
export const chatWithAI = action({
  args: {
    documentId: v.id("documents"),
    sessionId: v.optional(v.id("chatSessions")),  // ✅ Use sessionId
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    // Get or create session
    let sessionId = args.sessionId;
    if (!sessionId) {
      // Create new session
      sessionId = await ctx.runMutation(internal.ai.createChatSession, {
        userId,
        documentId: args.documentId,
      });
    }
    
    // Get conversation history
    const history = await ctx.runQuery(internal.ai.getChatHistory, {
      sessionId,
    });
    
    // Get document content
    const document = await ctx.runQuery(internal.documents.getById, {
      documentId: args.documentId,
    });
    
    if (!document || document.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    const documentContext = extractPlainText(document.content);
    
    // Call Gemini API
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: `Context: ${documentContext}` }],
        },
        {
          role: "model",
          parts: [{ text: "I understand the context." }],
        },
        ...history.map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        })),
      ],
    });
    
    // Save user message
    await ctx.runMutation(internal.ai.saveChatMessage, {
      sessionId,
      role: "user",
      content: args.message,
    });
    
    // Get AI response
    const result = await chat.sendMessage(args.message);
    const response = result.response.text();
    
    // Save assistant message
    await ctx.runMutation(internal.ai.saveChatMessage, {
      sessionId,
      role: "assistant",
      content: response,
      model: "gemini-pro",
    });
    
    // Update session timestamp
    await ctx.runMutation(internal.ai.updateSessionTimestamp, {
      sessionId,
    });
    
    return {
      sessionId,
      response,
      model: "gemini-pro",
    };
  },
});
```

#### 2. Create Chat Session (Internal)

```typescript
export const createChatSession = internalMutation({
  args: {
    userId: v.string(),
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const sessionId = await ctx.db.insert("chatSessions", {
      userId: args.userId,
      documentId: args.documentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return sessionId;
  },
});
```

#### 3. Get Chat History (Internal)

```typescript
export const getChatHistory = internalQuery({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_session_created", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    return messages;
  },
});
```

#### 4. Save Chat Message (Internal)

```typescript
export const saveChatMessage = internalMutation({
  args: {
    sessionId: v.id("chatSessions"),
    role: v.string(),
    content: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("chatMessages", {
      sessionId: args.sessionId,
      role: args.role,
      content: args.content,
      model: args.model,
      createdAt: Date.now(),
    });
    
    return messageId;
  },
});
```

#### 5. Get Sessions

```typescript
export const getChatSessions = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    const sessions = await ctx.db
      .query("chatSessions")
      .withIndex("by_user_document", (q) =>
        q.eq("userId", userId).eq("documentId", args.documentId)
      )
      .order("desc")
      .collect();
    
    // Get first message for each session to show preview
    const sessionsWithPreview = await Promise.all(
      sessions.map(async (session) => {
        const firstMessage = await ctx.db
          .query("chatMessages")
          .withIndex("by_session_created", (q) => q.eq("sessionId", session._id))
          .first();
        
        return {
          ...session,
          preview: firstMessage?.content.substring(0, 100) || "",
        };
      })
    );
    
    return sessionsWithPreview;
  },
});
```

---

## 📝 SUMMARY OF CHANGES

### UC14 - Tables

| Component | Change | Impact |
|-----------|--------|--------|
| Schema | 1 table → 4 tables | HIGH |
| APIs | Rewrite all CRUD | HIGH |
| UI | Update queries | MEDIUM |
| Documentation | Complete rewrite | HIGH |

### UC19 - AI Chat

| Component | Change | Impact |
|-----------|--------|--------|
| Schema | 1 table → 2 tables | MEDIUM |
| APIs | Update to use sessionId | MEDIUM |
| UI | Update conversation management | LOW |
| Documentation | Update examples | MEDIUM |

---

## ✅ ACTION ITEMS

1. **Update UC14 documentation:**
   - [ ] Replace schema section
   - [ ] Rewrite all API examples
   - [ ] Update UI component examples
   - [ ] Add note about normalized schema benefits

2. **Update UC19 documentation:**
   - [ ] Replace schema section
   - [ ] Update API examples to use sessionId
   - [ ] Update conversation management logic
   - [ ] Add session list UI examples

3. **Test implementations:**
   - [ ] Create test data in Convex dashboard
   - [ ] Verify all queries work correctly
   - [ ] Test performance with large datasets

---

**Tạo bởi:** AI Assistant  
**Ngày:** 10/12/2025  
**Priority:** CRITICAL - Must fix before implementation
