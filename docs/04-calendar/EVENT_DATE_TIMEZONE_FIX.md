# Fix: Ngày bắt đầu sự kiện bị lùi 1 ngày trong popup chỉnh sửa

## Issue Description

**Mô tả lỗi:**
Khi tạo sự kiện "Cả ngày" (All-day event) trên lịch tổng quan, sự kiện hiển thị đúng trên calendar. Tuy nhiên, khi mở popup để chỉnh sửa, trường "Ngày bắt đầu" bị lùi lại 1 ngày so với dữ liệu gốc.

**Ví dụ:**
- Tạo sự kiện từ 20/12 đến 21/12
- Hiển thị trên calendar: ✅ Đúng (20-21/12)
- Mở popup edit: ❌ Hiển thị 19/12 (Sai, bị lùi 1 ngày)

**Tác động:**
- Gây nhầm lẫn cho người dùng
- Nếu người dùng bấm "Cập nhật", sự kiện sẽ bị dời sai lịch
- Vi phạm tính nhất quán dữ liệu

## Steps to Reproduce

1. Vào trang **Lịch tổng quan** (Calendar View)
2. Tạo một sự kiện "Cả ngày" kéo dài 2 ngày
   - Ví dụ: Từ **20/12** đến **21/12**
3. Kiểm tra trên Lịch tổng quan: Sự kiện hiển thị đúng dải ngày 20-21
4. Click vào sự kiện đó để mở **Popup "Sửa sự kiện"**

**Kết quả thực tế (KQTT):**
- Trường "Ngày bắt đầu" hiển thị là **19/12/2025** (Sai, bị lùi 1 ngày)
- Nếu người dùng bấm "Cập nhật", sự kiện sẽ bị dời sai lịch

**Kết quả mong muốn (KQMM):**
- Trường "Ngày bắt đầu" phải hiển thị chính xác là **20/12/2025** như đã tạo

## Root Cause Analysis

### Nguyên nhân chính: UTC vs Local Timezone Conversion

#### Code cũ (Có lỗi):
```tsx
const start = new Date(event.startDate);
setStartDate(start.toISOString().split("T")[0]);
```

#### Vấn đề:

1. **Database lưu timestamp:** `1734652800000` (20/12/2025 00:00:00 UTC)
2. **toISOString() trả về:** `"2025-12-20T00:00:00.000Z"` (UTC)
3. **Split lấy date:** `"2025-12-20"`
4. **Nhưng...**
   - Khi `new Date(event.startDate)` được tạo, nó convert sang local timezone
   - Nếu bạn ở GMT+7, `2025-12-20T00:00:00Z` = `2025-12-20T07:00:00+07:00`
   - `toISOString()` convert lại về UTC
   - Với all-day events, thời gian được set là `00:00:00`, khi convert có thể bị lùi về ngày hôm trước

### Ví dụ cụ thể:

**Timezone: GMT+7 (Vietnam)**

```
Database: 2025-12-20T00:00:00.000Z (UTC)
         ↓
new Date(timestamp) = 2025-12-20T07:00:00+07:00 (Local)
         ↓
toISOString() = "2025-12-20T00:00:00.000Z" (UTC)
         ↓
split("T")[0] = "2025-12-20"
```

**Nhưng nếu database lưu:**
```
Database: 2025-12-19T17:00:00.000Z (UTC) 
         ↓ (This is midnight in GMT+7)
new Date(timestamp) = 2025-12-20T00:00:00+07:00 (Local)
         ↓
toISOString() = "2025-12-19T17:00:00.000Z" (UTC)
         ↓
split("T")[0] = "2025-12-19" ❌ BỊ LÙI 1 NGÀY!
```

## Solution Implemented

### Approach: Use Local Date Methods

Thay vì dùng `toISOString()` (luôn trả về UTC), sử dụng local date methods:

```tsx
const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatLocalTime = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

setStartDate(formatLocalDate(start));
setStartTime(formatLocalTime(start));
```

### Why This Works:

| Method | Timezone | Result for GMT+7 |
|--------|----------|------------------|
| `toISOString()` | ❌ UTC | `"2025-12-19T17:00:00.000Z"` → `"2025-12-19"` |
| `getFullYear()`, `getMonth()`, `getDate()` | ✅ Local | `2025`, `11`, `20` → `"2025-12-20"` |

### Code Changes

**File:** `app/(main)/(routes)/calendar/_components/event-modal.tsx`

**Lines 60-97:** Updated `useEffect` to use local date formatting

