import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ========================================
// CÁC HÀM HỖ TRỢ (HELPER FUNCTIONS)
// ========================================

/**
 * Trích xuất văn bản thuần túy từ nội dung BlockNote JSON
 */
function extractPlainText(content: string | undefined): string {
  if (!content) return "";

  try {
    const blocks = JSON.parse(content);

    if (!Array.isArray(blocks)) return "";

    return blocks
      .map((block: any) => {
        if (block.type === "paragraph" || block.type === "heading") {
          return block.content?.map((c: any) => c.text || "").join("") || "";
        }
        if (block.type === "bulletListItem" || block.type === "numberedListItem") {
          return block.content?.map((c: any) => c.text || "").join("") || "";
        }
        return "";
      })
      .filter((text: string) => text.trim().length > 0)
      .join("\n");
  } catch (error) {
    return "";
  }
}

/**
 * Hash nội dung sử dụng thuật toán đơn giản (để tạo key cache)
 */
function hashContent(content: string): string {
  // Hàm hash đơn giản vì Convex không có sẵn crypto module mạnh
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Sử dụng SambaNova API (có $5 free credit)
 * Thử nhiều endpoint và format khác nhau
 */
async function summarizeWithSambaNova(text: string, apiKey: string): Promise<string> {
  // Sử dụng toàn bộ nội dung văn bản, không giới hạn ký tự (Llama 3.1 hỗ trợ context window lớn)
  const prompt = `Hãy tóm tắt TOÀN BỘ nội dung sau một cách ngắn gọn và súc tích. Nếu có nhiều chương/phần, hãy tóm tắt TẤT CẢ các phần:\n\n${text}`;

  // Thử các endpoint khác nhau của SambaNova API
  const endpointsToTry = [
    {
      url: "https://api.sambanova.ai/v1/chat/completions",
      body: {
        model: "Meta-Llama-3.1-8B-Instruct",
        messages: [
          {
            role: "system",
            content: "Bạn là một trợ lý AI chuyên tóm tắt tài liệu. Hãy tóm tắt nội dung một cách ngắn gọn và súc tích (khoảng 3-5 câu)."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,  // Tăng max_tokens để cho phép output dài hơn nếu input dài
        temperature: 0.7,
      },
      extractResult: (data: any) => {
        if (data.choices && data.choices[0]?.message?.content) return data.choices[0].message.content.trim();
        return null;
      }
    },
    {
      url: "https://api.sambanova.ai/v1/completions",
      body: {
        model: "Meta-Llama-3.1-8B-Instruct",
        prompt: prompt,
        max_tokens: 1000,
        temperature: 0.7,
      },
      extractResult: (data: any) => {
        if (data.choices && data.choices[0]?.text) return data.choices[0].text.trim();
        return null;
      }
    },
    {
      url: "https://api.sambanova.ai/v1/inference",
      body: {
        model: "Meta-Llama-3.1-8B-Instruct",
        prompt: prompt,
        max_tokens: 1000,
        temperature: 0.7,
      },
      extractResult: (data: any) => {
        if (data.text) return data.text.trim();
        if (data.response) return data.response.trim();
        if (data.choices && data.choices[0]?.text) return data.choices[0].text.trim();
        return null;
      }
    }
  ];

  for (const endpoint of endpointsToTry) {
    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(endpoint.body),
      });

      if (response.ok) {
        const data = await response.json();
        const result = endpoint.extractResult(data);
        if (result) {
          console.log(`Đã dùng thành công endpoint: ${endpoint.url}`);
          return result;
        }
      } else {
        console.log(`Endpoint ${endpoint.url} thất bại với mã ${response.status}, đang thử cái tiếp theo...`);
        // Thử cái tiếp theo
      }
    } catch (error: any) {
      console.error(`Lỗi với endpoint ${endpoint.url}:`, error.message);
      // Thử cái tiếp theo
      continue;
    }
  }

  throw new Error("Tất cả các endpoint của SambaNova đều thất bại");
}

/**
 * Fallback sang Hugging Face Inference API (miễn phí, không cần key xịn)
 * Thử nhiều model khác nhau nếu cái này lỗi thì qua cái kia
 */
