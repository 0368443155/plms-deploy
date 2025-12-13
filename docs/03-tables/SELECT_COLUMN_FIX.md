# Fix: Select Column Type - Missing Dropdown and Options

## Issue Description

**Mô tả lỗi:**
Cột có kiểu dữ liệu "Lựa chọn" (select) không hiển thị dropdown/radio button mà lại hiển thị dưới dạng text input và hoạt động như kiểu dữ liệu văn bản thông thường.

**Tác động:**
- Không có UI để chọn từ danh sách options
- Không có cách config options khi tạo cột
- Trải nghiệm người dùng kém, không đúng với mong đợi của column type "select"

## Steps to Reproduce

1. Vào **Bảng dữ liệu** (Tables)
2. Tạo bảng với vài cột và hàng, trong đó có 1 cột dạng **Lựa chọn**
3. Quan sát cột lựa chọn
4. Nhấn vào và nhập liệu
5. Quan sát kết quả

**Kết quả thực tế (KQTT):**
- ❌ Cột "Lựa chọn": Trống trơn, không hiển thị dropdown hay radio button
- ❌ Hoạt động như kiểu dữ liệu văn bản
- ❌ Không có cách config options khi tạo cột

**Kết quả mong muốn (KQMM):**
- ✅ Cột "Lựa chọn": Phải hiển thị dropdown để người dùng chọn 1 phương án
- ✅ Có thể nhập liệu mới nếu option chưa tồn tại
- ✅ Có UI để config options khi tạo cột

## Root Cause Analysis

### Vấn đề 1: No Special Handling for Select Type

Code cũ không có logic riêng cho select column trong editing mode:

```tsx
// ❌ OLD - Select falls into "Other column types"
{isEditing ? (
  column.type === "checkbox" ? (
    // Checkbox UI
  ) : (
    // ❌ ALL other types use text input, including select!
    <Input type="text" />
  )
) : (
  ...
)}
```

### Vấn đề 2: No Options Configuration UI

Khi tạo cột mới, không có UI để config select options:

```tsx
// ❌ OLD - No way to add select options
<Dialog>
  <Input placeholder="Tên cột" />
  <select>
    <option>Văn bản</option>
    <option>Số</option>
    <option>Lựa chọn</option>  {/* ❌ No options config! */}
  </select>
</Dialog>
```

## Solution Implemented

### Part 1: Select Cell Editing UI

Added dropdown + text input combo for select columns:

```tsx
// ✅ NEW - Select has its own UI
{isEditing ? (
  column.type === "checkbox" ? (
    // Checkbox UI
  ) : column.type === "select" ? (
    // ✅ Select-specific UI
    <div className="flex items-center gap-2">
      <select>
        <option value="">-- Chọn --</option>
        {options.map(opt => <option value={opt}>{opt}</option>)}
      </select>
      <Input placeholder="Hoặc nhập mới..." />
    </div>
  ) : (
    // Other types
    <Input type={...} />
  )
) : (
  ...
)}
```

### Part 2: Options Configuration in Add Column Modal

Added UI to configure select options when creating a column:

```tsx
{newColumnType === "select" && (
  <div className="space-y-2">
    <Label>Tùy chọn</Label>
    <div className="flex gap-2">
      <Input
        value={newOption}
        placeholder="Nhập tùy chọn..."
        onKeyDown={(e) => {
          if (e.key === "Enter" && newOption.trim()) {
            setSelectOptions([...selectOptions, newOption.trim()]);
            setNewOption("");
          }
        }}
      />
      <Button onClick={addOption}>Thêm</Button>
    </div>
    {/* Display added options as badges */}
    <div className="flex flex-wrap gap-2">
      {selectOptions.map((option, index) => (
        <span className="badge">
          {option}
          <button onClick={() => removeOption(index)}>×</button>
        </span>
      ))}
    </div>
  </div>
)}
```

### Part 3: Display Mode with Badge Styling

Select values are displayed with badge/pill styling:

```tsx
{column.type === "select" ? (
  cellValue ? (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      {cellValue}
    </span>
  ) : (
    <span className="text-muted-foreground italic">Click để chọn</span>
  )
) : (
  ...
)}
```

## Features

### 1. Dropdown Selection
- ✅ Click cell → See dropdown with predefined options
- ✅ Select from existing options
- ✅ Options saved immediately on selection

### 2. Custom Input
- ✅ Text input field to add new options
- ✅ Type custom value if not in dropdown
- ✅ Debounced save for text input

### 3. Options Management
- ✅ Add options when creating column
- ✅ Options stored as JSON in `config` field
- ✅ Remove options with × button
- ✅ Prevent duplicate options

### 4. Visual Design
- ✅ Badge/pill styling for selected values
- ✅ Blue color scheme for select values
- ✅ Placeholder text when empty

## Data Format

**Select Options Config (stored in `column.config`):**
```json
["Option 1", "Option 2", "Option 3"]
```

**Cell Value:**
```
"Option 1"  // Simple string value
```

## Code Changes

**File:** `app/(main)/(routes)/tables/_components/table-editor.tsx`

### 1. Added State Variables (Lines ~62-64)
```tsx
const [selectOptions, setSelectOptions] = useState<string[]>([]);
const [newOption, setNewOption] = useState("");
```

