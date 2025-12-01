# 📑 DANH MỤC TÀI LIỆU CHI TIẾT - 19 USE CASES

## Tổng quan

Tài liệu này liệt kê tất cả 19 use cases với links trực tiếp đến tài liệu chi tiết.

---

## 📂 01. Authentication & User Management (UC01-UC06)

### ✅ UC01 - Đăng nhập
- **File:** [UC01-login.md](./01-authentication/UC01-login.md)
- **Trạng thái:** ✅ Hoàn thành
- **Mô tả:** Người dùng đăng nhập bằng email/password hoặc OAuth
- **Highlights:**
  - Clerk authentication
  - OAuth support (Google, GitHub)
  - Rate limiting
  - Session management

### ✅ UC02 - Đăng ký
- **File:** [UC02-register.md](./01-authentication/UC02-register.md)
- **Trạng thái:** ✅ Hoàn thành  
- **Mô tả:** Người dùng tạo tài khoản mới
- **Highlights:**
  - Email verification
  - Password strength validation
  - Webhook sync to Convex
  - Welcome email

### ✅ UC03 - Đăng xuất
- **File:** [UC03-logout.md](./01-authentication/UC03-logout.md)
- **Trạng thái:** ✅ Hoàn thành
- **Mô tả:** Người dùng đăng xuất khỏi hệ thống
- **Highlights:**
  - Clear session
  - Redirect to home
  - Optional "Sign out from all devices"

### 🔄 UC04 - Quên mật khẩu
- **File:** [UC04-forgot-password.md](./01-authentication/UC04-forgot-password.md)
- **Trạng thái:** 🔄 Cần triển khai
- **Mô tả:** Người dùng reset mật khẩu qua email
- **Highlights:**
  - Email OTP (6 digits)
  - 5-minute expiration
  - Clerk password reset flow

### 🔄 UC05 - Cập nhật thông tin cá nhân
- **File:** [UC05-update-profile.md](./01-authentication/UC05-update-profile.md)
- **Trạng thái:** 🔄 Cần triển khai
- **Mô tả:** Người dùng cập nhật profile (tên, avatar, phone, gender)
- **Highlights:**
  - Avatar upload (EdgeStore)
  - Form validation
  - Real-time preview
  - Sync with Clerk

### 🔄 UC06 - Đổi mật khẩu
- **File:** [UC06-change-password.md](./01-authentication/UC06-change-password.md)
- **Trạng thái:** 🔄 Cần triển khai
- **Mô tả:** Người dùng đổi mật khẩu (khi đã đăng nhập)
- **Highlights:**
  - Verify old password
  - Password strength meter
  - Clerk API integration
  - Force re-login

---

## 📂 02. Document Management (UC07-UC13)

### ✅ UC07 - Tạo trang mới
- **File:** [UC07-create-page.md](./02-documents/UC07-create-page.md)
- **Trạng thái:** ✅ Hoàn thành
- **Mô tả:** Tạo document mới (có thể nested)
- **Highlights:**
  - Parent-child relationship
  - Auto-generated title
  - Sidebar integration
  - Real-time sync

### ✅ UC08 - Cập nhật trang
- **File:** [UC08-update-page.md](./02-documents/UC08-update-page.md)
- **Trạng thái:** ✅ Hoàn thành
- **Mô tả:** Cập nhật title, icon, cover image
- **Highlights:**
  - Inline editing
  - Icon picker (emoji)
  - Cover image upload
  - Publish/unpublish

### ✅ UC09 - Sửa nội dung trang
- **File:** [UC09-edit-content.md](./02-documents/UC09-edit-content.md)
- **Trạng thái:** ✅ Hoàn thành
- **Mô tả:** Chỉnh sửa nội dung với rich text editor
- **Highlights:**
  - BlockNote editor
  - Markdown support
  - Auto-save
  - Version history (future)

