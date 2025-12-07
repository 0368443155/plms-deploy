# 📖 HƯỚNG DẪN CẬP NHẬT TÀI LIỆU USE CASES

**Mục đích:** Cập nhật tài liệu cho 13 use cases đã hoàn thành dựa trên code thực tế

---

## 🎯 MỤC TIÊU

Cập nhật tài liệu cho các use cases sau để phản ánh chính xác implementation hiện tại:

### ✅ Authentication (6 use cases):
- UC01 - Đăng nhập
- UC02 - Đăng ký
- UC03 - Đăng xuất
- UC04 - Quên mật khẩu
- UC05 - Cập nhật thông tin
- UC06 - Đổi mật khẩu

### ✅ Documents (7 use cases):
- UC07 - Tạo trang mới
- UC08 - Cập nhật trang
- UC09 - Sửa nội dung
- UC10 - Đọc nội dung
- UC11 - Xóa trang
- UC12 - Khôi phục/Xóa vĩnh viễn
- UC13 - Tìm kiếm

---

## 📋 QUY TRÌNH CẬP NHẬT

### Bước 1: Phân tích Code
1. Mở file implementation chính
2. Đọc toàn bộ logic
3. Note lại:
   - File paths
   - Function signatures
   - API endpoints
   - Error handling
   - Validation rules
   - UI components

### Bước 2: Cập nhật Tài liệu
1. Mở file use case tương ứng
2. Cập nhật từng section (14 sections)
3. Thêm code examples từ codebase thực tế
4. Cập nhật diagrams nếu cần

### Bước 3: Verify
1. Test lại chức năng
2. Đảm bảo tài liệu match với code
3. Review lại toàn bộ

---

## 📝 TEMPLATE 14 SECTIONS

### 1. Thông tin cơ bản
```markdown
# UC0X - TÊN USE CASE

## 1. THÔNG TIN CƠ BẢN

- **Mã UC:** UC0X
- **Tên:** Tên use case
- **Mô tả:** Mô tả ngắn gọn
- **Actor:** User/System
- **Precondition:** Điều kiện trước
- **Postcondition:** Điều kiện sau
- **Trạng thái:** ✅ Hoàn thành / ❌ Chưa triển khai
- **File chính:** `path/to/file.tsx`
- **Tech Stack:** Clerk/Convex/BlockNote/etc.
```

### 2. Luồng xử lý
```markdown
## 2. LUỒNG XỬ LÝ

### Main Flow:
1. User thực hiện hành động X
2. System validate input
3. System xử lý
4. System trả về kết quả

### Alternative Flow:
- 2a. Nếu validation fail → Show error

### Exception Flow:
- *. Nếu network error → Retry/Show error
```

### 3. Biểu đồ hoạt động
```markdown
## 3. BIỂU ĐỒ HOẠT ĐỘNG

```
[User] → [Action] → [Validation] → [Processing] → [Result]
                         ↓ (fail)
                      [Error]
```
```

### 4. Database Schema
```markdown
## 4. DATABASE SCHEMA

```typescript
// Từ convex/schema.ts
tableName: defineTable({
  field1: v.string(),
  field2: v.boolean(),
  ...
})
  .index("by_field", ["field"])
```
```

### 5. API Endpoints
```markdown
## 5. API ENDPOINTS

### Mutation: `functionName`
```typescript
// File: convex/module.ts
export const functionName = mutation({
  args: {
    arg1: v.string(),
    arg2: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Implementation
  }
});
```

**Input:**
- `arg1`: Description
- `arg2`: Description (optional)

**Output:**
- Returns: Type
- Throws: Error conditions
```

### 6. UI Components
```markdown
## 6. UI COMPONENTS

### File: `path/to/component.tsx`

**Components:**
- `ComponentName`: Description
- `SubComponent`: Description

**Props:**
```typescript
interface ComponentProps {
  prop1: string;
  prop2?: boolean;
}
```

**State:**
- `state1`: Description
- `state2`: Description
```

### 7. Validation Rules
```markdown
## 7. VALIDATION RULES

| Field | Rule | Error Message |
|-------|------|---------------|
| email | Valid email format | "Email không hợp lệ" |
| password | Min 8 chars | "Mật khẩu phải có ít nhất 8 ký tự" |
```

