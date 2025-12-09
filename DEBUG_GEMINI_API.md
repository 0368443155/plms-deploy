# 🐛 Debug Gemini API Issues

## Lỗi: "Failed to generate summary" hoặc "Failed to get response"

### Bước 1: Kiểm tra API Key

1. **Kiểm tra trong Convex Dashboard:**
   - Vào https://dashboard.convex.dev
   - Chọn project → Settings → Environment Variables
   - Tìm `GEMINI_API_KEY`
   - Đảm bảo giá trị đúng (bắt đầu với `AIza...`)

2. **Kiểm tra API Key có hợp lệ:**
   - Vào https://makersuite.google.com/app/apikey
   - Xem danh sách API keys
   - Đảm bảo key bạn dùng vẫn còn active (không bị xóa/revoke)

### Bước 2: Kiểm tra Quota

1. **Kiểm tra quota trong Google Cloud Console:**
   - Vào https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas
   - Xem "Requests per minute" và "Requests per day"
   - Nếu đã hết quota → Đợi reset hoặc upgrade plan

2. **Free tier limits:**
   - 60 requests per minute
   - 1,500 requests per day
   - Nếu vượt quá → Sẽ nhận lỗi 429

### Bước 3: Kiểm tra Logs

1. **Xem logs trong Convex Dashboard:**
   - Vào https://dashboard.convex.dev
   - Chọn project → Functions → Logs
   - Tìm function `ai:summarizeDocument` hoặc `ai:chatWithAI`
   - Xem error details

2. **Xem logs trong terminal:**
   - Terminal đang chạy `npx convex dev`
   - Tìm dòng có "Gemini API error:"
   - Xem error message và status code

### Bước 4: Test API Key trực tiếp

Tạo file test để kiểm tra API key:

```bash
# Tạo file test
cat > test-gemini.js << 'EOF'
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE";
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

async function test() {
  try {
    const result = await model.generateContent("Say hello");
    const response = await result.response;
    console.log("✅ Success:", response.text());
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Status:", error.status);
    console.error("Code:", error.code);
  }
}

test();
EOF

# Chạy test (thay YOUR_API_KEY_HERE bằng API key thực)
GEMINI_API_KEY=YOUR_API_KEY_HERE node test-gemini.js
```

### Bước 5: Các lỗi thường gặp

#### Lỗi 401: Unauthorized
**Nguyên nhân:** API key không hợp lệ hoặc đã bị revoke

**Giải pháp:**
1. Tạo API key mới tại https://makersuite.google.com/app/apikey
2. Update trong Convex Dashboard
3. Restart `npx convex dev`

#### Lỗi 429: Too Many Requests
**Nguyên nhân:** Đã vượt quá quota (60 req/min hoặc 1500 req/day)

**Giải pháp:**
1. Đợi reset quota (thường reset theo ngày)
2. Giảm số lượng requests
3. Upgrade lên paid plan nếu cần

#### Lỗi 403: Forbidden
**Nguyên nhân:** API key không có quyền truy cập Gemini API

**Giải pháp:**
1. Kiểm tra API key có được enable cho Generative AI API không
2. Vào Google Cloud Console → APIs & Services → Enabled APIs
3. Đảm bảo "Generative Language API" được enable

#### Lỗi: "API_KEY_INVALID"
**Nguyên nhân:** API key format không đúng

**Giải pháp:**
1. API key phải bắt đầu với `AIza`
2. Không có khoảng trắng ở đầu/cuối
3. Copy lại từ Google AI Studio

### Bước 6: Verify trong Convex

1. **Restart Convex dev server:**
   ```bash
   # Dừng server (Ctrl+C)
   npx convex dev
   ```

2. **Kiểm tra environment variable:**
   ```bash
   npx convex env ls
   ```
   
   Đảm bảo thấy `GEMINI_API_KEY` trong danh sách

3. **Test lại trong app:**
   - Mở một document
   - Click "Tóm tắt AI"
   - Xem error message mới (sẽ chi tiết hơn sau khi update code)

### Bước 7: Alternative - Dùng API key khác

Nếu API key hiện tại không hoạt động:

1. Tạo API key mới:
   - https://makersuite.google.com/app/apikey
   - Click "Create API Key"
   - Copy key mới

2. Update trong Convex:
   - Dashboard → Settings → Environment Variables
   - Update `GEMINI_API_KEY` với key mới
   - Restart `npx convex dev`

---

## 📝 Checklist Debug

- [ ] API key được set trong Convex Dashboard
- [ ] API key format đúng (bắt đầu với `AIza`)
- [ ] API key vẫn active (không bị revoke)
- [ ] Quota chưa hết (kiểm tra trong Google Cloud Console)
- [ ] Generative Language API được enable
- [ ] Đã restart Convex dev server sau khi set API key
- [ ] Xem logs để biết lỗi cụ thể

---

## 💡 Tips

1. **Sử dụng API key riêng cho development:**
   - Tạo API key riêng cho mỗi môi trường (dev/prod)
   - Không share API key giữa các projects

2. **Monitor quota:**
   - Set up alerts trong Google Cloud Console
   - Track số lượng requests hàng ngày

3. **Error handling:**
   - Code đã được update để hiển thị lỗi chi tiết hơn
   - Check console logs để biết nguyên nhân cụ thể