### ✅ UC10 - Đọc nội dung trang
- **File:** [UC10-read-content.md](./02-documents/UC10-read-content.md)
- **Trạng thái:** ✅ Hoàn thành
- **Mô tả:** Xem nội dung document (public/private)
- **Highlights:**
  - Public sharing
  - Read-only mode
  - Print view
  - Export (future)

### ✅ UC11 - Xóa trang
- **File:** [UC11-delete-page.md](./02-documents/UC11-delete-page.md)
- **Trạng thái:** ✅ Hoàn thành
- **Mô tả:** Soft delete document (move to trash)
- **Highlights:**
  - Recursive delete (children)
  - Move to trash
  - 30-day retention
  - Undo option

### ✅ UC12 - Khôi phục/Xóa vĩnh viễn
- **File:** [UC12-restore-delete.md](./02-documents/UC12-restore-delete.md)
- **Trạng thái:** ✅ Hoàn thành
- **Mô tả:** Restore từ trash hoặc xóa vĩnh viễn
- **Highlights:**
  - Restore with children
  - Permanent delete
  - Confirmation dialog
  - Bulk operations

### ✅ UC13 - Tìm kiếm trang
- **File:** [UC13-search-pages.md](./02-documents/UC13-search-pages.md)
- **Trạng thái:** ✅ Hoàn thành
- **Mô tả:** Tìm kiếm documents theo title/content
- **Highlights:**
  - Full-text search
  - Keyboard shortcut (Ctrl+K)
  - Search modal
  - Recent searches

---

## 📂 03. Tables (UC14)

### 🔄 UC14 - Quản lý bảng dữ liệu
- **File:** [UC14-manage-tables.md](./03-tables/UC14-manage-tables.md)
- **Trạng thái:** 🔄 Cần triển khai (Phức tạp nhất)
- **Mô tả:** Tạo và quản lý bảng dữ liệu Excel-like
- **Highlights:**
  - Dynamic columns (text, number, date, select, checkbox)
  - Excel/CSV import
  - Cell editing
  - Formulas (future)
  - Export to Excel/CSV
  - Pagination & virtualization

**Sub-features:**
- UC14.1: Tạo bảng mới
- UC14.2: Thêm/xóa cột
- UC14.3: Thêm/xóa hàng
- UC14.4: Chỉnh sửa cell
- UC14.5: Import Excel/CSV
- UC14.6: Export Excel/CSV
- UC14.7: Filter & Sort
- UC14.8: Column types

---

## 📂 04. Calendar (UC15-UC16)

### 🔄 UC15 - Quản lý lịch học
- **File:** [UC15-manage-schedule.md](./04-calendar/UC15-manage-schedule.md)
- **Trạng thái:** 🔄 Cần triển khai
- **Mô tả:** Tạo thời khóa biểu cố định hàng tuần
- **Highlights:**
  - Weekly recurring schedule
  - Subject/course management
  - Time slots
  - Room & teacher info
  - Color coding
  - Conflict detection

### 🔄 UC16 - Xem lịch tổng quan
- **File:** [UC16-view-calendar.md](./04-calendar/UC16-view-calendar.md)
- **Trạng thái:** 🔄 Cần triển khai
- **Mô tả:** Xem lịch tổng hợp (schedule + events)
- **Highlights:**
  - Month/Week view
  - Merge schedules & events
  - Deadline tracking
  - Event creation
  - Reminders
  - Export to Google Calendar (future)

---

## 📂 05. Notifications (UC17)

### 🔄 UC17 - Nhận và xem thông báo
- **File:** [UC17-notifications.md](./05-notifications/UC17-notifications.md)
- **Trạng thái:** 🔄 Cần triển khai
- **Mô tả:** Hệ thống thông báo real-time
- **Highlights:**
  - Bell icon with badge
  - Notification dropdown
  - Mark as read
  - Notification types (deadline, reminder, system)
  - Cron jobs (daily reminders)
  - Push notifications (future)

---

## 📂 06. AI Features (UC18-UC19)