### 8. Error Handling
```markdown
## 8. ERROR HANDLING

| Error Code | Condition | Message | Action |
|------------|-----------|---------|--------|
| `form_identifier_not_found` | Email not found | "Không tìm thấy tài khoản" | Show error toast |
| `form_password_incorrect` | Wrong password | "Mật khẩu không đúng" | Show error toast |
```

### 9. Test Cases
```markdown
## 9. TEST CASES

### Functional Tests:

**TC01: Happy Path**
- Input: Valid data
- Expected: Success
- Actual: ✅ Pass

**TC02: Invalid Input**
- Input: Invalid data
- Expected: Error message
- Actual: ✅ Pass

### Non-functional Tests:

**Performance:**
- Response time: < 500ms
- Actual: ✅ 200ms average

**Security:**
- Authorization check: ✅ Pass
- Input sanitization: ✅ Pass
```

### 10. Code Examples
```markdown
## 10. CODE EXAMPLES

### Frontend Usage:
```typescript
// From: path/to/component.tsx
const handleAction = async () => {
  const result = await mutation({ arg1: "value" });
  // Handle result
};
```

### Backend Logic:
```typescript
// From: convex/module.ts
export const mutation = mutation({
  // Implementation
});
```
```

### 11. Security Considerations
```markdown
## 11. SECURITY CONSIDERATIONS

- ✅ **Authentication:** Clerk handles auth
- ✅ **Authorization:** userId check on all mutations
- ✅ **Input Validation:** Zod schemas
- ✅ **XSS Protection:** React auto-escaping
- ✅ **CSRF Protection:** Convex handles
```

### 12. Performance Optimization
```markdown
## 12. PERFORMANCE OPTIMIZATION

- ✅ **Database:** Index on userId, parentDocument
- ✅ **Queries:** Use withIndex for filtering
- ✅ **Mutations:** Promise.all for concurrent operations (3-5x faster)
- ✅ **UI:** Debounced auto-save (500ms)
- ✅ **Caching:** Convex real-time subscriptions
```

### 13. Related Use Cases
```markdown
## 13. RELATED USE CASES

- **UC0X:** Tên use case - Mối quan hệ
- **UC0Y:** Tên use case - Mối quan hệ
```

### 14. References
```markdown
## 14. REFERENCES

- [Clerk Documentation](https://clerk.com/docs)
- [Convex Documentation](https://docs.convex.dev/)
- [Implementation File](path/to/file.tsx)
```

---

## 🗂️ MAPPING CODE → TÀI LIỆU

### UC01 - Đăng nhập
- **File:** `docs/01-authentication/UC01-login.md`
- **Code:** `app/(marketing)/(routes)/sign-in/page.tsx`
- **API:** `signIn.create()`, `setActive()`
- **Key Features:** 2FA support, error handling

### UC02 - Đăng ký
- **File:** `docs/01-authentication/UC02-register.md`
- **Code:** `app/(marketing)/(routes)/sign-up/page.tsx`
- **API:** `signUp.create()`, `attemptEmailAddressVerification()`
- **Key Features:** Email verification, validation

### UC03 - Đăng xuất
- **File:** `docs/01-authentication/UC03-logout.md`
- **Code:** `app/(main)/_components/user-item.tsx`
- **API:** `clerk.signOut()`
- **Key Features:** Force redirect, clear session

### UC04 - Quên mật khẩu
- **File:** `docs/01-authentication/UC04-forgot-password.md`
- **Code:** `app/(marketing)/(routes)/sign-in/forgot-password/page.tsx`
- **API:** `signIn.create({ strategy: "reset_password_email_code" })`
- **Key Features:** 3-step flow, OTP, security

### UC05 - Cập nhật thông tin
- **File:** `docs/01-authentication/UC05-update-profile.md`
- **Code:** `components/modals/account-settings-content.tsx`
- **API:** `user.update()`, `user.setProfileImage()`
- **Key Features:** Avatar upload, email management

### UC06 - Đổi mật khẩu
- **File:** `docs/01-authentication/UC06-change-password.md`
- **Code:** `components/modals/account-settings-content.tsx` (Security tab)
- **API:** `user.updatePassword()`
- **Key Features:** Password validation, error handling

### UC07 - Tạo trang mới
- **File:** `docs/02-documents/UC07-create-page.md`
- **Code:** `convex/documents.ts` - `create` mutation
- **API:** `create({ title, parentDocument?, content?, icon? })`
- **Key Features:** Nested documents, templates

