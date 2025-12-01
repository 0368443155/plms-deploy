# 📚 TÀI LIỆU KỸ THUẬT - NOTION CLONE

## Tổng quan

Thư mục này chứa tài liệu chi tiết cho **19 use cases** của dự án Notion Clone. Mỗi use case được mô tả đầy đủ với:

- 📋 Đặc tả chức năng
- 🔄 Biểu đồ luồng xử lý
- 💾 Database schema
- 🔌 API endpoints
- 🎨 UI components
- ✅ Test cases
- 📝 Code examples

---

## 📂 Cấu trúc thư mục

```
docs/
├── README.md                          # File này
├── 01-authentication/                 # UC01-UC06: Xác thực & Quản lý người dùng
│   ├── UC01-login.md
│   ├── UC02-register.md
│   ├── UC03-logout.md
│   ├── UC04-forgot-password.md
│   ├── UC05-update-profile.md
│   └── UC06-change-password.md
├── 02-documents/                      # UC07-UC13: Quản lý tài liệu
│   ├── UC07-create-page.md
│   ├── UC08-update-page.md
│   ├── UC09-edit-content.md
│   ├── UC10-read-content.md
│   ├── UC11-delete-page.md
│   ├── UC12-restore-delete.md
│   └── UC13-search-pages.md
├── 03-tables/                         # UC14: Quản lý bảng dữ liệu
│   └── UC14-manage-tables.md
├── 04-calendar/                       # UC15-UC16: Lịch học & Sự kiện
│   ├── UC15-manage-schedule.md
│   └── UC16-view-calendar.md
├── 05-notifications/                  # UC17: Thông báo
│   └── UC17-notifications.md
├── 06-ai-features/                    # UC18-UC19: Tính năng AI
│   ├── UC18-summarize.md
│   └── UC19-qa-chat.md
└── assets/                            # Hình ảnh, diagrams
    ├── diagrams/
    └── screenshots/
```

---

## 📊 Trạng thái triển khai

### ✅ Đã triển khai (10/19)

| Use Case | Tên | Trạng thái | Tài liệu |
|----------|-----|------------|----------|
| UC01 | Đăng nhập | ✅ Hoàn thành | [Chi tiết](./01-authentication/UC01-login.md) |
| UC02 | Đăng ký | ✅ Hoàn thành | [Chi tiết](./01-authentication/UC02-register.md) |
| UC03 | Đăng xuất | ✅ Hoàn thành | [Chi tiết](./01-authentication/UC03-logout.md) |
| UC07 | Tạo trang mới | ✅ Hoàn thành | [Chi tiết](./02-documents/UC07-create-page.md) |
| UC08 | Cập nhật trang | ✅ Hoàn thành | [Chi tiết](./02-documents/UC08-update-page.md) |
| UC09 | Sửa nội dung | ✅ Hoàn thành | [Chi tiết](./02-documents/UC09-edit-content.md) |
| UC10 | Đọc nội dung | ✅ Hoàn thành | [Chi tiết](./02-documents/UC10-read-content.md) |
| UC11 | Xóa trang | ✅ Hoàn thành | [Chi tiết](./02-documents/UC11-delete-page.md) |
| UC12 | Khôi phục/Xóa vĩnh viễn | ✅ Hoàn thành | [Chi tiết](./02-documents/UC12-restore-delete.md) |
| UC13 | Tìm kiếm trang | ✅ Hoàn thành | [Chi tiết](./02-documents/UC13-search-pages.md) |

### 🔄 Cần triển khai (9/19)

| Use Case | Tên | Độ ưu tiên | Tài liệu |
|----------|-----|------------|----------|
| UC04 | Quên mật khẩu | 🔴 Cao | [Chi tiết](./01-authentication/UC04-forgot-password.md) |
| UC05 | Cập nhật thông tin cá nhân | 🔴 Cao | [Chi tiết](./01-authentication/UC05-update-profile.md) |
| UC06 | Đổi mật khẩu | 🔴 Cao | [Chi tiết](./01-authentication/UC06-change-password.md) |
| UC14 | Quản lý bảng dữ liệu | 🔴 Cao | [Chi tiết](./03-tables/UC14-manage-tables.md) |
| UC15 | Quản lý lịch học | 🔴 Cao | [Chi tiết](./04-calendar/UC15-manage-schedule.md) |
| UC16 | Xem lịch tổng quan | 🔴 Cao | [Chi tiết](./04-calendar/UC16-view-calendar.md) |
| UC17 | Nhận và xem thông báo | 🟡 Trung bình | [Chi tiết](./05-notifications/UC17-notifications.md) |
| UC18 | Tóm tắt nội dung (AI) | 🟢 Thấp | [Chi tiết](./06-ai-features/UC18-summarize.md) |
| UC19 | Hỏi đáp trên tài liệu (AI) | 🟢 Thấp | [Chi tiết](./06-ai-features/UC19-qa-chat.md) |