### 🔄 UC18 - Tóm tắt nội dung trang (AI)
- **File:** [UC18-summarize.md](./06-ai-features/UC18-summarize.md)
- **Trạng thái:** 🔄 Cần triển khai
- **Mô tả:** AI tóm tắt nội dung document
- **Highlights:**
  - Google Gemini API
  - Summary caching
  - Copy to clipboard
  - Multiple summary lengths
  - Token usage tracking
  - Cost management

### 🔄 UC19 - Hỏi đáp trên tài liệu (AI)
- **File:** [UC19-qa-chat.md](./06-ai-features/UC19-qa-chat.md)
- **Trạng thái:** 🔄 Cần triển khai
- **Mô tả:** Chat với AI về nội dung document
- **Highlights:**
  - Context-aware Q&A
  - Chat history
  - Streaming responses
  - Citation/references
  - Multi-turn conversation
  - Token limits & quotas

---

## 📊 Thống kê

### Theo trạng thái

| Trạng thái | Số lượng | Phần trăm |
|------------|----------|-----------|
| ✅ Hoàn thành | 10 | 52.6% |
| 🔄 Cần triển khai | 9 | 47.4% |
| **Tổng** | **19** | **100%** |

### Theo độ ưu tiên

| Độ ưu tiên | Số lượng | Use Cases |
|------------|----------|-----------|
| 🔴 Cao | 6 | UC04, UC05, UC06, UC14, UC15, UC16 |
| 🟡 Trung bình | 1 | UC17 |
| 🟢 Thấp | 2 | UC18, UC19 |
| ✅ Đã xong | 10 | UC01-03, UC07-13 |

### Theo category

| Category | Số lượng | Hoàn thành | Còn lại |
|----------|----------|------------|---------|
| Authentication | 6 | 3 | 3 |
| Documents | 7 | 7 | 0 |
| Tables | 1 | 0 | 1 |
| Calendar | 2 | 0 | 2 |
| Notifications | 1 | 0 | 1 |
| AI Features | 2 | 0 | 2 |

---

## 🎯 Roadmap triển khai

Xem chi tiết trong [ROADMAP.md](../ROADMAP.md)

**Tóm tắt:**
1. **Sprint 1 (1 tuần):** UC04, UC05, UC06 - User Management
2. **Sprint 2-3 (2-3 tuần):** UC14 - Tables Feature
3. **Sprint 4-5 (2 tuần):** UC15, UC16 - Calendar System
4. **Sprint 6 (1 tuần):** UC17 - Notifications
5. **Sprint 7-8 (2 tuần):** UC18, UC19 - AI Features

**Tổng thời gian:** 8-10 tuần

---

## 📝 Template tài liệu

Mỗi use case được viết theo cấu trúc chuẩn:

1. **Thông tin cơ bản** - Metadata
2. **Luồng xử lý** - Main/Alternative/Exception flows
3. **Biểu đồ hoạt động** - ASCII diagram
4. **Database Schema** - Convex tables
5. **API Endpoints** - Queries/Mutations
6. **UI Components** - React components
7. **Validation Rules** - Input validation
8. **Error Handling** - Error cases
9. **Test Cases** - Functional & non-functional
10. **Code Examples** - Implementation
11. **Security** - Best practices
12. **Performance** - Optimization
13. **Related Use Cases** - Links
14. **References** - External docs

---

## 🔗 Liên kết hữu ích

- [README.md](./README.md) - Hướng dẫn sử dụng docs
- [IMPLEMENTATION_ANALYSIS.md](../IMPLEMENTATION_ANALYSIS.md) - Phân tích tổng quan
- [USE_CASES_DETAILED.md](../USE_CASES_DETAILED.md) - Use cases chi tiết (phần 1)
- [ROADMAP.md](../ROADMAP.md) - Kế hoạch triển khai
- [QUICK_START.md](../QUICK_START.md) - Hướng dẫn bắt đầu

---

**Last Updated:** 01/12/2025  
**Version:** 1.0  
**Status:** 1/19 use cases documented (UC01 complete)

**Next:** Tạo tài liệu cho UC02-UC19