### 2. Updated handleAddColumn (Lines ~169-195)
```tsx
const config = newColumnType === "select" && selectOptions.length > 0
  ? JSON.stringify(selectOptions)
  : undefined;
  
await addColumn({
  tableId,
  name: newColumnName,
  type: newColumnType,
  config,  // ✅ Save options as JSON
});
```

### 3. Added Select Editing UI (Lines ~343-393)
```tsx
column.type === "select" ? (
  <div className="flex items-center gap-2">
    <select>...</select>
    <Input placeholder="Hoặc nhập mới..." />
  </div>
) : (
  ...
)
```

### 4. Added Select Display UI (Lines ~438-448)
```tsx
column.type === "select" ? (
  <span className="badge">{cellValue}</span>
) : (
  ...
)
```

### 5. Added Options Config UI (Lines ~526-587)
```tsx
{newColumnType === "select" && (
  <div className="space-y-2">
    <Input placeholder="Nhập tùy chọn..." />
    <Button>Thêm</Button>
    {/* Display options as badges */}
  </div>
)}
```

## Testing Checklist

### Test Case 1: Create Select Column with Options
- [ ] Click "Thêm cột"
- [ ] Enter column name: "Trạng thái"
- [ ] Select type: "Lựa chọn"
- [ ] **Expected:** See "Tùy chọn" section appear
- [ ] Add options: "Đang làm", "Hoàn thành", "Đã hủy"
- [ ] **Expected:** Options appear as blue badges
- [ ] Click "Thêm cột"
- [ ] **Expected:** Column created with options

### Test Case 2: Select from Dropdown
- [ ] Click on a select cell
- [ ] **Expected:** See dropdown with options + text input
- [ ] Select "Đang làm" from dropdown
- [ ] **Expected:** Value saved immediately
- [ ] Click outside
- [ ] **Expected:** Value displayed as blue badge

### Test Case 3: Add Custom Option
- [ ] Click on a select cell
- [ ] Type "Tạm dừng" in text input
- [ ] Press Enter or click outside
- [ ] **Expected:** Custom value saved
- [ ] **Expected:** Value displayed as blue badge

### Test Case 4: Remove Option from Config
- [ ] Create select column with 3 options
- [ ] Click × on one option badge
- [ ] **Expected:** Option removed from list
- [ ] Create column
- [ ] **Expected:** Removed option not in dropdown

### Test Case 5: Prevent Duplicate Options
- [ ] Add option "Option A"
- [ ] Try to add "Option A" again
- [ ] **Expected:** Duplicate not added

### Test Case 6: Empty Select Column
- [ ] Create select column without options
- [ ] **Expected:** Warning message shown
- [ ] Click on cell
- [ ] **Expected:** Dropdown shows only "-- Chọn --"
- [ ] Can still type custom value

## UI/UX Improvements

### Before:
```
[Click cell] → [Text input] ❌
```

### After:
```
[Click cell] → [Dropdown ▼] [Text input: "Hoặc nhập mới..."] ✅
```

### Visual Layout:

**Editing Mode:**
```
┌────────────────────────────────────────────────────┐
│ [Dropdown ▼ Chọn option] [Hoặc nhập mới...       ] │
└────────────────────────────────────────────────────┘
```

**Display Mode:**
```
┌────────────────────────────────────────────────────┐
│ ┌──────────┐                                       │
│ │ Option 1 │  ← Blue badge                         │
│ └──────────┘                                       │
└────────────────────────────────────────────────────┘
```

**Add Column Modal:**
```
┌─────────────────────────────────────┐
│ Tên cột: [Trạng thái            ]   │
│ Loại cột: [Lựa chọn ▼          ]   │
│                                     │
│ Tùy chọn:                           │
│ [Nhập tùy chọn...    ] [Thêm]      │
│                                     │
│ ┌──────────┐ ┌──────────┐          │
│ │ Option 1 ×│ │ Option 2 ×│         │
│ └──────────┘ └──────────┘          │
└─────────────────────────────────────┘
```

## Files Modified

1. `app/(main)/(routes)/tables/_components/table-editor.tsx`
   - Added state for select options management
   - Added select editing UI with dropdown + text input
   - Added select display UI with badge styling
   - Added options configuration UI in Add Column modal
   - Updated handleAddColumn to save options config

## Date Fixed
2025-12-13

## Priority
**High** - Core functionality missing

## Related Issues
- Select column type implementation
- Options management UI
- Dropdown component integration

## Future Enhancements

1. **Option Colors:**
   - Allow custom colors for each option
   - Color picker in options config

2. **Multi-Select:**
   - Support selecting multiple options
   - Checkbox-based selection

3. **Option Reordering:**
   - Drag and drop to reorder options
   - Priority/importance ordering

4. **Option Groups:**
   - Group related options together
   - Nested dropdown structure

5. **Search in Dropdown:**
   - Filter options by typing
   - Fuzzy search support

## Notes

- Options are stored as JSON array in `column.config` field
- Dropdown uses native `<select>` element for simplicity
- Text input allows adding custom values not in dropdown
- Badge styling uses Tailwind CSS classes
- Options are validated to prevent duplicates
- Empty options list shows warning message
