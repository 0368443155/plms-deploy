# Fix: Avatar Upload UI & Name Validation Messages

## Date: 2025-12-13

## Issues Fixed

### 1. ✅ Generic Name Validation Messages

**Problem:**
- Khi để trống "Họ", thông báo vẫn là "Tên không được để trống" (không rõ ràng)
- Người dùng không biết là lỗi ở trường Họ hay Tên

**Solution:**
- Thay đổi tất cả thông báo từ "Tên" → "Họ tên" để chung chung hơn
- Áp dụng cho cả Account Settings và Sign-Up page

**Error Messages (Updated):**
- "Họ tên không được để trống"
- "Họ tên không được chứa số"
- "Họ tên chỉ được chứa chữ cái"
- "Họ tên không được chứa thẻ HTML"
- "Họ tên phải có ít nhất 2 ký tự"
- "Họ tên không được quá 50 ký tự"

---

### 2. ✅ Avatar Upload UI Redesign

**Problems:**
1. Nút X ở góc phải ảnh không rõ ràng
2. Không có nút "Cập nhật ảnh đại diện" riêng
3. Ảnh bị méo khi tỉ lệ không vuông (hình chữ nhật)
4. UI không đẹp, không hiện đại

**Solutions:**
1. **Removed:** SingleImageDropzone component
2. **Added:** Custom avatar upload UI với:
   - Preview ảnh tròn (circular) với `object-cover` để giữ tỉ lệ
   - Nút "Cập nhật ảnh đại diện" rõ ràng
   - Nút "Xóa ảnh đại diện" riêng biệt
   - Loading state với spinner overlay
   - Thông tin hướng dẫn (kích thước, định dạng)

---

## UI Design

### Before:
```
┌─────────────────────┐
│ SingleImageDropzone │
│  [Drop or Click]    │
│  ┌───────────┐      │
│  │    IMG    │  X   │ ← X button unclear
│  └───────────┘      │
└─────────────────────┘
```

### After:
```
┌──────────────────────────────────────────────────────┐
│  ┌─────────┐   Tải lên ảnh đại diện của bạn         │
│  │  ●●●●   │   Kích thước tối đa: 5MB               │
│  │  ●●●●   │   Định dạng: JPG, PNG, GIF             │
│  │  ●●●●   │                                         │
│  └─────────┘   [Cập nhật ảnh đại diện]              │
│   (circular)   [Xóa ảnh đại diện]                    │
└──────────────────────────────────────────────────────┘
```

---

## Code Changes

### 1. Name Validation Messages

**File:** `components/modals/account-settings-content.tsx`

```tsx
// ❌ BEFORE
toast.error(firstNameValidation.error, { duration: 3000 });

// ✅ AFTER
const errorMessage = firstNameValidation.error?.replace("Tên", "Họ tên") || "Họ tên không hợp lệ";
toast.error(errorMessage, { duration: 3000 });
```

**File:** `app/(marketing)/(routes)/sign-up/page.tsx`

Same changes applied.

---

### 2. Avatar Upload UI

**File:** `components/modals/account-settings-content.tsx`

**Added function:**
```tsx
const handleRemoveAvatar = async () => {
  if (!user) return;

  // Check if user has an avatar
  if (!user.imageUrl) {
    toast.error("Không có ảnh đại diện để thực hiện xóa", { duration: 3000 });
    return;
  }

  setIsUploadingAvatar(true);
  try {
    // Delete avatar - Clerk will revert to default avatar
    await user.setProfileImage({ file: null });

    toast.success("Đã xóa ảnh đại diện", { duration: 3000 });
    setAvatarFile(undefined);
    router.refresh();
  } catch (error: any) {
    console.error("Avatar remove error:", error);
    toast.error(error?.errors?.[0]?.message || "Không thể xóa ảnh đại diện", { duration: 3000 });
  } finally {
    setIsUploadingAvatar(false);
  }
};
```

**New UI:**
```tsx
<div className="space-y-4 mb-6">
  <Label className="text-base font-medium">Ảnh đại diện</Label>
  <div className="flex items-start gap-6">
    {/* Avatar Preview - Circular with object-cover */}
    <div className="relative">
      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-border bg-muted">
        {user?.imageUrl ? (
          <img
            src={user.imageUrl}
            alt="Avatar"
            className="w-full h-full object-cover"  // ✅ Prevents distortion
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground text-4xl font-semibold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
        )}
      </div>
      {isUploadingAvatar && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
          <Spinner size="default" />
        </div>
      )}
    </div>

    {/* Upload Controls */}
    <div className="flex-1 space-y-3">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Tải lên ảnh đại diện của bạn. Kích thước tối đa: 5MB
        </p>
        <p className="text-xs text-muted-foreground">
          Định dạng: JPG, PNG, GIF
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="file"
          id="avatar-upload"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleAvatarUpload(file);
            }
            e.target.value = '';  // Reset input
          }}
          className="hidden"
          disabled={isUploadingAvatar}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById('avatar-upload')?.click()}
          disabled={isUploadingAvatar}
        >
          {isUploadingAvatar ? (
            <>
              <span className="mr-2">
                <Spinner size="sm" />
              </span>
              Đang tải...
            </>
          ) : (
            'Cập nhật ảnh đại diện'
          )}
        </Button>
        {user?.imageUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemoveAvatar}
            disabled={isUploadingAvatar}
            className="text-destructive hover:text-destructive"
          >
            Xóa ảnh đại diện
          </Button>
        )}
      </div>
    </div>
  </div>
</div>
```