async function summarizeWithHuggingFace(text: string): Promise<string> {
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Danh sách các model miễn phí của Hugging Face
  const modelsToTry = [
    {
      url: "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
      prompt: text.substring(0, 1024),
      extractResult: (data: any) => {
        if (Array.isArray(data) && data[0]?.summary_text) return data[0].summary_text;
        if (data.summary_text) return data.summary_text;
        return null;
      }
    },
    {
      url: "https://api-inference.huggingface.co/models/sshleifer/distilbart-cnn-12-6",
      prompt: text.substring(0, 1024),
      extractResult: (data: any) => {
        if (Array.isArray(data) && data[0]?.summary_text) return data[0].summary_text;
        if (data.summary_text) return data.summary_text;
        return null;
      }
    },
    {
      url: "https://api-inference.huggingface.co/models/google/pegasus-xsum",
      prompt: text.substring(0, 512),
      extractResult: (data: any) => {
        if (Array.isArray(data) && data[0]?.summary_text) return data[0].summary_text;
        if (data.summary_text) return data.summary_text;
        return null;
      }
    }
  ];

  for (const model of modelsToTry) {
    try {
      // Gọi API
      let response = await fetch(model.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: model.prompt,
        }),
      });

      // Nếu model đang loading (503), đợi một chút rồi thử lại
      if (response.status === 503) {
        const retryAfter = response.headers.get("retry-after");
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 10000; // Mặc định 10s
        console.log(`Model ${model.url} đang loading, đợi ${waitTime}ms...`);
        await sleep(Math.min(waitTime, 20000)); // Đợi tối đa 20s

        // Thử lại một lần nữa
        response = await fetch(model.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: model.prompt,
          }),
        });
      }

      if (response.ok) {
        const data = await response.json();
        const result = model.extractResult(data);
        if (result) {
          console.log(`Dùng thành công model Hugging Face: ${model.url}`);
          return result;
        }
      } else if (response.status !== 503) {
        // Nếu không phải lỗi 503, thử model khác
        console.log(`Model ${model.url} lỗi ${response.status}, thử model tiếp theo...`);
        continue;
      }
    } catch (error: any) {
      console.error(`Lỗi với model ${model.url}:`, error.message);
      // Thử model khác
      continue;
    }
  }

  // Nếu tất cả đều thất bại, tạo tóm tắt đơn giản bằng cách lấy vài câu đầu
  console.log("Tất cả Hugging Face models đều tạch, tạo tóm tắt đơn giản...");
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  if (sentences.length > 0) {
    const simpleSummary = sentences.slice(0, 3).join(". ") + ".";
    return simpleSummary;
  }

  throw new Error("Không thể tạo tóm tắt từ bất kỳ nguồn nào");
}

/**
 * Chat với SambaNova API (tính năng chat chính)
 */
async function chatWithSambaNova(
  message: string,
  documentContext: string,
  history: Array<{ role: string; content: string }>,
  apiKey: string
): Promise<string> {
  // Tạo context cho cuộc hội thoại - Sử dụng toàn bộ nội dung vì Llama 3.1 8B Instruct có context window lớn
  const systemPrompt = `Bạn là một trợ lý AI chuyên trả lời câu hỏi dựa trên nội dung tài liệu. Hãy trả lời câu hỏi một cách chính xác và hữu ích dựa trên nội dung tài liệu sau:\n\n${documentContext}`;

  // Xây dựng mảng tin nhắn
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-5).map(msg => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content
    })),
    { role: "user", content: message }
  ];

  const endpointsToTry = [
    {
      url: "https://api.sambanova.ai/v1/chat/completions",
      body: {
        model: "Meta-Llama-3.1-8B-Instruct",
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
      },
      extractResult: (data: any) => {
        if (data.choices && data.choices[0]?.message?.content) return data.choices[0].message.content.trim();
        return null;
      }
    },
    {
      url: "https://api.sambanova.ai/v1/completions",
      body: {
        model: "Meta-Llama-3.1-8B-Instruct",
        prompt: `${systemPrompt}\n\nLịch sử hội thoại:\n${history.slice(-3).map(h => `${h.role}: ${h.content}`).join("\n")}\n\nNgười dùng: ${message}\nTrợ lý:`,
        max_tokens: 500,
        temperature: 0.7,
      },
      extractResult: (data: any) => {
        if (data.choices && data.choices[0]?.text) return data.choices[0].text.trim();
        return null;
      }
    }
  ];

  for (const endpoint of endpointsToTry) {
    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(endpoint.body),
      });

      if (response.ok) {
        const data = await response.json();
        const result = endpoint.extractResult(data);
        if (result) {
          console.log(`Dùng thành công SambaNova endpoint chat: ${endpoint.url}`);
          return result;
        }
      }
    } catch (error: any) {
      console.error(`Lỗi với SambaNova chat endpoint ${endpoint.url}:`, error.message);
      continue;
    }
  }

  throw new Error("Tất cả các endpoint chat của SambaNova đều thất bại");
}

