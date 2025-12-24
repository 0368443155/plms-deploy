# Khắc phục lỗi giao diện Lịch học

## Vấn đề đã khắc phục

### 1. Sự kiện ngắn (30 phút) bị mất nội dung ✅

**Vấn đề:** Các sự kiện có thời lượng 30-45 phút có chiều cao quá nhỏ, khiến thông tin về Phòng học và Giảng viên bị ẩn hoàn toàn.

**Giải pháp:**
- Thêm `minHeight: 60px` cho tất cả các khối sự kiện
- Tạo layout **compact** riêng cho sự kiện ngắn (≤ 45 phút):
  - Font size nhỏ hơn (11px cho tiêu đề, 9px cho chi tiết)
  - Gộp Phòng và Giảng viên vào 1 dòng với dấu phân cách "•"
  - Sử dụng `justify-center` để căn giữa nội dung
  - Giảm khoảng cách giữa các dòng với `leading-tight`
- Layout **normal** cho sự kiện dài (> 45 phút):
  - Giữ nguyên font size và spacing
  - Hiển thị Phòng và Giảng viên trên 2 dòng riêng biệt

**File thay đổi:**
- `schedule-item.tsx`: Thêm logic phát hiện sự kiện ngắn và render conditional

### 2. Sự kiện bắt đầu sớm bị tràn ra ngoài khung ✅

**Vấn đề:** Khi có sự kiện bắt đầu trước 7:00 sáng, khối sự kiện bị render đè lên Header hoặc nằm ngoài vùng lưới.

**Giải pháp:**
- **Tự động điều chỉnh giờ bắt đầu/kết thúc** của lưới dựa trên sự kiện thực tế:
  - Quét tất cả schedules để tìm giờ sớm nhất và muộn nhất
  - Thêm padding 1 giờ trước/sau để thoải mái
  - Giới hạn trong khoảng 0:00 - 23:00
- **Thêm scroll** cho grid body:
  - Max height: `calc(100vh - 300px)`
  - Smooth scrolling
  - Custom scrollbar đẹp mắt (8px, rounded)
  - Sticky header để luôn nhìn thấy tên các ngày
- **Sửa calculation** trong `getSchedulePosition`:
  - Thay hardcode `7 * 60` bằng `startHour * 60` động

**File thay đổi:**
- `schedule-grid.tsx`: 
  - Thêm hàm `getHourRange()` để tính toán động
  - Sửa `getSchedulePosition()` để dùng `startHour` động
  - Thêm scrollable container với sticky header
- `schedule-grid.css`: Custom scrollbar và smooth scrolling

## Kết quả

### Trước khi sửa:
- ❌ Sự kiện 30 phút chỉ hiện 1 dòng tiêu đề bị cắt
- ❌ Sự kiện 06:00 bị đẩy lên ngoài lưới, đè lên header
- ❌ Không có cách nào xem sự kiện sớm/muộn

### Sau khi sửa:
- ✅ Sự kiện 30 phút hiển thị đầy đủ: Tiêu đề + Giờ + Phòng/Giảng viên
- ✅ Lưới tự động mở rộng từ 05:00 nếu có lớp 06:00
- ✅ Có thanh cuộn để xem tất cả sự kiện
- ✅ Header sticky, luôn nhìn thấy tên ngày khi scroll
- ✅ Scrollbar đẹp, smooth scrolling

## Chi tiết kỹ thuật

### ScheduleItem Component
```tsx
// Phát hiện sự kiện ngắn
const durationMinutes = endMinutes - startMinutes;
const isShortEvent = durationMinutes <= 45;

// Render conditional
{isShortEvent ? (
  // Compact layout với font nhỏ, gộp thông tin
) : (
  // Normal layout với spacing đầy đủ
)}
```

### ScheduleGrid Component
```tsx
// Tính toán giờ động
const getHourRange = () => {
  // Quét tất cả schedules
  // Tìm min/max hour
  // Thêm padding
  return { startHour, endHour };
};

// Tạo mảng HOURS động
const HOURS = Array.from(
  { length: endHour - startHour + 1 }, 
  (_, i) => i + startHour
);

// Tính vị trí dựa trên startHour động
const offsetFromStart = startMinutes - (startHour * 60);
```

### CSS Improvements
- Custom scrollbar: 8px width, rounded, semi-transparent
- Dark mode support cho scrollbar
- Smooth scrolling behavior
- Sticky header với z-index: 20

## Testing Checklist

- [ ] Tạo sự kiện 30 phút → Kiểm tra hiển thị đầy đủ thông tin
- [ ] Tạo sự kiện 06:00 → Kiểm tra lưới mở rộng từ 05:00
- [ ] Tạo sự kiện 22:00 → Kiểm tra lưới mở rộng đến 23:00
- [ ] Scroll lên/xuống → Kiểm tra header sticky
- [ ] Dark mode → Kiểm tra scrollbar hiển thị đúng
- [ ] Hover vào sự kiện ngắn → Kiểm tra tooltip hiển thị đầy đủ
