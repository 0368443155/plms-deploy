# Gemini Live API - Unlimited Models Guide

## 📋 Tổng quan

Các model "unlimited" bạn thấy trong Google AI Studio (`gemini-2.5-flash-live`, `gemini-2.0-flash-live`, `gemini-2.5-flash-native-audio-dialog`) là **Multimodal Live API models**.

### ⚠️ Khác biệt quan trọng:

| Feature | Standard API (`generateContent`) | Live API (Unlimited Models) |
|---------|----------------------------------|----------------------------|
| **Method** | `generateContent()` | WebSocket streaming |
| **Use Case** | Text generation, chat | Real-time audio/video/text streaming |
| **Quota** | Limited (có giới hạn) | **Unlimited** (không giới hạn) |
| **Latency** | ~1-2s | ~600ms (real-time) |
| **Input** | Text, images (static) | Audio, video, text (streaming) |
| **Output** | Text | Text, audio (streaming) |

## ✅ Khi nào dùng Live API?

Live API phù hợp cho:
- ✅ Real-time voice assistants
- ✅ Video call với AI
- ✅ Screen sharing + AI analysis
- ✅ Interactive chatbots với audio
- ✅ **Text chat với low latency** (có thể dùng!)

## ❌ Khi nào KHÔNG nên dùng Live API?

- ❌ Simple text generation (dùng `generateContent` đơn giản hơn)
- ❌ Batch processing
- ❌ Không cần real-time response

## 🚀 Cách implement Live API cho Text Chat

### 1. Cài đặt dependencies

```bash
npm install ws @google/generative-ai
```

### 2. Backend - WebSocket Handler

```typescript
// convex/ai-live.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import WebSocket from "ws";

export async function chatWithLiveAPI(
  message: string,
  documentContext: string,
  history: Array<{ role: string; content: string }>
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Use unlimited model
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash-live" 
  });

  // Create WebSocket connection
  const ws = new WebSocket(
    `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`,
    {
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
    }
  );

  return new Promise((resolve, reject) => {
    let response = "";

    ws.on("open", () => {
      // Send setup message
      ws.send(JSON.stringify({
        setup: {
          model: "models/gemini-2.5-flash-live",
          generation_config: {
            response_modalities: ["TEXT"],
          },
        },
      }));

      // Send context
      ws.send(JSON.stringify({
        client_content: {
          turns: [
            {
              role: "user",
              parts: [{ text: `Context: ${documentContext}` }],
            },
            ...history.map(h => ({
              role: h.role,
              parts: [{ text: h.content }],
            })),
            {
              role: "user",
              parts: [{ text: message }],
            },
          ],
          turn_complete: true,
        },
      }));
    });

    ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      
      if (msg.serverContent?.modelTurn) {
        const parts = msg.serverContent.modelTurn.parts;
        parts.forEach((part: any) => {
          if (part.text) {
            response += part.text;
          }
        });
      }

      if (msg.serverContent?.turnComplete) {
        ws.close();
        resolve(response);
      }
    });

    ws.on("error", (error) => {
      reject(error);
    });

    ws.on("close", () => {
      if (response) {
        resolve(response);
      } else {
        reject(new Error("Connection closed without response"));
      }
    });
  });
}
```

### 3. Integrate vào existing code

```typescript
// Trong summarizeDocumentHandler hoặc chatWithAIHandler
if (!summary) {
  // Try Live API as fallback
  console.log("Trying Gemini Live API (unlimited)...");
  try {
    summary = await chatWithLiveAPI(
      "Tóm tắt nội dung này",
      plainText,
      []
    );
    usedModel = "gemini-2.5-flash-live (unlimited)";
    console.log("Successfully used Live API");
  } catch (liveError: any) {
    console.error("Live API failed:", liveError);
    // Continue to SambaNova fallback
  }
}
```

## 📊 So sánh Performance

| Metric | Standard API | Live API |
|--------|--------------|----------|
| First token | ~1-2s | ~600ms |
| Quota | 15 RPM (free) | **Unlimited** |
| Complexity | Low | Medium |
| Setup | Simple | WebSocket |

## 🎯 Kết luận

**Hiện tại:**
- ✅ Dùng `gemini-2.0-flash-exp` và `gemini-1.5-flash` (đơn giản, đủ dùng)
- ✅ Fallback sang SambaNova khi quota exceeded (đang hoạt động tốt)

**Tương lai (nếu cần unlimited):**
- 🔄 Implement Live API với WebSocket
- 🔄 Phức tạp hơn nhưng không giới hạn quota
- 🔄 Latency thấp hơn (~600ms vs ~1-2s)

## 📚 Tài liệu tham khảo

- [Gemini Live API Documentation](https://ai.google.dev/gemini-api/docs/live-api)
- [WebSocket Integration Guide](https://ai.google.dev/gemini-api/docs/live-api/websocket)
- [Partner Integrations (LiveKit, Daily)](https://ai.google.dev/gemini-api/docs/live-api/partners)

## 💡 Gợi ý

Với use case hiện tại (text chat/summary), **không cần thiết** phải dùng Live API vì:
1. Standard API đơn giản hơn nhiều
2. SambaNova fallback đã hoạt động tốt
3. Latency 1-2s là chấp nhận được cho text generation

**Chỉ implement Live API khi:**
- Cần real-time voice/video interaction
- Cần latency < 1s
- Vượt quá quota của tất cả standard models
