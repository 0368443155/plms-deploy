# 🔧 Fix Gemini Model Issues

## Vấn đề hiện tại

1. **Model names với version numbers không hoạt động:**
   - ❌ `gemini-1.5-flash-002` → 404
   - ❌ `gemini-1.5-pro-002` → 404
   - ✅ `gemini-1.5-flash` → Nên dùng

2. **API version v1beta có thể không support một số models**

3. **Free tier models:**
   - ✅ `gemini-1.5-flash` - Free tier
   - ✅ `gemini-1.5-pro` - Free tier
   - ❌ `gemini-2.5-pro` - Requires paid (limit: 0)

## Giải pháp đã implement

### 1. Model Priority Order

Code đã được cập nhật để thử theo thứ tự:
1. `gemini-1.5-flash` (free tier) ✅
2. `gemini-1.5-pro` (free tier) ✅
3. `gemini-2.0-flash-exp` (experimental)
4. `gemini-3-pro-preview`
5. `gemini-3-pro`
6. `gemini-2.5-pro` (paid only)

### 2. Auto-fallback

- Nếu model bị 404 → tự động thử model tiếp theo
- Nếu model bị 429 (quota) → tự động thử model tiếp theo
- Chỉ throw error khi tất cả models đều fail

### 3. Better Error Messages

Error messages giờ sẽ hiển thị:
- Danh sách models đã thử
- Lỗi cụ thể (404, 429, etc.)
- Hướng dẫn fix

## Troubleshooting

### Nếu tất cả models đều 404:

**Nguyên nhân có thể:**
1. API key không hợp lệ
2. Generative AI API chưa được enable
3. API key không có quyền truy cập

**Giải pháp:**
1. Kiểm tra API key trong Convex Dashboard
2. Enable Generative AI API trong Google Cloud Console:
   - Vào https://console.cloud.google.com/apis/library
   - Tìm "Generative Language API"
   - Click "Enable"
3. Tạo API key mới tại https://makersuite.google.com/app/apikey

### Nếu tất cả models đều 429:

**Nguyên nhân:**
- Đã hết quota free tier

**Giải pháp:**
- Đợi reset quota (thường reset theo ngày)
- Hoặc upgrade lên paid tier

### Nếu chỉ một số models fail:

**Đây là bình thường!** Code sẽ tự động fallback sang model khác.

## Test Models

Để test xem model nào hoạt động, check logs trong terminal:

```
Model gemini-1.5-flash-002 failed: 404 Not Found
Model gemini-1.5-flash quota exceeded, trying next model...
Model gemini-1.5-pro failed: 404 Not Found
✅ Success with gemini-1.5-pro
```

## Recommended Models for Free Tier

**Best choice:** `gemini-1.5-flash`
- ✅ Free tier
- ✅ Fast
- ✅ Good quality
- ✅ Most stable

**Alternative:** `gemini-1.5-pro`
- ✅ Free tier
- ✅ Better quality
- ⚠️ Slower than flash

**Avoid:** `gemini-2.5-pro`, `gemini-3-pro`
- ❌ Require paid tier
- ❌ Will always get 429 on free tier

---

**Status:** ✅ Code đã được cập nhật với model priority và auto-fallback  
**Next:** Restart Convex dev server và test lại

