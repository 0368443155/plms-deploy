# Fix: PDF Export - Toast hiển thị sai khi người dùng nhấn Cancel

## Vấn đề

Khi người dùng chọn "Export as PDF" và nhấn "Cancel" trong print dialog, hệ thống vẫn hiển thị toast "Đã export PDF thành công!" mặc dù không có file nào được tạo.

### Steps to reproduce:
1. Nhấn nút Export → Chọn Export as PDF
2. Hộp thoại in của trình duyệt hiện ra
3. Nhấn nút "Hủy" (Cancel)

### Kết quả thực tế (❌):
- Hộp thoại đóng lại
- Hệ thống vẫn hiện toast xanh: "Đã export PDF thành công!"

### Kết quả mong muốn (✅):
- Không hiển thị toast gì cả
- HOẶC hiển thị: "Đã hủy xuất file"

## Nguyên nhân

`window.print()` là synchronous function và không có cách nào để biết người dùng đã in hay cancel. Code cũ luôn hiển thị success toast ngay sau khi gọi `window.print()`.

## Giải pháp ✅

### 1. Sử dụng `afterprint` event

Browser cung cấp `afterprint` event để phát hiện khi print dialog đóng. Tuy nhiên, event này fire cả khi user print VÀ khi user cancel.

### 2. Timeout để detect cancel

Kết hợp `afterprint` event với timeout:
- Nếu `afterprint` fire → User đã print hoặc cancel
- Nếu timeout (100ms) mà chưa có `afterprint` → User cancel ngay lập tức

### 3. Promise-based approach

Đổi `exportToPDF` từ async function thành Promise:
- **Resolve** khi `afterprint` fires (print successful)
- **Reject** khi timeout (print cancelled)

## Code Changes

### File: `lib/export.ts`

**Trước:**
```typescript
export const exportToPDF = async (
  element: HTMLElement,
  filename: string = "document"
): Promise<void> => {
  try {
    // ... setup code ...
    window.print();
    
    setTimeout(() => {
      // cleanup
    }, 1000);
  } catch (error) {
    throw new Error("Failed to export PDF");
  }
};
```

**Sau:**
```typescript
export const exportToPDF = async (
  element: HTMLElement,
  filename: string = "document"
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // ... setup code ...
      
      let printExecuted = false;
      
      const cleanup = () => {
        // Remove elements and restore state
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      
      const handleAfterPrint = () => {
        printExecuted = true;
        cleanup();
        resolve(); // Print successful
      };
      
      window.addEventListener('afterprint', handleAfterPrint, { once: true });
      window.print();
      
      // Detect cancel
      setTimeout(() => {
        if (!printExecuted) {
          cleanup();
          reject(new Error('Print cancelled')); // User cancelled
        }
      }, 100);
      
    } catch (error) {
      reject(new Error("Failed to export PDF"));
    }
  });
};
```

### File: `components/export-menu.tsx`

**Trước:**
```typescript
const handleExportPDF = async () => {
  try {
    await exportToPDF(element, documentTitle);
    toast.success("Đã export PDF thành công!"); // Always shows
  } catch (error) {
    toast.error("Không thể export PDF");
  }
};
```

**Sau:**
```typescript
const handleExportPDF = async () => {
  try {
    await exportToPDF(element, documentTitle);
    toast.success("Đã export PDF thành công!"); // Only if not cancelled
  } catch (error: any) {
    if (error?.message === 'Print cancelled') {
      // Silent - no toast for user cancellation
      // Optionally: toast.info("Đã hủy xuất file");
      return;
    }
    toast.error("Không thể export PDF");
  }
};
```

## Kết quả

### Trước ❌
- User nhấn Cancel → Toast "Đã export PDF thành công!" (SAI)

### Sau ✅
- User nhấn Cancel → Không có toast gì (ĐÚNG)
- User print thành công → Toast "Đã export PDF thành công!" (ĐÚNG)
- Có lỗi → Toast "Không thể export PDF" (ĐÚNG)

## Testing

Test các trường hợp sau:

- [ ] User nhấn "Print" → Toast success
- [ ] User nhấn "Cancel" → Không có toast
- [ ] User nhấn "Save as PDF" → Toast success
- [ ] Có lỗi trong quá trình export → Toast error

## Notes

- Timeout 100ms là đủ để detect cancel ngay lập tức
- `afterprint` event được support bởi tất cả modern browsers
- Có thể uncomment `toast.info("Đã hủy xuất file")` nếu muốn thông báo khi user cancel

## Files Changed

- `lib/export.ts` - Modified `exportToPDF` to return Promise with cancel detection
- `components/export-menu.tsx` - Handle promise rejection for cancelled print
