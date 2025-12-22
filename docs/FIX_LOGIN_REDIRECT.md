# CẬP NHẬT .env.local SAU KHI TẠO CONVEX DEPLOYMENT MỚI

## Vấn đề hiện tại
Sau khi đăng nhập, bạn không thể redirect sang /documents vì Convex auth chưa được cấu hình đúng.

## Nguyên nhân
File `.env.local` đang dùng Convex deployment cũ, cần update sang deployment mới: `plms-cuoiki`

## Giải pháp

### Bước 1: Lấy thông tin Convex deployment mới

Vào [Convex Dashboard](https://dashboard.convex.dev/t/hoang-thai-lam/plms-cuoiki)

Hoặc chạy lệnh:
```bash
npx convex dev --once
```

Trong output, tìm dòng:
```
✔ Created project plms-cuoiki, manage it at https://dashboard.convex.dev/...
```

### Bước 2: Update file `.env.local`

Mở file `.env.local` và update các dòng sau:

```env
# Convex - CẬP NHẬT DÒNG NÀY
CONVEX_DEPLOYMENT=plms-cuoiki:XXXXX
NEXT_PUBLIC_CONVEX_URL=https://XXXXX.convex.cloud

# Clerk - GIỮ NGUYÊN
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# EdgeStore - GIỮ NGUYÊN  
EDGE_STORE_ACCESS_KEY=...
EDGE_STORE_SECRET_KEY=...
```

**Cách lấy giá trị chính xác:**

1. Vào terminal đang chạy `npx convex dev`
2. Tìm dòng có `NEXT_PUBLIC_CONVEX_URL`
3. Copy giá trị đó

HOẶC:

1. Vào [Convex Dashboard](https://dashboard.convex.dev)
2. Click vào project `plms-cuoiki`
3. Vào tab "Settings" → "URL & Deployment"
4. Copy `Deployment URL`

### Bước 3: Restart Next.js dev server

```bash
# Dừng server hiện tại (Ctrl+C)
# Chạy lại
npm run dev
```

### Bước 4: Test

1. Mở browser: `http://localhost:3000`
2. Click "Get Notion free" để đăng nhập
3. Sau khi đăng nhập thành công, bạn sẽ được redirect sang `/documents`

## Nếu vẫn không hoạt động

### Kiểm tra Console

Mở DevTools (F12) → Console tab, xem có lỗi gì không.

Lỗi thường gặp:
- `Convex client could not reach server` → Sai `NEXT_PUBLIC_CONVEX_URL`
- `Unauthorized` → Clerk auth chưa sync với Convex

### Clear cache và cookies

1. Mở DevTools (F12)
2. Application tab → Clear storage
3. Click "Clear site data"
4. Reload page

### Kiểm tra Convex auth config

File `convex/auth.config.js` phải có:

```javascript
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
```

## Troubleshooting

### Lỗi: "isAuthenticated is always false"

**Nguyên nhân:** Convex không nhận được Clerk JWT

**Giải pháp:**
1. Kiểm tra `.env.local` có đúng `NEXT_PUBLIC_CONVEX_URL`
2. Kiểm tra `convex/auth.config.js`
3. Restart cả Convex và Next.js dev servers

### Lỗi: "Redirect loop"

**Nguyên nhân:** Middleware redirect liên tục

**Giải pháp:**
1. Kiểm tra `middleware.ts`
2. Đảm bảo chỉ redirect từ `/` sang `/documents`
3. Không redirect nếu đã ở `/documents`

---

**Sau khi update xong, hãy test lại và cho tôi biết kết quả!**