/**
 * Chat với Hugging Face (phương án dự phòng đơn giản)
 */
async function chatWithHuggingFace(
  message: string,
  documentContext: string
): Promise<string> {
  // Dùng model Q&A đơn giản từ Hugging Face
  const prompt = `Dựa trên nội dung sau, trả lời câu hỏi:\n\nNội dung: ${documentContext.substring(0, 1000)}\n\nCâu hỏi: ${message}\n\nTrả lời:`;

  try {
    // Thử dùng một model hội thoại
    const response = await fetch("https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {
          past_user_inputs: [],
          generated_responses: [],
          text: prompt.substring(0, 512)
        }
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.generated_text) {
        return data.generated_text.trim();
      }
    }
  } catch (error: any) {
    console.error("Hugging Face chat lỗi:", error);
  }

  // Fallback: trả về tin nhắn đơn giản nếu không gọi được API
  return `Dựa trên nội dung tài liệu, tôi có thể giúp bạn trả lời câu hỏi: "${message}". Tuy nhiên, tính năng chat nâng cao đang tạm thời không khả dụng. Vui lòng thử lại sau hoặc sử dụng tính năng tóm tắt tài liệu.`;
}

// ========================================
// UC18: TÓM TẮT AI (AI SUMMARY)
// ========================================

/**
 * Handler tóm tắt tài liệu
 */
const summarizeDocumentHandler = async (
  ctx: any,
  args: { documentId: Id<"documents">; forceRegenerate?: boolean }
): Promise<{ summary: string; fromCache: boolean; model: string }> => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Chưa đăng nhập");
  }

  const userId = identity.subject;

  // Lấy document
  const document = await ctx.runQuery(internal.documents.getByIdInternal, {
    documentId: args.documentId,
  });

  if (!document || document.userId !== userId) {
    throw new Error("Không có quyền truy cập");
  }

  // Lấy text thuần từ nội dung
  const plainText = extractPlainText(document.content);

  // Kiểm tra độ dài
  if (!plainText || plainText.length < 100) {
    throw new Error("Nội dung quá ngắn để tóm tắt (cần tối thiểu 100 ký tự)");
  }

  // Tạo hash để cache
  const contentHash = hashContent(plainText);

  // Nếu user yêu cầu tạo lại, xóa cache cũ đi
  if (args.forceRegenerate) {
    try {
      const oldSummaries = await ctx.runQuery(internal.ai.getAllSummariesForDocument, {
        documentId: args.documentId,
      });

      for (const oldSummary of oldSummaries) {
        await ctx.runMutation(internal.ai.deleteSummary, {
          summaryId: oldSummary._id,
        });
      }
      console.log(`Đã xóa ${oldSummaries.length} bản tóm tắt cũ`);
    } catch (error) {
      console.error("Lỗi khi xóa tóm tắt cũ:", error);
      // Kệ nó, chạy tiếp
    }
  }

  // Kiểm tra cache nếu không buộc tạo lại
  if (!args.forceRegenerate) {
    const cached: {
      summary: string;
      model: string;
      contentHash: string;
    } | null = await ctx.runQuery(internal.ai.getCachedSummary, {
      documentId: args.documentId,
      contentHash,
    });

    if (cached) {
      return {
        summary: cached.summary,
        fromCache: true,
        model: cached.model,
      };
    }
  }

  let summary: string | null = null;
  let usedModel = "";

  // 1. Thử SambaNova trước (ngon bổ rẻ)
  const sambaNovaApiKey = process.env.SAMBANOVA_API_KEY;
  if (sambaNovaApiKey) {
    try {
      console.log("Đang dùng SambaNova để tóm tắt...");
      summary = await summarizeWithSambaNova(plainText, sambaNovaApiKey);
      usedModel = "sambanova/meta-llama-3.1-8b-instruct";
    } catch (error: any) {
      console.error("SambaNova lỗi rồi:", error);
    }
  } else {
    console.log("Không tìm thấy SAMBANOVA_API_KEY, bỏ qua...");
  }

  // 2. Nếu tạch thì qua Hugging Face
  if (!summary) {
    console.log("Chuyển sang Hugging Face fallback...");
    try {
      summary = await summarizeWithHuggingFace(plainText);
      usedModel = "huggingface/facebook-bart-large-cnn";
    } catch (error: any) {
      console.error("Hugging Face cũng lỗi nốt:", error);
      throw new Error("Không thể tạo tóm tắt. Cả 2 hệ thống AI đều đang bận hoặc lỗi. Thử lại sau nhé.");
    }
  }

  try {
    // Lưu vào cache để lần sau đỡ tốn tiền/thời gian
    await ctx.runMutation(internal.ai.cacheSummary, {
      documentId: args.documentId,
      userId,
      summary,
      contentHash,
      model: usedModel,
    });

    return {
      summary,
      fromCache: false,
      model: usedModel,
    };
  } catch (error: any) {
    console.error("Lỗi khi lưu cache:", error);
    // Vẫn trả về kết quả cho user dù không lưu được cache
    return {
      summary: summary!,
      fromCache: false,
      model: usedModel,
    };
  }
};