#### Before:
```tsx
setStartDate(start.toISOString().split("T")[0]);
setStartTime(start.toTimeString().split(":").slice(0, 2).join(":") || "");
```

#### After:
```tsx
const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatLocalTime = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

setStartDate(formatLocalDate(start));
setStartTime(formatLocalTime(start));
```

## Testing Checklist

### Test Case 1: All-Day Event (2 days)
- [ ] Create all-day event from Dec 20 to Dec 21
- [ ] Verify event shows correctly on calendar (spans Dec 20-21)
- [ ] Click event to open edit modal
- [ ] **Expected:** Start date shows "20/12/2025" ✅
- [ ] **Expected:** End date shows "21/12/2025" ✅
- [ ] Click "Cập nhật" without changes
- [ ] **Expected:** Event remains on Dec 20-21 ✅

### Test Case 2: All-Day Event (Single day)
- [ ] Create all-day event on Dec 25
- [ ] Open edit modal
- [ ] **Expected:** Start date shows "25/12/2025" ✅
- [ ] **Expected:** End date shows "25/12/2025" ✅

### Test Case 3: Timed Event
- [ ] Create event on Dec 20, 14:00 - 16:00
- [ ] Open edit modal
- [ ] **Expected:** Start date shows "20/12/2025" ✅
- [ ] **Expected:** Start time shows "14:00" ✅
- [ ] **Expected:** End time shows "16:00" ✅

### Test Case 4: Cross-Timezone
- [ ] Create event in one timezone
- [ ] Change system timezone
- [ ] Open edit modal
- [ ] **Expected:** Date should remain consistent in local time ✅

### Test Case 5: Edge Cases
- [ ] Test with events at midnight (00:00)
- [ ] Test with events at 23:59
- [ ] Test with events spanning month boundaries
- [ ] Test with events spanning year boundaries

## Technical Details

### Date Formatting Functions

```tsx
// Format date for <input type="date"> (YYYY-MM-DD)
const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();           // Local year
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Local month (0-indexed)
  const day = String(date.getDate()).padStart(2, '0');        // Local day
  return `${year}-${month}-${day}`;
};

// Format time for <input type="time"> (HH:MM)
const formatLocalTime = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');     // Local hours
  const minutes = String(date.getMinutes()).padStart(2, '0'); // Local minutes
  return `${hours}:${minutes}`;
};
```

### Why Not Use Other Methods?

| Method | Issue |
|--------|-------|
| `toISOString()` | ❌ Always returns UTC, causes timezone offset |
| `toLocaleDateString()` | ❌ Format varies by locale, not compatible with `<input type="date">` |
| `toDateString()` | ❌ Returns "Mon Dec 20 2025", not YYYY-MM-DD format |
| **Local methods** | ✅ Consistent, timezone-aware, correct format |

## Browser Compatibility

All modern browsers support these methods:
- ✅ `getFullYear()` - All browsers
- ✅ `getMonth()` - All browsers
- ✅ `getDate()` - All browsers
- ✅ `getHours()` - All browsers
- ✅ `getMinutes()` - All browsers
- ✅ `String.padStart()` - ES2017+ (all modern browsers)

## Files Modified

1. `app/(main)/(routes)/calendar/_components/event-modal.tsx`
   - Updated `useEffect` hook (lines 60-97)
   - Added `formatLocalDate()` helper function
   - Added `formatLocalTime()` helper function
   - Applied to all three scenarios: editing event, creating from slot, creating manually

## Related Issues

- Timezone handling in date pickers
- All-day event date representation
- UTC vs local time conversion
- Date input format compatibility

## Date Fixed
2025-12-13

## Priority
**High** - Data integrity and UX issue

## Prevention

To prevent similar issues in the future:

1. **Always use local date methods** when working with `<input type="date">` and `<input type="time">`
2. **Store timestamps in UTC** in the database (already doing this ✅)
3. **Convert to local time** only when displaying to users
4. **Test with different timezones** during development
5. **Be aware of DST** (Daylight Saving Time) transitions

## Additional Notes

- This fix applies to all three code paths in the `useEffect`:
  1. Editing existing event
  2. Creating event from calendar slot (drag/click)
  3. Creating event manually
- The fix maintains backward compatibility with existing events in the database
- No database migration needed - this is purely a display/input formatting issue
- The `handleSubmit` function already correctly creates Date objects from the form inputs

## References

- [MDN: Date.prototype.getFullYear()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getFullYear)
- [MDN: Date.prototype.toISOString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)
- [HTML Input Date Format](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/date)
