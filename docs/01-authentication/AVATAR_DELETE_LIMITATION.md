# Update: Avatar Upload - Removed Delete Function

## Date: 2025-12-13

## Issue Discovered

### Clerk API Limitation

**Problem:**
- Clerk API không hỗ trợ xóa ảnh đại diện
- Method `user.setProfileImage({ file: null })` trả về lỗi 404
- Một khi đã upload ảnh custom, không thể revert về default avatar

**Error:**
```
Failed to load resource: the server responded with a status of 404
POST .../v1/me/profile_image?_method=DELETE
```

---

## Solution Implemented

### Removed Delete Avatar Button

**Changes:**
1. ✅ Removed "Xóa ảnh đại diện" button from UI
2. ✅ Removed `handleRemoveAvatar` function
3. ✅ Users can only **replace** avatar with new image, not delete

**Rationale:**
- Clerk không hỗ trợ xóa ảnh đại diện
- Giữ button sẽ gây nhầm lẫn cho người dùng
- Tốt hơn là chỉ cho phép thay thế (replace)

---

## Updated UI

### Before (With Delete Button):
```
[Cập nhật ảnh đại diện] [Xóa ảnh đại diện]
```

### After (Without Delete Button):
```
[Cập nhật ảnh đại diện]
```

---

## Code Changes

### Removed Function:
```tsx
// ❌ REMOVED - Clerk doesn't support this
const handleRemoveAvatar = async () => {
  await user.setProfileImage({ file: null });  // 404 Error
};
```

### Updated UI:
```tsx
// ❌ BEFORE
<Button onClick={handleRemoveAvatar}>
  Xóa ảnh đại diện
</Button>

// ✅ AFTER
// Button removed completely
```

---

## User Experience

### What Users Can Do:
✅ Upload new avatar
✅ Replace existing avatar with new one
✅ View current avatar

### What Users Cannot Do:
❌ Delete avatar and revert to default
❌ Remove custom avatar

**Workaround:**
- Người dùng có thể upload ảnh mới để thay thế
- Không có cách nào để quay về default avatar của Clerk

---

## Documentation Updates

**File:** `docs/01-authentication/AVATAR_UI_NAME_VALIDATION_FIX.md`

**Sections to Update:**
1. Remove all mentions of "Delete Avatar" button
2. Remove `handleRemoveAvatar` function documentation
3. Update testing checklist
4. Add note about Clerk limitation

---

## Testing Checklist (Updated)

### Avatar Upload UI

- [ ] Click "Cập nhật ảnh đại diện"
  - **Expected:** File picker opens
- [ ] Upload square image (1:1)
  - **Expected:** Displays perfectly in circle
- [ ] Upload rectangular image (16:9)
  - **Expected:** Crops to fit circle, no distortion
- [ ] Upload tall image (9:16)
  - **Expected:** Crops to fit circle, no distortion
- [ ] Upload new image to replace existing
  - **Expected:** Old image replaced with new one
- [ ] Upload file > 5MB
  - **Expected:** Error toast "Kích thước ảnh không được vượt quá 5MB"
- [ ] Upload non-image file
  - **Expected:** Error toast "Chỉ chấp nhận file ảnh"
- [ ] During upload
  - **Expected:** Spinner overlay on avatar, button disabled

**Removed Tests:**
- ~~Click "Xóa ảnh đại diện"~~ (Button no longer exists)

---

## Files Modified

1. **`components/modals/account-settings-content.tsx`**
   - Removed `handleRemoveAvatar` function
   - Removed "Xóa ảnh đại diện" button from UI

---

## Clerk API Limitation

### Why Can't We Delete Avatars?

According to Clerk documentation:
- Once a custom profile image is uploaded, it cannot be deleted
- The only option is to replace it with a new image
- There is no API endpoint to revert to the default avatar

### Alternative Approaches (Not Implemented):

1. **Upload a default placeholder image:**
   - Could upload a generic avatar image
   - But this is not the same as Clerk's default

2. **Use Clerk's hosted UI:**
   - Clerk's built-in components might have different behavior
   - But we're using custom UI

3. **Contact Clerk Support:**
   - Request feature to delete profile images
   - May be added in future versions

---

## Impact

### Positive:
✅ No confusing error messages
✅ Clear user expectations
✅ Cleaner code (removed unused function)
✅ Honest about platform limitations

### Negative:
❌ Users cannot revert to default avatar
❌ Must upload new image to change

### Mitigation:
- Clear UI/UX: Only show "Update" button
- Users understand they can replace, not delete
- Documentation explains limitation

---

## Future Considerations

If Clerk adds avatar deletion support in the future:
1. Re-add `handleRemoveAvatar` function
2. Re-add "Xóa ảnh đại diện" button
3. Update documentation
4. Add tests for deletion

---

## Notes

- This is a Clerk API limitation, not a bug in our code
- Other authentication providers (Auth0, Firebase) may support deletion
- Consider this when choosing auth provider for future projects
- Users can always upload a new image to replace the current one
