# 📊 Gemini Model Information & Free Tier Limits

## Model Comparison

| Model | Free Tier | Paid Tier | Speed | Quality | Use Case |
|-------|-----------|-----------|-------|---------|----------|
| `gemini-1.5-flash` | ✅ Yes | ✅ Yes | ⚡ Fast | ⭐⭐⭐ Good | **Recommended for free tier** |
| `gemini-1.5-pro` | ✅ Yes | ✅ Yes | 🐢 Slower | ⭐⭐⭐⭐ Better | Better quality, slower |
| `gemini-2.5-pro` | ❌ No | ✅ Yes | 🐢 Slower | ⭐⭐⭐⭐⭐ Best | Requires paid tier |
| `gemini-2.0-flash` | ❌ No | ✅ Yes | ⚡ Fast | ⭐⭐⭐⭐ Better | Requires paid tier |

## Free Tier Limits

### For `gemini-1.5-flash` and `gemini-1.5-pro`:
- **Requests per minute:** 15 requests
- **Requests per day:** 1,500 requests
- **Input tokens per minute:** 1,000,000 tokens
- **Input tokens per day:** 50,000,000 tokens

### For `gemini-2.5-pro` and `gemini-2.0-flash`:
- **Free tier:** ❌ Not available
- **Requires:** Paid Google Cloud billing account

## Current Implementation

Code đã được cấu hình để:
1. ✅ **Ưu tiên free tier models:** `gemini-1.5-flash` → `gemini-1.5-pro` → `gemini-2.5-pro`
2. ✅ **Auto-fallback:** Nếu model không available hoặc hết quota, tự động thử model tiếp theo
3. ✅ **Error handling:** Hiển thị lỗi rõ ràng nếu tất cả models đều fail

## Recommendations

### For Free Tier Users:
- ✅ Use `gemini-1.5-flash` (default, fastest, free)
- ✅ Fallback to `gemini-1.5-pro` if needed (better quality)

### For Paid Tier Users:
- ✅ Can use `gemini-2.5-pro` for best quality
- ✅ Can use `gemini-2.0-flash` for faster responses

## Troubleshooting

### Error: "Quota exceeded for gemini-2.5-pro"
**Solution:** Code sẽ tự động fallback sang `gemini-1.5-flash` hoặc `gemini-1.5-pro`

### Error: "All models quota exceeded"
**Solution:** 
- Đợi reset quota (thường reset theo ngày)
- Hoặc upgrade lên paid tier

### Error: "Model not found"
**Solution:** 
- Model name có thể đã thay đổi
- Check [Gemini API documentation](https://ai.google.dev/gemini-api/docs/models) for latest model names

## Model Selection Logic

```typescript
// Priority order (already implemented):
1. gemini-1.5-flash  // Fast, free tier ✅
2. gemini-1.5-pro    // Better quality, free tier ✅
3. gemini-2.5-pro    // Best quality, paid tier only ❌
```

Code sẽ tự động:
- Thử model đầu tiên
- Nếu 404 (not found) hoặc 429 (quota exceeded) → thử model tiếp theo
- Nếu tất cả đều fail → throw error với message chi tiết

---

**Last Updated:** 10/12/2025  
**Status:** ✅ Auto-fallback implemented

