# NOTION CLONE - HƯỚNG DẪN BẮT ĐẦU NHANH

## 📋 TỔNG QUAN

Dự án Notion Clone hiện tại đã triển khai **10/19 use cases** (52.6%). Tài liệu này cung cấp hướng dẫn nhanh để bắt đầu triển khai 9 use cases còn lại.

---

## 📊 TRẠNG THÁI HIỆN TẠI

### ✅ Đã hoàn thành (10/19)
1. ✅ UC01: Đăng nhập (Clerk Auth)
2. ✅ UC02: Đăng ký (Clerk Auth)
3. ✅ UC03: Đăng xuất (Clerk Auth)
4. ✅ UC07: Tạo trang mới
5. ✅ UC08: Cập nhật trang
6. ✅ UC09: Sửa nội dung trang
7. ✅ UC10: Đọc nội dung trang
8. ✅ UC11: Xóa trang
9. ✅ UC12: Khôi phục/Xóa vĩnh viễn
10. ✅ UC13: Tìm kiếm trang

### ❌ Cần triển khai (9/19)
1. ⚠️ UC04: Quên mật khẩu (Clerk hỗ trợ, cần kích hoạt)
2. ❌ UC05: Cập nhật thông tin cá nhân
3. ❌ UC06: Đổi mật khẩu
4. ❌ UC14: Quản lý bảng dữ liệu
5. ❌ UC15: Quản lý lịch học
6. ❌ UC16: Xem lịch tổng quan
7. ❌ UC17: Nhận và xem thông báo
8. ❌ UC18: Tóm tắt nội dung (AI)
9. ❌ UC19: Hỏi đáp trên tài liệu (AI)

---

## 📚 TÀI LIỆU QUAN TRỌNG

### 1. **IMPLEMENTATION_ANALYSIS.md** (Phân tích tổng quan)
- Đánh giá hiện trạng từng use case
- Phân tích công nghệ
- Kiến trúc hệ thống đề xuất
- Ước tính chi phí

### 2. **USE_CASES_DETAILED.md** (Chi tiết use cases)
- Biểu đồ hoạt động (Activity Diagrams)
- Code triển khai chi tiết
- Validation rules
- Error handling

### 3. **ROADMAP.md** (Kế hoạch triển khai)
- 9 sprints chi tiết
- Checklist đầy đủ
- Timeline và milestones
- Risk management

### 4. **convex/schema_new.ts** (Database schema mới)
- 21 bảng đầy đủ
- 60+ indexes
- Comments chi tiết

---

## 🚀 BẮT ĐẦU NGAY

### Bước 1: Cài đặt dependencies mới

```bash
# Tables feature
npm install xlsx react-data-grid papaparse

# Calendar feature
npm install react-big-calendar date-fns

# AI features
npm install @google/generative-ai

# Utilities
npm install react-hook-form use-debounce react-idle-timer
```

### Bước 2: Cập nhật environment variables

Tạo/cập nhật file `.env.local`:

```env
# Existing (đã có)
CONVEX_DEPLOYMENT=your_deployment
NEXT_PUBLIC_CONVEX_URL=your_convex_url
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
EDGE_STORE_ACCESS_KEY=your_edgestore_key
EDGE_STORE_SECRET_KEY=your_edgestore_secret

# New (cần thêm)
GEMINI_API_KEY=your_gemini_api_key
CLERK_WEBHOOK_SECRET=your_webhook_secret
```

### Bước 3: Migrate database schema

```bash
# Backup schema hiện tại
cp convex/schema.ts convex/schema_backup.ts

# Copy schema mới
cp convex/schema_new.ts convex/schema.ts

# Deploy to Convex
npx convex dev
```

### Bước 4: Chọn sprint để bắt đầu

**Khuyến nghị theo độ ưu tiên:**

#### 🔴 Ưu tiên CAO (Bắt đầu ngay)
1. **Sprint 1: User Management** (1 tuần)
   - UC04, UC05, UC06
   - Quan trọng cho security và UX

2. **Sprint 2-3: Tables Feature** (2-3 tuần)
   - UC14
   - Core feature, phức tạp nhất