---

## 🎯 Cách sử dụng tài liệu

### Cho Developer

1. **Đọc tổng quan:** Bắt đầu với file README này
2. **Chọn use case:** Vào thư mục tương ứng
3. **Đọc đặc tả:** Hiểu rõ yêu cầu và luồng xử lý
4. **Xem code mẫu:** Copy/paste và customize
5. **Chạy test:** Verify chức năng hoạt động đúng

### Cho Product Owner / QA

1. **Review đặc tả:** Đảm bảo requirements đúng
2. **Kiểm tra test cases:** Verify coverage đầy đủ
3. **Test thủ công:** Follow test scenarios
4. **Report bugs:** Tham chiếu use case ID

### Cho Technical Writer

1. **Đọc tài liệu kỹ thuật:** Hiểu chức năng
2. **Viết user guide:** Dựa trên use cases
3. **Tạo screenshots:** Từ UI components
4. **Update changelog:** Khi có thay đổi

---

## 📖 Template tài liệu

Mỗi use case được viết theo template chuẩn:

```markdown
# [UC-ID] Tên Use Case

## 1. Thông tin cơ bản
- ID: UC-XX
- Tên: ...
- Mô tả: ...
- Actor: ...
- Độ ưu tiên: ...
- Trạng thái: ...

## 2. Luồng xử lý
### 2.1 Luồng chính
### 2.2 Luồng thay thế
### 2.3 Luồng ngoại lệ

## 3. Biểu đồ hoạt động
[ASCII art diagram]

## 4. Database Schema
[Convex schema]

## 5. API Endpoints
[Convex queries/mutations]

## 6. UI Components
[React components]

## 7. Validation Rules
[Input validation]

## 8. Error Handling
[Error cases]

## 9. Test Cases
[Test scenarios]

## 10. Code Examples
[Implementation code]
```

---

## 🔗 Tài liệu liên quan

- [IMPLEMENTATION_ANALYSIS.md](../IMPLEMENTATION_ANALYSIS.md) - Phân tích tổng quan
- [USE_CASES_DETAILED.md](../USE_CASES_DETAILED.md) - Use cases chi tiết (phần 1)
- [ROADMAP.md](../ROADMAP.md) - Kế hoạch triển khai
- [QUICK_START.md](../QUICK_START.md) - Hướng dẫn bắt đầu nhanh
- [README.md](../README.md) - Tổng quan dự án

---

## 📝 Quy ước

### Naming Convention

- **Use Case ID:** `UC` + số thứ tự (01-19)
- **File name:** `UC[ID]-[slug].md` (ví dụ: `UC01-login.md`)
- **Folder name:** `[number]-[category]` (ví dụ: `01-authentication`)

### Status Labels

- ✅ **Hoàn thành:** Đã implement và test
- 🔄 **Đang phát triển:** Đang code
- 📝 **Đang thiết kế:** Đang viết spec
- ❌ **Chưa bắt đầu:** Chưa làm gì

### Priority Labels

- 🔴 **Cao:** Cần làm ngay
- 🟡 **Trung bình:** Làm sau các task cao
- 🟢 **Thấp:** Nice to have

---

## 🤝 Đóng góp

Khi thêm/sửa tài liệu:

1. Follow template chuẩn
2. Update README này
3. Thêm links tương ứng
4. Commit với message rõ ràng

---

## 📧 Liên hệ

Nếu có câu hỏi về tài liệu:
- Tạo issue trên GitHub
- Liên hệ team lead
- Check Slack channel #notion-clone

---

**Last Updated:** 01/12/2025  
**Version:** 1.0  
**Maintainer:** Development Team