export const summarizeDocument = action({
  args: {
    documentId: v.id("documents"),
    forceRegenerate: v.optional(v.boolean()),
  },
  handler: summarizeDocumentHandler,
});

/**
 * Get cached summary (internal)
 */
export const getCachedSummary = internalQuery({
  args: {
    documentId: v.id("documents"),
    contentHash: v.string(),
  },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("aiSummaries")
      .withIndex("by_document_hash", (q) =>
        q.eq("documentId", args.documentId).eq("contentHash", args.contentHash)
      )
      .first();

    return cached;
  },
});

/**
 * Cache summary (internal)
 */
export const cacheSummary = internalMutation({
  args: {
    documentId: v.id("documents"),
    userId: v.string(),
    summary: v.string(),
    contentHash: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    // Delete old summaries for this document
    const oldSummaries = await ctx.db
      .query("aiSummaries")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();

    await Promise.all(oldSummaries.map((s) => ctx.db.delete(s._id)));

    // Insert new summary
    await ctx.db.insert("aiSummaries", {
      documentId: args.documentId,
      userId: args.userId,
      summary: args.summary,
      contentHash: args.contentHash,
      model: args.model,
      createdAt: Date.now(),
    });
  },
});

/**
 * Get summary for a document (query)
 */
export const getSummary = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const document = await ctx.runQuery(internal.documents.getByIdInternal, {
      documentId: args.documentId,
    });

    if (!document || document.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const summary = await ctx.db
      .query("aiSummaries")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .first();

    return summary;
  },
});

/**
 * Get all summaries for a document (internal)
 */
export const getAllSummariesForDocument = internalQuery({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const summaries = await ctx.db
      .query("aiSummaries")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();

    return summaries;
  },
});

/**
 * Delete a summary (internal)
 */
export const deleteSummary = internalMutation({
  args: { summaryId: v.id("aiSummaries") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.summaryId);
  },
});


// ========================================
// UC19: AI CHAT (CHAT VỚI TÀI LIỆU)
// ========================================

/**
 * Handler chat với tài liệu
 */
