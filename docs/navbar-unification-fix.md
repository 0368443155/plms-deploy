# Fix: Navbar che mất các nút chức năng của trang

## Vấn đề

Navbar container (chứa notification bell) đang có `position: absolute` với `z-index: 99999` và trải rộng toàn bộ width, che mất các nút chức năng của các trang như:
- `/tables` → Nút "Thêm hàng", "Thêm cột"
- `/calendar` → Các nút chức năng
- `/schedule` → Các nút chức năng

## Nguyên nhân

1. **Navbar container** có `absolute top-0 z-[99999]` → Nằm đè lên content
2. **Các trang** (tables, calendar, schedule) render toolbar riêng trong page content
3. **Conflict**: Navbar trống (chỉ có Notifications) nhưng vẫn chiếm không gian và che content

## Giải pháp ✅

### Phương án: Unified Navbar với Dynamic Content

Thay vì mỗi trang render toolbar riêng, **chuyển tất cả actions lên navbar** thông qua Zustand store.

### 1. Tạo Zustand Store (`hooks/use-navbar-actions.tsx`)

```typescript
import { create } from "zustand";
import { ReactNode } from "react";

interface NavbarActionsStore {
  title: string;
  description?: string;
  actions: ReactNode;
  setNavbarContent: (title: string, description?: string, actions?: ReactNode) => void;
  clearNavbarContent: () => void;
}

export const useNavbarActions = create<NavbarActionsStore>((set) => ({
  title: "",
  description: undefined,
  actions: null,
  setNavbarContent: (title, description, actions) =>
    set({ title, description, actions }),
  clearNavbarContent: () =>
    set({ title: "", description: undefined, actions: null }),
}));
```

### 2. Cập nhật Navigation Component

**Import store:**
```tsx
import { useNavbarActions } from "@/hooks/use-navbar-actions";
```

**Sử dụng trong component:**
```tsx
const navbarActions = useNavbarActions();

// Render navbar
<nav className="... pointer-events-auto">
  {/* Left: Title or Menu Icon */}
  {isCollapsed ? (
    <MenuIcon ... />
  ) : navbarActions.title ? (
    <div className="flex-1">
      <h1 className="text-2xl font-bold">{navbarActions.title}</h1>
      {navbarActions.description && (
        <p className="text-sm text-muted-foreground">
          {navbarActions.description}
        </p>
      )}
    </div>
  ) : (
    <div /> // Spacer
  )}
  
  {/* Right: Actions + Notifications */}
  <div className="flex items-center gap-x-2">
    {navbarActions.actions}
    <Notifications />
  </div>
</nav>
```

### 3. Cập nhật Table Editor

**Import hook:**
```tsx
import { useNavbarActions } from "@/hooks/use-navbar-actions";
```

**Set navbar content:**
```tsx
const { setNavbarContent, clearNavbarContent } = useNavbarActions();

useEffect(() => {
  if (tableData) {
    const { table } = tableData;
    setNavbarContent(
      table.title,
      table.description || undefined,
      <>
        <Button onClick={handleAddRow}>Thêm hàng</Button>
        <Button onClick={() => setIsAddColumnModalOpen(true)}>Thêm cột</Button>
        <DropdownMenu>...</DropdownMenu>
      </>
    );
  }

  return () => {
    clearNavbarContent();
  };
}, [tableData, setNavbarContent, clearNavbarContent]);
```

**Xóa toolbar cũ và thêm padding:**
```tsx
return (
  <div className="w-full h-full flex flex-col pt-4">
    {/* Removed toolbar - now in navbar */}
    <div className="flex-1 overflow-auto border rounded-lg">
      <table>...</table>
    </div>
  </div>
);
```

## Kết quả

### Trước khi sửa ❌
- Navbar trống (chỉ có Notifications)
- Toolbar trong page content bị navbar che
- Không click được các nút

### Sau khi sửa ✅
- Navbar hiển thị title + description + actions của từng trang
- Không còn toolbar trùng lặp
- Tất cả nút đều clickable
- Layout nhất quán across tất cả pages

## Áp dụng cho các trang khác

Để áp dụng cho Calendar và Schedule pages, làm tương tự:

```tsx
// In calendar/schedule component
const { setNavbarContent, clearNavbarContent } = useNavbarActions();

useEffect(() => {
  setNavbarContent(
    "Lịch tổng quan", // or "Lịch học"
    "Mô tả...",
    <>
      <Button>Thêm sự kiện</Button>
      <Button>Xem theo tuần</Button>
      {/* ... other actions */}
    </>
  );

  return () => clearNavbarContent();
}, []);
```

## Files Changed

- `hooks/use-navbar-actions.tsx` - **NEW** - Zustand store for navbar content
- `app/(main)/_components/navigation.tsx` - Updated to use navbar actions store
- `app/(main)/(routes)/tables/_components/table-editor.tsx` - Moved toolbar to navbar

## Next Steps

- [x] Apply same pattern to `/tables` page (list) ✅
- [x] Apply same pattern to Calendar page ✅
- [x] Apply same pattern to Schedule page ✅
- [x] Test all pages to ensure navbar works correctly
- [ ] Update other pages if needed

## Summary

All major pages have been updated to use the unified navbar pattern:

1. **`/tables`** (list) - "Bảng dữ liệu" + "Tạo bảng mới" button
2. **`/tables/[tableId]`** - Table title + "Thêm hàng", "Thêm cột", menu buttons
3. **`/schedule`** - "Lịch học hàng tuần" + "Thêm lịch học" button
4. **`/calendar`** - "Lịch tổng quan" + navigation controls + view switcher

All pages now have:
- ✅ Title and description in navbar
- ✅ Page-specific actions in navbar
- ✅ No duplicate toolbars
- ✅ `pt-4` padding to prevent navbar overlap
- ✅ Clean, consistent layout