3. **Sprint 4-5: Calendar System** (2 tuần)
   - UC15, UC16
   - Core feature cho học sinh/sinh viên

#### 🟡 Ưu tiên TRUNG BÌNH
4. **Sprint 6: Notifications** (1 tuần)
   - UC17
   - Tăng engagement

#### 🟢 Ưu tiên THẤP (Nice to have)
5. **Sprint 7-8: AI Features** (2 tuần)
   - UC18, UC19
   - Tính năng nâng cao

---

## 📖 HƯỚNG DẪN CHI TIẾT THEO SPRINT

### SPRINT 1: USER MANAGEMENT (Tuần 1)

#### Ngày 1-2: UC05 - Profile Management

**1. Tạo Convex functions:**
```bash
# Tạo file mới
touch convex/users.ts
```

Nội dung `convex/users.ts`:
```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getProfile = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();
    
    return user;
  }
});

export const updateProfile = mutation({
  args: {
    fullName: v.string(),
    phone: v.optional(v.string()),
    gender: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    
    if (!args.fullName || args.fullName.trim() === "") {
      throw new Error("Họ tên không được để trống");
    }
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();
    
    if (!user) throw new Error("User not found");
    
    await ctx.db.patch(user._id, {
      fullName: args.fullName,
      phone: args.phone,
      gender: args.gender,
      avatarUrl: args.avatarUrl,
      updatedAt: Date.now(),
    });
    
    return user._id;
  }
});
```

**2. Tạo Profile Page:**
```bash
mkdir -p app/\(main\)/\(routes\)/profile/_components
touch app/\(main\)/\(routes\)/profile/page.tsx
touch app/\(main\)/\(routes\)/profile/_components/profile-form.tsx
touch app/\(main\)/\(routes\)/profile/_components/avatar-upload.tsx
```

**3. Test:**
- [ ] Truy cập `/profile`
- [ ] Cập nhật họ tên
- [ ] Upload avatar
- [ ] Lưu thành công

#### Ngày 3: UC06 - Change Password

**1. Tạo Settings Page:**
```bash
mkdir -p app/\(main\)/\(routes\)/settings/_components
touch app/\(main\)/\(routes\)/settings/page.tsx
touch app/\(main\)/\(routes\)/settings/_components/change-password-form.tsx
```

**2. Integrate Clerk API:**
```typescript
// In change-password-form.tsx
import { useUser } from "@clerk/clerk-react";

const { user } = useUser();

const handleChangePassword = async (oldPassword, newPassword) => {
  await user.updatePassword({
    currentPassword: oldPassword,
    newPassword: newPassword,
  });
};
```

#### Ngày 4: UC04 - Forgot Password

