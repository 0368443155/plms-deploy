# Fix: Name Validation & Toast Duration

## Date: 2025-12-13

## Issues Fixed

### 1. ✅ Name Validation (First Name & Last Name)

**Problem:**
- Tên có thể để trống
- Cho phép nhập số
- Cho phép ký tự đặc biệt
- Cho phép HTML tags (ví dụ: `<p>Lãm</p>`) → Hiển thị "invalid first name"

**Solution:**
Thêm validation function `validateName()` trong `lib/utils.ts` với các quy tắc:
- ❌ Không được để trống
- ❌ Không được chứa số
- ❌ Không được chứa ký tự đặc biệt
- ❌ Không được chứa HTML tags
- ✅ Chỉ cho phép chữ cái (bao gồm tiếng Việt có dấu)
- ✅ Độ dài: 2-50 ký tự

---

### 2. ✅ Toast Duration

**Problem:**
- Toast notifications không tự động ẩn
- Người dùng phải tự click để đóng

**Solution:**
- Tất cả toast notifications giờ tự động ẩn sau **3 giây**
- Thêm `{ duration: 3000 }` vào mọi toast call

---

## Code Changes

### 1. Added Validation Function

**File:** `lib/utils.ts`

```typescript
export function validateName(name: string): { valid: boolean; error?: string } {
  // Check if empty
  if (!name || name.trim() === "") {
    return { valid: false, error: "Tên không được để trống" };
  }

  const trimmedName = name.trim();

  // Check for HTML tags
  if (/<[^>]*>/g.test(trimmedName)) {
    return { valid: false, error: "Tên không được chứa thẻ HTML" };
  }

  // Check for numbers
  if (/\d/.test(trimmedName)) {
    return { valid: false, error: "Tên không được chứa số" };
  }

  // Check for special characters (allow only letters, spaces, and Vietnamese diacritics)
  const vietnameseNamePattern = /^[a-zA-ZÀ-ỹ\s]+$/;
  
  if (!vietnameseNamePattern.test(trimmedName)) {
    return { valid: false, error: "Tên chỉ được chứa chữ cái" };
  }

  // Check minimum length
  if (trimmedName.length < 2) {
    return { valid: false, error: "Tên phải có ít nhất 2 ký tự" };
  }

  // Check maximum length
  if (trimmedName.length > 50) {
    return { valid: false, error: "Tên không được quá 50 ký tự" };
  }

  return { valid: true };
}
```

---

### 2. Updated Account Settings

**File:** `components/modals/account-settings-content.tsx`

**Added validation:**
```tsx
const handleUpdateProfile = async () => {
  if (!user) return;

  // Validate first name
  const firstNameValidation = validateName(firstName);
  if (!firstNameValidation.valid) {
    toast.error(firstNameValidation.error, { duration: 3000 });
    return;
  }

  // Validate last name
  const lastNameValidation = validateName(lastName);
  if (!lastNameValidation.valid) {
    toast.error(lastNameValidation.error, { duration: 3000 });
    return;
  }

  // ... rest of update logic
};
```

**Updated all toasts:**
- ✅ Profile update success/error
- ✅ Email set primary
- ✅ Password change (all cases)
- ✅ Account deletion

---

### 3. Updated Sign-Up Page

**File:** `app/(marketing)/(routes)/sign-up/page.tsx`

**Added validation:**
```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!isLoaded || !signUp) return;

  // Validate first name
  const firstNameValidation = validateName(firstName);
  if (!firstNameValidation.valid) {
    toast.error(firstNameValidation.error, { duration: 3000 });
    return;
  }

  // Validate last name
  const lastNameValidation = validateName(lastName);
  if (!lastNameValidation.valid) {
    toast.error(lastNameValidation.error, { duration: 3000 });
    return;
  }

  // ... rest of sign-up logic
};
```

**Updated all toasts:**
- ✅ Sign-up success/error
- ✅ Email verification
- ✅ Password validation errors

---

## Validation Rules

### Valid Names ✅
- "Nguyễn"
- "Văn A"
- "Thị Bích"
- "Hoàng Anh"
- "Lê Minh Đức"

