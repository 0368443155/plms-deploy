# 🔑 Cấu hình GEMINI_API_KEY cho Convex

## Bước 1: Lấy Gemini API Key

1. Truy cập: https://makersuite.google.com/app/apikey
2. Đăng nhập với Google account
3. Click "Create API Key"
4. Copy API key (dạng: `AIza...`)

## Bước 2: Thêm vào Convex Dashboard

### Option A: Qua Dashboard (Khuyến nghị)

1. Mở [Convex Dashboard](https://dashboard.convex.dev)
2. Chọn project của bạn
3. Vào **Settings** → **Environment Variables**
4. Click **Add Variable**
5. Nhập:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** API key bạn vừa copy
6. Click **Save**

### Option B: Qua CLI

```bash
# Set environment variable
npx convex env set GEMINI_API_KEY "your_api_key_here"

# Verify
npx convex env ls
```

## Bước 3: Restart Convex Dev Server

```bash
# Dừng server hiện tại (Ctrl+C)
# Chạy lại
npx convex dev
```

## Bước 4: Test

1. Mở một document
2. Click button "Tóm tắt AI" trong toolbar
3. Nếu không còn lỗi "GEMINI_API_KEY not configured" → ✅ Thành công!

## Troubleshooting

### Lỗi: "GEMINI_API_KEY not configured"

**Nguyên nhân:**
- Environment variable chưa được set trong Convex
- Convex dev server chưa restart sau khi set

**Giải pháp:**
1. Kiểm tra trong Dashboard: Settings → Environment Variables
2. Đảm bảo tên biến chính xác: `GEMINI_API_KEY` (không có khoảng trắng)
3. Restart `npx convex dev`

### Lỗi: "API quota exceeded"

**Nguyên nhân:**
- Đã vượt quá giới hạn free tier của Gemini API

**Giải pháp:**
- Đợi reset quota (thường là theo ngày/tháng)
- Hoặc upgrade lên paid plan

### Lỗi: "Invalid API key"

**Nguyên nhân:**
- API key không đúng hoặc đã bị revoke

**Giải pháp:**
1. Tạo API key mới tại https://makersuite.google.com/app/apikey
2. Update lại trong Convex Dashboard
3. Restart Convex dev server

---

**Lưu ý:** 
- API key là sensitive data, không commit vào git
- Chỉ set trong Convex Dashboard, không cần thêm vào `.env.local` (vì Convex functions chạy trên server)
- Nếu dùng production, set environment variable trong production deployment