**1. Kích hoạt trong Clerk Dashboard:**
- Đăng nhập [Clerk Dashboard](https://dashboard.clerk.com)
- Vào **User & Authentication → Email, Phone, Username**
- Bật **Password reset**
- Customize email template

**2. Thêm link vào sign-in page:**
```typescript
// Update sign-in form
<button onClick={handleForgotPassword}>
  Quên mật khẩu?
</button>
```

---

### SPRINT 2-3: TABLES FEATURE (Tuần 2-4)

**Đây là sprint phức tạp nhất. Xem chi tiết trong ROADMAP.md**

Các bước chính:
1. Tạo database schema (tables, columns, rows, cells)
2. Tạo CRUD APIs
3. Build Excel-like grid UI
4. Implement Excel/CSV import
5. Testing và optimization

---

### SPRINT 4-5: CALENDAR SYSTEM (Tuần 5-6)

**Chia làm 2 phần:**

#### Part 1: UC15 - Schedules (Tuần 5)
- Tạo schedules schema
- Build CRUD APIs
- Create weekly grid UI

#### Part 2: UC16 - Calendar (Tuần 6)
- Tạo events schema
- Integrate react-big-calendar
- Merge schedules + events

---

### SPRINT 6: NOTIFICATIONS (Tuần 7)

**Các bước chính:**
1. Tạo notifications schema
2. Build notification APIs
3. Create notification UI (bell icon, dropdown)
4. Setup Convex cron jobs
5. Implement reminder generation

---

### SPRINT 7-8: AI FEATURES (Tuần 8-9)

#### Part 1: UC18 - Summarization
- Get Gemini API key
- Create summarize API
- Build UI components

#### Part 2: UC19 - Q&A Chat
- Create chat schema
- Build chat APIs
- Implement chat UI

---

## 🧪 TESTING STRATEGY

### Unit Tests
```bash
npm install -D vitest @testing-library/react
```

### E2E Tests
```bash
npm install -D @playwright/test
npx playwright install
```

### Run Tests
```bash
npm run test        # Unit tests
npm run test:e2e    # E2E tests
```

---

## 📊 THEO DÕI TIẾN ĐỘ

### Tạo GitHub Issues

```bash
# Tạo issue cho mỗi use case
gh issue create --title "UC05: Cập nhật thông tin cá nhân" --label "enhancement"
gh issue create --title "UC06: Đổi mật khẩu" --label "enhancement"
# ... etc
```

### Tạo Project Board

1. Vào GitHub repository
2. Tạo Project board mới
3. Thêm columns: To Do, In Progress, Testing, Done
4. Link issues vào board

---

## 🐛 TROUBLESHOOTING

### Lỗi thường gặp

#### 1. Convex schema migration fails
```bash
# Xóa deployment cũ và tạo mới
npx convex dev --once
npx convex deploy
```

#### 2. Clerk webhook không hoạt động
- Kiểm tra CLERK_WEBHOOK_SECRET
- Verify webhook URL trong Clerk Dashboard
- Check ngrok nếu test local

#### 3. Gemini API error
- Verify API key
- Check quota limits
- Review error messages

---

## 📞 HỖ TRỢ

### Resources
- [Next.js Docs](https://nextjs.org/docs)
- [Convex Docs](https://docs.convex.dev)
- [Clerk Docs](https://clerk.com/docs)
- [Gemini API Docs](https://ai.google.dev/docs)

### Community
- [Next.js Discord](https://discord.gg/nextjs)
- [Convex Discord](https://discord.gg/convex)
- [Clerk Discord](https://discord.gg/clerk)

---

## ✅ CHECKLIST TRƯỚC KHI BẮT ĐẦU

- [ ] Đã đọc IMPLEMENTATION_ANALYSIS.md
- [ ] Đã đọc USE_CASES_DETAILED.md
- [ ] Đã đọc ROADMAP.md
- [ ] Đã cài đặt dependencies
- [ ] Đã setup environment variables
- [ ] Đã backup code hiện tại
- [ ] Đã tạo branch mới: `feature/full-implementation`
- [ ] Đã migrate database schema
- [ ] Đã test Convex connection
- [ ] Đã test Clerk authentication
- [ ] Sẵn sàng code! 🚀

---

## 🎯 MỤC TIÊU

### Sprint 1 (Tuần 1)
- [ ] Hoàn thành UC04, UC05, UC06
- [ ] User management đầy đủ
- [ ] Deploy to staging

### Sprint 2-3 (Tuần 2-4)
- [ ] Hoàn thành UC14
- [ ] Tables feature hoàn chỉnh
- [ ] Excel import/export

### Sprint 4-5 (Tuần 5-6)
- [ ] Hoàn thành UC15, UC16
- [ ] Calendar system đầy đủ
- [ ] Schedule + Events integration

### Sprint 6 (Tuần 7)
- [ ] Hoàn thành UC17
- [ ] Notification system
- [ ] Cron jobs setup

### Sprint 7-8 (Tuần 8-9)
- [ ] Hoàn thành UC18, UC19
- [ ] AI features
- [ ] Usage tracking

### Sprint 9 (Tuần 10)
- [ ] Testing & bug fixes
- [ ] Performance optimization
- [ ] Production deployment

---

## 🎉 KẾT LUẬN

Bạn đã có đầy đủ tài liệu và kế hoạch để triển khai 9 use cases còn lại. Hãy bắt đầu từ **Sprint 1: User Management** vì nó quan trọng và tương đối đơn giản.

**Thời gian ước tính:** 8-10 tuần (solo developer, full-time)

**Chúc bạn thành công! 🚀**

---

**Created:** 01/12/2025
**Version:** 1.0
**Next Step:** Bắt đầu Sprint 1 - User Management