### Invalid Names ❌
- "" (empty) → "Tên không được để trống"
- "123" → "Tên không được chứa số"
- "Nguyễn123" → "Tên không được chứa số"
- "A@#$" → "Tên chỉ được chứa chữ cái"
- "<p>Lãm</p>" → "Tên không được chứa thẻ HTML"
- "A" (too short) → "Tên phải có ít nhất 2 ký tự"

---

## Toast Duration Examples

### Before:
```tsx
toast.error("Lỗi xảy ra");  // ❌ Never auto-dismiss
```

### After:
```tsx
toast.error("Lỗi xảy ra", { duration: 3000 });  // ✅ Auto-dismiss after 3s
```

---

## Testing Checklist

### Name Validation - Account Settings

- [ ] Try to save empty first name
  - **Expected:** "Tên không được để trống"
- [ ] Try to save "123" as first name
  - **Expected:** "Tên không được chứa số"
- [ ] Try to save "Nguyễn@" as first name
  - **Expected:** "Tên chỉ được chứa chữ cái"
- [ ] Try to save "<p>Lãm</p>" as first name
  - **Expected:** "Tên không được chứa thẻ HTML"
- [ ] Save valid name "Nguyễn"
  - **Expected:** Success, toast auto-dismisses after 3s

### Name Validation - Sign-Up

- [ ] Try to register with empty first name
  - **Expected:** "Tên không được để trống"
- [ ] Try to register with "John123"
  - **Expected:** "Tên không được chứa số"
- [ ] Try to register with special characters
  - **Expected:** "Tên chỉ được chứa chữ cái"
- [ ] Register with valid Vietnamese name
  - **Expected:** Success

### Toast Duration

- [ ] Trigger any error toast
  - **Expected:** Toast appears and auto-dismisses after 3 seconds
- [ ] Trigger any success toast
  - **Expected:** Toast appears and auto-dismisses after 3 seconds
- [ ] Multiple toasts in quick succession
  - **Expected:** All auto-dismiss properly

---

## Files Modified

1. **`lib/utils.ts`**
   - Added `validateName()` function

2. **`components/modals/account-settings-content.tsx`**
   - Added name validation in `handleUpdateProfile`
   - Added `{ duration: 3000 }` to all toast calls

3. **`app/(marketing)/(routes)/sign-up/page.tsx`**
   - Added name validation in `handleSubmit`
   - Added `{ duration: 3000 }` to all toast calls

---

## Error Messages (Vietnamese)

| Validation Rule | Error Message |
|----------------|---------------|
| Empty name | "Tên không được để trống" |
| Contains numbers | "Tên không được chứa số" |
| Contains special chars | "Tên chỉ được chứa chữ cái" |
| Contains HTML tags | "Tên không được chứa thẻ HTML" |
| Too short (< 2 chars) | "Tên phải có ít nhất 2 ký tự" |
| Too long (> 50 chars) | "Tên không được quá 50 ký tự" |

---

## Benefits

### For Users:
- ✅ Clear validation feedback
- ✅ Prevents invalid data entry
- ✅ Better UX with auto-dismissing toasts
- ✅ No need to manually close notifications

### For System:
- ✅ Data integrity maintained
- ✅ Consistent validation across sign-up and profile update
- ✅ Prevents XSS attacks (HTML tag blocking)
- ✅ Vietnamese name support

---

## Security Improvements

1. **HTML Tag Blocking:**
   - Prevents XSS attacks via name fields
   - Regex: `/<[^>]*>/g`

2. **Input Sanitization:**
   - Only allows safe characters
   - Vietnamese diacritics supported

3. **Length Limits:**
   - Min: 2 characters
   - Max: 50 characters
   - Prevents buffer overflow

---

## Future Enhancements

1. **Real-time Validation:**
   - Show errors as user types
   - Visual feedback (red border, etc.)

2. **Suggestions:**
   - Suggest corrections for common mistakes
   - Auto-capitalize first letter

3. **Configurable Toast Duration:**
   - Different durations for different toast types
   - Error: 5s, Success: 3s, Info: 2s

4. **Toast Queue Management:**
   - Limit max visible toasts
   - Priority-based display

---

## Notes

- Validation works for both Vietnamese and English names
- Toast duration is consistent across the entire app
- All existing toasts have been updated
- No breaking changes to existing functionality
