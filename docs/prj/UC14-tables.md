# 📊 UC14: TABLES & DATABASE MODULE

## 📋 Mục lục
1. [Tổng quan](#1-tổng-quan)
2. [Database Schema (Normalized)](#2-database-schema-normalized)
3. [UC14.1: Xem và Render Bảng](#3-uc141-xem-và-render-bảng)
4. [UC14.2: Chỉnh sửa Cell (Debounce)](#4-uc142-chỉnh-sửa-cell-debounce)
5. [UC14.3: Quản lý Cột và Data Types](#5-uc143-quản-lý-cột-và-data-types)
6. [UC14.4: Thêm/Xóa Hàng](#6-uc144-thêmxóa-hàng)

---

## 1. Tổng quan

Module Tables cung cấp khả năng quản lý dữ liệu dạng bảng tính (spreadsheet-like), tương tự như Notion Database.
Điểm đặc biệt là cấu trúc dữ liệu được **chuẩn hóa (normalized)** thay vì lưu JSON blob, giúp dễ dàng truy vấn và mở rộng.

### 1.1 Tính năng chính
- **Dynamic Columns**: Thêm/xóa cột tùy ý.
- **Rich Data Types**: Text, Number, Date, Select (Single choice), Checkbox.
- **Real-time Collaboration**: Sửa ô này, người khác thấy ngay.
- **Auto-save**: Cơ chế debounce giúp lưu tự động mượt mà.

---

## 2. Database Schema (Normalized)

Thay vì lưu mảng JSON lớn trong một document, chúng tôi tách thành 4 bảng liên kết:

```typescript
// convex/schema.ts

// 1. Bảng chứa thông tin chung
tables: defineTable({
  userId: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  // ... timestamps
}),

// 2. Cấu hình cột
tableColumns: defineTable({
  tableId: v.id("tables"), // FK
  name: v.string(),
  type: v.string(),        // "text", "number", "select"...
  order: v.number(),
  config: v.optional(v.string()), // JSON for select options
  width: v.optional(v.number()),
}).index("by_table_order", ["tableId", "order"]),

// 3. Hàng (chỉ chứa order)
tableRows: defineTable({
  tableId: v.id("tables"), // FK
  order: v.number(),
}).index("by_table_order", ["tableId", "order"]),

// 4. Ô dữ liệu (Giá trị thực tế)
tableCells: defineTable({
  rowId: v.id("tableRows"),       // FK
  columnId: v.id("tableColumns"), // FK
  value: v.string(),              // Luôn lưu dạng string
}).index("by_row_column", ["rowId", "columnId"]),
```

**Ưu điểm:**
- Truy vấn từng ô dễ dàng.
- Không bị giới hạn kích thước document (1MB limit của Convex).
- Dễ dàng làm tính năng sort/filter sau này.

---

## 3. UC14.1: Xem và Render Bảng

### 3.1 Data Fetching Strategy

API `getById` thực hiện join dữ liệu từ 4 bảng để trả về cấu trúc dễ dùng cho Frontend:

```typescript
// convex/tables.ts -> getById
// 1. Get Rows
const rows = await ctx.db.query("tableRows")...collect();

// 2. Get Cells (Parallel)
const cellsData = await Promise.all(
  rows.map((row) =>
    ctx.db.query("tableCells").withIndex("by_row", ...).collect()
  )
);

// 3. Transform (Pivot)
const rowsWithCells = rows.map((row, index) => ({
  ...row,
  cells: cellsData[index].reduce((acc, cell) => {
    acc[cell.columnId] = cell.value; // Map: columnId -> value
    return acc;
  }, {}),
}));
```

### 3.2 Dynamic Rendering

Frontend duyệt qua mảng `columns` để vẽ header, và duyệt `rows` để vẽ body.

```tsx
// tables/_components/table-editor.tsx
<thead>
  {columns.map(col => (
    <th style={{ width: col.width }}>{col.name}</th>
  ))}
</thead>
<tbody>
  {rows.map(row => (
    <tr>
      {columns.map(col => (
        <td>{row.cells[col._id]}</td>
      ))}
    </tr>
  ))}
</tbody>
```

---

## 4. UC14.2: Chỉnh sửa Cell (Debounce)

Để tránh gửi quá nhiều request khi người dùng đang gõ phím, chúng tôi sử dụng kỹ thuật **Debounce**.

### 4.1 Frontend Logic

```typescript
// tables/_components/table-editor.tsx

// Ref lưu timeout và giá trị đang chờ
const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

const debouncedUpdateCell = useCallback((rowId, columnId, value) => {
  // Clear timeout cũ
  if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);

  // Set timeout mới (500ms)
  updateTimeoutRef.current = setTimeout(async () => {
    await updateCell({ rowId, columnId, value });
  }, 500);
}, []);
```

### 4.2 Optimistic UI
Ngoài debounce, UI cập nhật state cục bộ (`setEditingValue`) ngay lập tức để người dùng không thấy độ trễ.

---

## 5. UC14.3: Quản lý Cột và Data Types

### 5.1 Các loại dữ liệu (Column Types)

Hệ thống hỗ trợ 5 loại cột, mỗi loại có cách render và edit riêng:

| Type | Render Component | Edit Component | Note |
|------|------------------|----------------|------|
| Text | `<span>` | `Input type="text"` | Mặc định |
| Number | `<span>` | `Input type="number"` | Validate số |
| Date | `<span>` | `Input type="date"` | Format dd/mm/yyyy |
| Checkbox | `input[checkbox]` | Combo `Checkbox + Input` | Format `true\|label` |
| Select | `Badge` (pill) | `Select` dropdown | Có thể thêm option mới |

### 5.2 Xử lý Select/Tags

Cột "Select" cho phép người dùng nhập giá trị mới, hệ thống tự động thêm vào danh sách options.

```typescript
// Logic thêm option mới
if (!existingOptions.includes(newValue)) {
  // Update cấu hình cột (cột chứa danh sách options trong field `config`)
  await updateColumnConfig({
    columnId,
    config: JSON.stringify([...existingOptions, newValue]),
  });
}
```

---

## 6. UC14.4: Thêm/Xóa Hàng

### 6.1 Thêm Hàng
Khi thêm hàng, chúng ta tạo một record trong `tableRows`. Các record trong `tableCells` **chưa cần tạo ngay**.

Design choice: **Sparse Data**.
- Nếu ô trống -> Không có record trong `tableCells`.
- Tiết kiệm dữ liệu và index.

```typescript
// convex/tables.ts -> addRow
export const addRow = mutation({
  handler: async (ctx, args) => {
    // Chỉ tạo row, không tạo cells rỗng
    const rowId = await ctx.db.insert("tableRows", {
      tableId: args.tableId,
      order: currentLength, 
    });
    return rowId;
  }
});
```

### 6.2 Xóa Hàng Audit

Khi xóa hàng (`deleteRow`), backend phải xóa sạch cells liên quan để tránh dữ liệu rác (orphan data).

```typescript
// convex/tables.ts -> deleteRow
const cells = await ctx.db.query("tableCells").withIndex("by_row"...).collect();

// Xóa tất cả cells song song
await Promise.all(cells.map(cell => ctx.db.delete(cell._id)));

// Xóa row
await ctx.db.delete(args.rowId);
```

---

*Cập nhật lần cuối: 26/12/2024*