### UC08 - Cập nhật trang
- **File:** `docs/02-documents/UC08-update-page.md`
- **Code:** `convex/documents.ts` - `update` mutation
- **API:** `update({ id, title?, icon?, coverImage?, isPublished? })`
- **Key Features:** Inline editing, publish toggle

### UC09 - Sửa nội dung
- **File:** `docs/02-documents/UC09-edit-content.md`
- **Code:** `components/editor.tsx`
- **API:** `update({ id, content })`
- **Key Features:** BlockNote editor, auto-save

### UC10 - Đọc nội dung
- **File:** `docs/02-documents/UC10-read-content.md`
- **Code:** `convex/documents.ts` - `getById` query
- **API:** `getById({ documentId })`
- **Key Features:** Public/private access

### UC11 - Xóa trang
- **File:** `docs/02-documents/UC11-delete-page.md`
- **Code:** `convex/documents.ts` - `archive` mutation
- **API:** `archive({ id })`
- **Key Features:** Soft delete, recursive, optimized

### UC12 - Khôi phục/Xóa vĩnh viễn
- **File:** `docs/02-documents/UC12-restore-delete.md`
- **Code:** `convex/documents.ts` - `restore`, `remove` mutations
- **API:** `restore({ id })`, `remove({ id })`
- **Key Features:** Recursive operations, confirmation

### UC13 - Tìm kiếm
- **File:** `docs/02-documents/UC13-search-pages.md`
- **Code:** `convex/documents.ts` - `searchDocuments` query
- **API:** `searchDocuments({ search })`
- **Key Features:** Vietnamese support, Ctrl+K

---

## ✅ CHECKLIST CẬP NHẬT

Cho mỗi use case, đảm bảo:

- [ ] Section 1: Thông tin cơ bản - File paths chính xác
- [ ] Section 2: Luồng xử lý - Match với code thực tế
- [ ] Section 3: Biểu đồ - Phản ánh flow hiện tại
- [ ] Section 4: Schema - Copy từ convex/schema.ts
- [ ] Section 5: API - Function signatures chính xác
- [ ] Section 6: UI Components - List tất cả components
- [ ] Section 7: Validation - Rules từ code
- [ ] Section 8: Error Handling - Error codes thực tế
- [ ] Section 9: Test Cases - Test scenarios
- [ ] Section 10: Code Examples - Copy từ codebase
- [ ] Section 11: Security - Review security measures
- [ ] Section 12: Performance - Note optimizations
- [ ] Section 13: Related UCs - Link các UC liên quan
- [ ] Section 14: References - Links to docs

---

## 🚀 BẮT ĐẦU

### Ưu tiên cập nhật:

**Phase 1: Authentication (Dễ nhất)**
1. UC01 - Đăng nhập
2. UC02 - Đăng ký
3. UC03 - Đăng xuất
4. UC04 - Quên mật khẩu
5. UC05 - Cập nhật thông tin
6. UC06 - Đổi mật khẩu

**Phase 2: Documents (Phức tạp hơn)**
7. UC07 - Tạo trang mới
8. UC08 - Cập nhật trang
9. UC09 - Sửa nội dung
10. UC10 - Đọc nội dung
11. UC11 - Xóa trang
12. UC12 - Khôi phục/Xóa vĩnh viễn
13. UC13 - Tìm kiếm

---

## 📊 TIẾN ĐỘ

- [ ] UC01 - Đăng nhập
- [ ] UC02 - Đăng ký
- [ ] UC03 - Đăng xuất
- [ ] UC04 - Quên mật khẩu
- [ ] UC05 - Cập nhật thông tin
- [ ] UC06 - Đổi mật khẩu
- [ ] UC07 - Tạo trang mới
- [ ] UC08 - Cập nhật trang
- [ ] UC09 - Sửa nội dung
- [ ] UC10 - Đọc nội dung
- [ ] UC11 - Xóa trang
- [ ] UC12 - Khôi phục/Xóa vĩnh viễn
- [ ] UC13 - Tìm kiếm

**Tổng:** 0/13 (0%)

---

**Tạo bởi:** AI Assistant  
**Ngày:** 08/12/2025 01:30  
**Mục đích:** Hướng dẫn cập nhật tài liệu use cases theo code thực tế
