# Fix: Cột Checkbox hiển thị sai component khi chỉnh sửa

## Issue Description

**Mô tả lỗi:**
Cột có kiểu dữ liệu "Checkbox" hiển thị đúng icon ở trạng thái xem, nhưng khi nhấp chuột vào để chỉnh sửa, hệ thống hiển thị **text input field** thay vì cho phép check/uncheck trực tiếp. Ngoài ra, text nhập vào không được lưu và hiển thị.

**Tác động:**
- Không thể toggle checkbox khi editing
- Mất dữ liệu: Text nhập vào không hiển thị
- UX kém: Người dùng không thể sử dụng checkbox đúng cách
- Vi phạm mong đợi của người dùng về cách hoạt động của checkbox

## Steps to Reproduce

1. Vào **Bảng dữ liệu** (Tables)
2. Tạo 1 bảng mới có cột dữ liệu dạng **Checkbox**
3. Quan sát cột checkbox ở chế độ xem (read-only)
4. Nhấn vào 1 ô checkbox để chỉnh sửa
5. Quan sát component hiển thị
6. Thử nhập text vào ô
7. Click ra ngoài để lưu
8. Quan sát kết quả

**Kết quả thực tế (KQTT):**
- ❌ Hiển thị sai control: Thay vì toggle checkbox, hệ thống hiển thị **ô nhập text** (Input text field)
- ❌ Mất dữ liệu: Sau khi nhập text và thoát ra, nội dung vừa nhập không hiển thị lên ô
- ❌ Ô trở về trạng thái trống hoặc default

**Kết quả mong muốn (KQMM):**
- ✅ Ô checkbox có thể **tích chọn** (check/uncheck)
- ✅ Có thể **nhập liệu text** để hiển thị tên/label cho checkbox
- ✅ Cả checkbox và text đều được lưu và hiển thị đúng

## Root Cause Analysis

### Code cũ (Có lỗi):

```tsx
{isEditing ? (
  <Input
    type={
      column.type === "number"
        ? "number"
        : column.type === "date"
        ? "date"
        : "text"  // ❌ Checkbox cũng dùng text input!
    }
    value={editingValue}
    onChange={(e) => setEditingValue(e.target.value)}
    // ...
  />
) : (
  <div className="min-h-[32px] flex items-center">
    {column.type === "checkbox" ? (
      <input
        type="checkbox"
        checked={cellValue === "true"}
        readOnly  // ✅ Chỉ hiển thị đúng khi KHÔNG editing
      />
    ) : (
      <span>{cellValue}</span>
    )}
  </div>
)}
```

### Vấn đề:

1. **Không có logic riêng cho checkbox trong editing mode**
   - Tất cả column types đều dùng `<Input>` khi `isEditing = true`
   - Checkbox không được xử lý đặc biệt

2. **Thiếu component kết hợp checkbox + text input**
   - Theo yêu cầu, checkbox cần cả checkbox toggle VÀ text label
   - Code cũ chỉ có text input hoặc checkbox, không có cả hai

3. **Không có data format cho checkbox với label**
   - Cần format: `"true|Label text"` hoặc `"false|Label text"`
   - Code cũ chỉ lưu `"true"` hoặc `"false"`

## Solution Implemented

### Approach: Conditional Rendering Based on Column Type

Tạo logic riêng cho checkbox trong editing mode:

```tsx
{isEditing ? (
  column.type === "checkbox" ? (
    // ✅ Checkbox editing mode: show checkbox + text input
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={editingValue === "true" || editingValue.startsWith("true")}
        onChange={(e) => {
          // Preserve label text when toggling
          const currentLabel = editingValue.includes("|") 
            ? editingValue.substring(editingValue.indexOf("|") + 1)
            : "";
          const newValue = e.target.checked 
            ? `true|${currentLabel}` 
            : `false|${currentLabel}`;
          setEditingValue(newValue);
          debouncedUpdateCell(row._id, column._id, newValue);
        }}
      />
      <Input
        type="text"
        value={/* extract label from "true|label" format */}
        onChange={(e) => {
          const checked = editingValue.startsWith("true");
          const newValue = `${checked}|${e.target.value}`;
          setEditingValue(newValue);
        }}
        placeholder="Nhập tên checkbox..."
      />
    </div>
  ) : (
    // Other column types: regular input
    <Input type={...} />
  )
) : (
  // Display mode
  ...
)}
```

### Data Format

**Checkbox cell value format:**
```
"true|Label text"   // Checked with label
"false|Label text"  // Unchecked with label
"true"              // Checked without label (legacy)
"false"             // Unchecked without label (legacy)
```

### Key Features

1. **Dual Input:**
   - Checkbox for toggle (checked/unchecked)
   - Text input for label

2. **Data Preservation:**
   - When toggling checkbox, label text is preserved
   - When editing label, checkbox state is preserved

3. **Backward Compatible:**
   - Handles old format (`"true"` / `"false"`)
   - Handles new format (`"true|label"` / `"false|label"`)

4. **Immediate Checkbox Update:**
   - Checkbox changes are saved immediately via `debouncedUpdateCell`
   - Text changes use debounce (500ms)

## Code Changes

**File:** `app/(main)/(routes)/tables/_components/table-editor.tsx`

### 1. Editing Mode (Lines 300-340)

**Before:**
```tsx
{isEditing ? (
  <Input type="text" ... />  // ❌ All columns use text input
) : (
  ...
)}
```

**After:**
```tsx
{isEditing ? (
  column.type === "checkbox" ? (
    // ✅ Checkbox-specific editing UI
    <div className="flex items-center gap-2">
      <input type="checkbox" ... />
      <Input type="text" placeholder="Nhập tên checkbox..." />
    </div>
  ) : (
    // Other column types
    <Input type={...} />
  )
) : (
  ...
)}
```

