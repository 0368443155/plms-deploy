# Bug Fixes Documentation Index

📋 Danh sách tất cả bug fixes và technical documentation

## 🐛 Recent Fixes (24/12/2024)

### [📊 Bug Fixes Summary](./bug-fixes-summary-2024-12-24.md)
Tổng hợp tất cả 6 bug fixes trong phiên làm việc 24/12/2024
- **Issues Fixed**: 6
- **Files Changed**: 8
- **Dependencies Changed**: 4

---

## 📚 Detailed Documentation

### 1. [Schedule Grid Fixes](./schedule-grid-fixes.md)
**Lịch học - Sửa lỗi hiển thị**

**Issues:**
- ✅ Sự kiện 30 phút bị mất nội dung
- ✅ Sự kiện bắt đầu sớm bị tràn ra ngoài

**Solutions:**
- Min-height 60px cho events
- Layout compact cho short events
- Dynamic hour range
- Scrollable grid với sticky header

---

### 2. [PDF Export Fix](./pdf-export-fix.md)
**Export PDF - Sửa lỗi cắt chữ và bố cục**

**Issues:**
- ✅ Văn bản bị cắt ngang khi ngắt trang
- ✅ Font chữ phóng to quá mức
- ✅ Khoảng trắng lớn bất thường

**Solutions:**
- Thay thế jsPDF + html2canvas → html2pdf.js
- CSS page-break properties
- Layout normalization
- Font size normalization

---

### 3. [Test PDF Export](./test-pdf-export.md)
**Hướng dẫn test chức năng PDF export**

**Contents:**
- Test cases chi tiết
- Checklist đầy đủ
- Nội dung mẫu
- Cách báo lỗi

---

## 🔍 Quick Navigation

### By Component
- **Calendar**: [PDF Export Fix](./pdf-export-fix.md) (Agenda view section)
- **Schedule**: [Schedule Grid Fixes](./schedule-grid-fixes.md)
- **Export**: [PDF Export Fix](./pdf-export-fix.md) + [Test Guide](./test-pdf-export.md)
- **Notifications**: [Bug Fixes Summary](./bug-fixes-summary-2024-12-24.md) (Section 4)

### By Issue Type
- **Display Issues**: [Schedule Grid Fixes](./schedule-grid-fixes.md)
- **Layout Issues**: [PDF Export Fix](./pdf-export-fix.md)
- **Spacing Issues**: All documents

---

## 📊 Statistics

| Metric | Count |
|--------|-------|
| Total Docs | 4 |
| Issues Fixed | 6 |
| Files Changed | 8 |
| Dependencies Changed | 4 |
| Test Cases | 15+ |

---

## 🎯 How to Use

1. **Found a bug?** → Check if it's already fixed in [Summary](./bug-fixes-summary-2024-12-24.md)
2. **Need to fix similar issue?** → Read detailed docs for reference
3. **Testing?** → Use [Test Guide](./test-pdf-export.md)
4. **Understanding code?** → Check code examples in each doc

---

**Last Updated**: 24/12/2024