---

## Key Features

### Avatar Upload:
✅ **Circular Preview** - 128x128px with border
✅ **Object-Cover** - Preserves aspect ratio, no distortion
✅ **Hidden File Input** - Triggered by button click
✅ **Loading Overlay** - Spinner on top of avatar during upload
✅ **Update Button** - Clear call-to-action
✅ **Delete Button** - Only shows when avatar exists
✅ **Fallback Avatar** - Shows initials when no image
✅ **File Validation** - Type and size checks
✅ **Toast Feedback** - Success/error messages (3s duration)

### Name Validation:
✅ **Generic Messages** - "Họ tên" instead of "Tên"
✅ **Consistent** - Same messages in Account Settings and Sign-Up
✅ **Clear** - Users know exactly what's wrong

---

## Testing Checklist

### Name Validation Messages

- [ ] Account Settings - Leave first name empty
  - **Expected:** "Họ tên không được để trống"
- [ ] Account Settings - Leave last name empty
  - **Expected:** "Họ tên không được để trống"
- [ ] Sign-Up - Enter number in first name
  - **Expected:** "Họ tên không được chứa số"
- [ ] Sign-Up - Enter HTML tag
  - **Expected:** "Họ tên không được chứa thẻ HTML"

### Avatar Upload UI

- [ ] Click "Cập nhật ảnh đại diện"
  - **Expected:** File picker opens
- [ ] Upload square image (1:1)
  - **Expected:** Displays perfectly in circle
- [ ] Upload rectangular image (16:9)
  - **Expected:** Crops to fit circle, no distortion
- [ ] Upload tall image (9:16)
  - **Expected:** Crops to fit circle, no distortion
- [ ] Click "Xóa ảnh đại diện" when avatar exists
  - **Expected:** Avatar removed, shows initials
- [ ] Click "Xóa ảnh đại diện" when no avatar
  - **Expected:** Error toast "Không có ảnh đại diện để thực hiện xóa"
- [ ] Upload file > 5MB
  - **Expected:** Error toast "Kích thước ảnh không được vượt quá 5MB"
- [ ] Upload non-image file
  - **Expected:** Error toast "Chỉ chấp nhận file ảnh"
- [ ] During upload
  - **Expected:** Spinner overlay on avatar, buttons disabled

---

## Visual Improvements

### Aspect Ratio Handling:

**Before (Distorted):**
```
┌─────────────┐
│ ████████    │  ← Rectangular image
│ ████████    │     stretched to square
│             │     = DISTORTED
└─────────────┘
```

**After (Perfect):**
```
    ●●●●●●●●
  ●●●●●●●●●●●●
 ●●●●●●●●●●●●●●   ← Rectangular image
●●●●●●●●●●●●●●●●     cropped to circle
●●●●●●●●●●●●●●●●     = PERFECT
 ●●●●●●●●●●●●●●
  ●●●●●●●●●●●●
    ●●●●●●●●
```

**CSS Magic:**
```css
.w-32.h-32.rounded-full.overflow-hidden {
  /* Creates circular container */
}

img.object-cover {
  /* Scales image to cover container */
  /* Maintains aspect ratio */
  /* Crops excess */
}
```

---

## Files Modified

1. **`components/modals/account-settings-content.tsx`**
   - Added `handleRemoveAvatar` function
   - Replaced SingleImageDropzone with custom UI
   - Updated name validation messages
   - Removed SingleImageDropzone import

2. **`app/(marketing)/(routes)/sign-up/page.tsx`**
   - Updated name validation messages

---

## Benefits

### For Users:
- ✅ Clearer error messages
- ✅ Better avatar preview (no distortion)
- ✅ Easier to update/remove avatar
- ✅ Professional-looking UI
- ✅ Clear visual feedback

### For System:
- ✅ Consistent validation messages
- ✅ Better UX with proper aspect ratio
- ✅ Cleaner code (removed dependency)
- ✅ Better accessibility

---

## Future Enhancements

1. **Avatar Cropper:**
   - Allow users to crop/zoom image before upload
   - Preview before saving

2. **Drag & Drop:**
   - Drag image directly onto avatar preview
   - Visual feedback on drag over

3. **Multiple Sizes:**
   - Generate thumbnails
   - Optimize for different screen sizes

4. **Webcam Support:**
   - Take photo directly from webcam
   - Useful for profile pictures

---

## Notes

- Avatar uses Clerk's `setProfileImage()` API
- Setting `file: null` reverts to Clerk's default avatar
- `object-cover` CSS ensures no distortion
- Circular preview is 128x128px (w-32 h-32)
- File input is hidden, triggered by button
- Toast duration is 3 seconds for all messages