### 2. Display Mode (Lines 370-390)

**Before:**
```tsx
{column.type === "checkbox" ? (
  <input
    type="checkbox"
    checked={cellValue === "true"}  // ❌ Only handles "true"/"false"
    readOnly
  />
) : (
  <span>{cellValue}</span>
)}
```

**After:**
```tsx
{column.type === "checkbox" ? (
  <>
    <input
      type="checkbox"
      checked={cellValue === "true" || cellValue.startsWith("true")}  // ✅ Handles both formats
      readOnly
    />
    <span>
      {cellValue.includes("|") 
        ? cellValue.substring(cellValue.indexOf("|") + 1)  // ✅ Show label
        : ""}
    </span>
  </>
) : (
  <span>{cellValue}</span>
)}
```

## Testing Checklist

### Test Case 1: Basic Checkbox Toggle
- [ ] Create a table with a checkbox column
- [ ] Click on a checkbox cell
- [ ] **Expected:** See checkbox + text input field
- [ ] Click checkbox to toggle
- [ ] **Expected:** Checkbox state changes immediately
- [ ] Click outside to save
- [ ] **Expected:** Checkbox state is saved

### Test Case 2: Checkbox with Label
- [ ] Click on a checkbox cell
- [ ] Check the checkbox
- [ ] Type "Task completed" in the text field
- [ ] Click outside to save
- [ ] **Expected:** Checkbox is checked AND "Task completed" is displayed
- [ ] Click cell again
- [ ] **Expected:** Checkbox is checked AND text field shows "Task completed"

### Test Case 3: Toggle Preserves Label
- [ ] Create checkbox with label "Important task"
- [ ] Click to edit
- [ ] Uncheck the checkbox
- [ ] **Expected:** Label "Important task" remains in text field
- [ ] Click outside to save
- [ ] **Expected:** Checkbox is unchecked AND "Important task" is still displayed

### Test Case 4: Edit Label Preserves Checkbox State
- [ ] Create checked checkbox with label "Done"
- [ ] Click to edit
- [ ] Change label to "Completed"
- [ ] **Expected:** Checkbox remains checked
- [ ] Click outside to save
- [ ] **Expected:** Checkbox is checked AND label is "Completed"

### Test Case 5: Legacy Data Compatibility
- [ ] Manually set cell value to "true" (without label)
- [ ] Click to edit
- [ ] **Expected:** Checkbox is checked, text field is empty
- [ ] Type a label
- [ ] **Expected:** Value becomes "true|label"

### Test Case 6: Empty Checkbox
- [ ] Click on empty checkbox cell
- [ ] **Expected:** Checkbox is unchecked, text field is empty with placeholder
- [ ] Check checkbox without typing label
- [ ] **Expected:** Value is "true|" (checked without label)

## UI/UX Improvements

### Before:
```
[Click cell] → [Text input: "true"] ❌
```

### After:
```
[Click cell] → [☑ Checkbox] [Text input: "Label..."] ✅
```

### Visual Layout:

**Editing Mode:**
```
┌─────────────────────────────────────┐
│ ☑ [Nhập tên checkbox...           ] │
└─────────────────────────────────────┘
```

**Display Mode:**
```
┌─────────────────────────────────────┐
│ ☑ Task completed                    │
└─────────────────────────────────────┘
```

## Technical Details

### Value Parsing Functions

```tsx
// Check if checkbox is checked
const isChecked = (value: string) => {
  return value === "true" || value.startsWith("true");
};

// Extract label from value
const getLabel = (value: string) => {
  if (value.includes("|")) {
    return value.substring(value.indexOf("|") + 1);
  }
  return value === "true" || value === "false" ? "" : value;
};

// Create checkbox value
const createCheckboxValue = (checked: boolean, label: string) => {
  return `${checked}|${label}`;
};
```

### Event Handling

1. **Checkbox onChange:**
   - Extracts current label
   - Creates new value with updated checked state
   - Immediately saves via `debouncedUpdateCell`

2. **Text Input onChange:**
   - Extracts current checked state
   - Creates new value with updated label
   - Updates local state (debounced save on blur)

3. **Click Propagation:**
   - `onClick={(e) => e.stopPropagation()}` on editing div
   - Prevents cell click handler from firing when interacting with inputs

## Files Modified

1. `app/(main)/(routes)/tables/_components/table-editor.tsx`
   - Updated editing mode rendering (lines ~300-340)
   - Updated display mode rendering (lines ~370-390)
   - Added checkbox-specific logic
   - Added label extraction and formatting

## Date Fixed
2025-12-13

## Priority
**High** - Core functionality issue

## Related Issues
- Table cell editing UX
- Checkbox data format
- Multi-input cell editing

## Future Enhancements

Potential improvements for the future:

1. **Rich Checkbox Options:**
   - Add color picker for checkbox
   - Add icons for different checkbox states
   - Support for tri-state checkboxes (checked, unchecked, indeterminate)

2. **Keyboard Navigation:**
   - Space bar to toggle checkbox
   - Tab to move between checkbox and text input
   - Enter to save and move to next cell

3. **Batch Operations:**
   - Select multiple checkboxes
   - Bulk check/uncheck
   - Filter rows by checkbox state

4. **Data Validation:**
   - Max label length
   - Required label for checked items
   - Custom validation rules

## Notes

- The fix maintains backward compatibility with existing checkbox data
- The `|` character is used as a delimiter between checked state and label
- If users need to use `|` in labels, consider using a different delimiter (e.g., `::` or URL encoding)
- The checkbox updates immediately on toggle for better UX
- Text input uses debounced updates to reduce API calls