const chatWithAIHandler = async (
  ctx: any,
  args: { documentId: Id<"documents">; sessionId?: Id<"chatSessions">; message: string }
): Promise<{ sessionId: Id<"chatSessions">; response: string; model: string }> => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Chưa đăng nhập");
  }

  const userId = identity.subject;

  // Lấy tài liệu
  const document = await ctx.runQuery(internal.documents.getByIdInternal, {
    documentId: args.documentId,
  });

  if (!document || document.userId !== userId) {
    throw new Error("Không có quyền truy cập");
  }

  // Lấy hoặc tạo session mới
  let sessionId: Id<"chatSessions"> | undefined = args.sessionId;
  if (!sessionId) {
    sessionId = await ctx.runMutation(internal.ai.createChatSession, {
      userId,
      documentId: args.documentId,
    });
  }

  // Chắc chắn là có session ID
  if (!sessionId) {
    throw new Error("Không thể tạo phiên chat");
  }

  const finalSessionId: Id<"chatSessions"> = sessionId;

  // Lấy lịch sử chat
  const history = await ctx.runQuery(internal.ai.getChatHistory, {
    sessionId: finalSessionId,
  });

  // Lấy nội dung tài liệu làm context
  const documentContext = extractPlainText(document.content);

  // Hàm hỗ trợ lưu tin nhắn
  const saveMessages = async (userMsg: string, aiMsg: string, modelName: string) => {
    // Lưu tin nhắn user
    await ctx.runMutation(internal.ai.saveChatMessage, {
      sessionId: finalSessionId,
      role: "user",
      content: userMsg,
    });

    // Lưu tin nhắn AI
    await ctx.runMutation(internal.ai.saveChatMessage, {
      sessionId: finalSessionId,
      role: "assistant",
      content: aiMsg,
      model: modelName,
    });

    // Cập nhật thời gian update của session
    await ctx.runMutation(internal.ai.updateSessionTimestamp, {
      sessionId: finalSessionId,
    });
  };

  let response: string | null = null;
  let usedModel = "";

  // 1. Dùng SambaNova trước
  const sambaNovaApiKey = process.env.SAMBANOVA_API_KEY;
  if (sambaNovaApiKey) {
    try {
      console.log("Đang chat bằng SambaNova...");
      response = await chatWithSambaNova(args.message, documentContext, history, sambaNovaApiKey);
      usedModel = "sambanova/meta-llama-3.1-8b-instruct";
    } catch (error: any) {
      console.error("SambaNova chat lỗi:", error);
    }
  } else {
    console.log("Không có SAMBANOVA_API_KEY, bỏ qua...");
  }

  // 2. Chuyển sang Hugging Face nếu cần
  if (!response) {
    console.log("Chuyển sang Hugging Face fallback...");
    try {
      response = await chatWithHuggingFace(args.message, documentContext);
      usedModel = "huggingface/dialogpt";
    } catch (error: any) {
      console.error("Hugging Face chat cũng lỗi:", error);
      throw new Error("Không thể trả lời câu hỏi. Cả 2 hệ thống AI đều đang gặp vấn đề. Thử lại sau nhé.");
    }
  }

  // Lưu hội thoại
  await saveMessages(args.message, response!, usedModel);

  return {
    sessionId: finalSessionId,
    response: response!,
    model: usedModel,
  };
};

export const chatWithAI = action({
  args: {
    documentId: v.id("documents"),
    sessionId: v.optional(v.id("chatSessions")),
    message: v.string(),
  },
  handler: chatWithAIHandler,
});

/**
 * Create a new chat session (internal)
 */
export const createChatSession = internalMutation({
  args: {
    userId: v.string(),
    documentId: v.id("documents"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sessionId = await ctx.db.insert("chatSessions", {
      userId: args.userId,
      documentId: args.documentId,
      title: args.title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return sessionId;
  },
});

/**
 * Get chat history for a session (internal)
 */
export const getChatHistory = internalQuery({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_session_created", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return messages;
  },
});

/**
 * Save a chat message (internal)
 */
export const saveChatMessage = internalMutation({
  args: {
    sessionId: v.id("chatSessions"),
    role: v.string(),
    content: v.string(),
    model: v.optional(v.string()),
    tokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("chatMessages", {
      sessionId: args.sessionId,
      role: args.role,
      content: args.content,
      model: args.model,
      tokens: args.tokens,
      createdAt: Date.now(),
    });
  },
});

/**
 * Update session timestamp (internal)
 */
export const updateSessionTimestamp = internalMutation({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get chat sessions for a document
 */
export const getChatSessions = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const sessions = await ctx.db
      .query("chatSessions")
      .withIndex("by_user_document", (q) =>
        q.eq("userId", userId).eq("documentId", args.documentId)
      )
      .order("desc")
      .collect();

    // Get first message for each session to show preview
    const sessionsWithPreview = await Promise.all(
      sessions.map(async (session) => {
        const firstMessage = await ctx.db
          .query("chatMessages")
          .withIndex("by_session_created", (q) => q.eq("sessionId", session._id))
          .first();

        return {
          ...session,
          preview: firstMessage?.content.substring(0, 100) || "",
        };
      })
    );

    return sessionsWithPreview;
  },
});

/**
 * Get messages for a chat session
 */
export const getChatMessages = query({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_session_created", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return messages;
  },
});

/**
 * Delete a chat session
 */
export const deleteChatSession = mutation({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Delete all messages
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    await Promise.all(messages.map((msg) => ctx.db.delete(msg._id)));

    // Delete session
    await ctx.db.delete(args.sessionId);
  },
});

