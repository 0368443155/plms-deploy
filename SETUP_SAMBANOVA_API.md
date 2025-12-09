# 🔑 Hướng dẫn thêm SambaNova API Key vào Convex

## 📋 Tổng quan

SambaNova API được sử dụng như một fallback option khi tất cả các Gemini models hết quota. SambaNova cung cấp $5 credit miễn phí (~30 triệu tokens).

## 🚀 Cách thêm API Key

### Cách 1: Qua Convex Dashboard (Khuyến nghị)

1. **Mở Convex Dashboard**
   - Truy cập: https://dashboard.convex.dev
   - Đăng nhập với tài khoản của bạn

2. **Chọn Project**
   - Chọn project của bạn từ danh sách

3. **Vào Settings**
   - Click vào **Settings** ở sidebar bên trái
   - Hoặc truy cập trực tiếp: `https://dashboard.convex.dev/[your-project]/settings`

4. **Thêm Environment Variable**
   - Scroll xuống phần **Environment Variables**
   - Click nút **Add Variable** hoặc **+ Add**
   - Điền thông tin:
     - **Name:** `SAMBANOVA_API_KEY`
     - **Value:** `07686f9e-5473-475e-b625-f141d47ac69a`
   - Click **Save** hoặc **Add**

5. **Xác nhận**
   - Bạn sẽ thấy biến `SAMBANOVA_API_KEY` xuất hiện trong danh sách
   - Status sẽ hiển thị là "Set" hoặc có dấu tích xanh

### Cách 2: Qua Convex CLI (Không khuyến nghị cho production)

**Lưu ý:** Cách này chỉ dùng cho development local. Để deploy lên production, bạn vẫn cần thêm qua Dashboard.

1. **Tạo file `.env.local`** (nếu chưa có):
   ```bash
   touch .env.local
   ```

2. **Thêm biến môi trường:**
   ```env
   SAMBANOVA_API_KEY=07686f9e-5473-475e-b625-f141d47ac69a
   ```

3. **Push lên Convex:**
   ```bash
   npx convex env set SAMBANOVA_API_KEY 07686f9e-5473-475e-b625-f141d47ac69a
   ```

## ✅ Kiểm tra

Sau khi thêm API key, hệ thống sẽ tự động sử dụng SambaNova khi:
- Tất cả Gemini models hết quota (429 error)
- Gemini models không tìm thấy (404 error)

Bạn có thể kiểm tra logs trong Convex Dashboard để xem SambaNova có được sử dụng không:
- Vào **Logs** trong Dashboard
- Tìm các log có chứa "SambaNova" hoặc "sambanova"

## 🔍 Troubleshooting

### API key không hoạt động

1. **Kiểm tra tên biến:**
   - Phải chính xác là `SAMBANOVA_API_KEY` (chữ hoa, có dấu gạch dưới)
   - Không có khoảng trắng ở đầu/cuối

2. **Kiểm tra giá trị:**
   - API key phải đúng format: `07686f9e-5473-475e-b625-f141d47ac69a`
   - Không có khoảng trắng hoặc ký tự thừa

3. **Restart Convex:**
   - Sau khi thêm environment variable, restart Convex:
     ```bash
     # Stop Convex
     Ctrl+C
     
     # Start lại
     npx convex dev
     ```

4. **Kiểm tra logs:**
   - Xem logs trong Convex Dashboard để biết lỗi cụ thể
   - Tìm các message có chứa "SambaNova" hoặc "SAMBANOVA_API_KEY"

### API key hết credit

- SambaNova cung cấp $5 credit miễn phí (~30 triệu tokens)
- Khi hết credit, hệ thống sẽ tự động fallback sang Hugging Face
- Để tiếp tục sử dụng SambaNova, bạn cần nâng cấp tài khoản tại: https://cloud.sambanova.ai

## 📚 Tài liệu tham khảo

- SambaNova Cloud: https://cloud.sambanova.ai
- SambaNova Documentation: https://docs.sambanova.ai
- Convex Environment Variables: https://docs.convex.dev/production/environment-variables

## 🎯 Lưu ý quan trọng

1. **Bảo mật:** Không commit API key vào Git
2. **Production:** Luôn thêm API key qua Convex Dashboard cho production
3. **Credit:** SambaNova có $5 credit miễn phí, sau đó cần trả phí
4. **Fallback:** Hệ thống sẽ tự động fallback sang Hugging Face nếu SambaNova fail

