import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Id } from "./_generated/dataModel";

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Extract plain text from BlockNote JSON content
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
 * Hash content using SHA-256
 */
function hashContent(content: string): string {
  // Simple hash function (Convex doesn't have crypto module)
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// ========================================
// UC18: AI SUMMARY
// ========================================

/**
 * Summarize a document using Gemini AI
 */
const summarizeDocumentHandler = async (
  ctx: any,
  args: { documentId: Id<"documents">; forceRegenerate?: boolean }
): Promise<{ summary: string; fromCache: boolean; model: string }> => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const userId = identity.subject;

  // Get document
  const document = await ctx.runQuery(internal.documents.getByIdInternal, {
    documentId: args.documentId,
  });

  if (!document || document.userId !== userId) {
    throw new Error("Unauthorized");
  }

  // Extract plain text from BlockNote content
  const plainText = extractPlainText(document.content);

  if (!plainText || plainText.length < 100) {
    throw new Error("Content too short to summarize (minimum 100 characters)");
  }

  // Calculate content hash
  const contentHash = hashContent(plainText);

  // Check cache if not forcing regeneration
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

  // Get Gemini API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  // Call Gemini API
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Try different models in order of preference
  // Free tier models first, then paid tier
  // Note: Use simple model names - version numbers may not work
  const modelsToTry = [
    "gemini-1.5-flash",         // Free tier - most common ✅
    "gemini-1.5-pro",           // Free tier - better quality ✅
    "gemini-2.0-flash-exp",    // Free tier - experimental
    "gemini-3-pro-preview",     // Preview (may require paid)
    "gemini-3-pro",             // Latest 3.0 (may require paid)
    "gemini-2.5-pro",           // Requires paid tier ❌
  ];
  
  const prompt = `Hãy tóm tắt nội dung sau một cách ngắn gọn và súc tích (khoảng 3-5 câu):

${plainText}

Tóm tắt:`;

  // Try each model until one works
  let summary: string | null = null;
  let usedModel = modelsToTry[0];
  let lastError: any = null;
  
  for (const modelName of modelsToTry) {
    try {
      const testModel = genAI.getGenerativeModel({ model: modelName });
      const result = await testModel.generateContent(prompt);
      const response = await result.response;
      summary = response.text();
      usedModel = modelName;
      break;
    } catch (err: any) {
      console.error(`Model ${modelName} failed:`, err.message);
      lastError = err;
      if (err.status === 404 || err.status === 429) {
        // 404: Model not found, 429: Quota exceeded - Try next model
        if (err.status === 429) {
          console.error(`Model ${modelName} quota exceeded, trying next model...`);
        }
        continue;
      }
      // Other errors, throw
      throw err;
    }
  }
  
  if (!summary) {
    // Provide helpful error message
    const errorMsg = lastError?.message || "Unknown error";
    if (errorMsg.includes("404") || errorMsg.includes("not found")) {
      throw new Error(`No available Gemini models found. Please check your API key and ensure Generative AI API is enabled. Tried models: ${modelsToTry.join(", ")}`);
    }
    if (errorMsg.includes("429") || errorMsg.includes("quota")) {
      throw new Error(`All models exceeded quota. Please wait and try again later, or upgrade to paid tier. Last error: ${errorMsg.substring(0, 200)}`);
    }
    throw new Error(`All models failed. Last error: ${errorMsg.substring(0, 200)}`);
  }

  try {
    // Cache the result
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
      console.error("Gemini API error:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        code: error.code,
      });

      // Check for specific error types
      if (error.message?.includes("quota") || error.message?.includes("429") || error.status === 429) {
        // Check if it's a specific model quota issue
        if (error.message?.includes("gemini-2.5-pro")) {
          throw new Error("Model gemini-2.5-pro requires paid tier. Code will auto-fallback to free tier models.");
        }
        throw new Error("API quota exceeded. Please try again later or use a different model.");
      }

      if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("401") || error.status === 401) {
        throw new Error("Invalid API key. Please check your GEMINI_API_KEY configuration.");
      }

      if (error.message?.includes("403") || error.status === 403) {
        throw new Error("API access forbidden. Please check your API key permissions.");
      }

      // Return more detailed error message
      const errorMessage = error.message || "Unknown error";
      throw new Error(`Failed to generate summary: ${errorMessage}. Please check your API key and quota.`);
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

// ========================================
// UC19: AI CHAT
// ========================================

/**
 * Chat with AI about a document
 */
const chatWithAIHandler = async (
  ctx: any,
  args: { documentId: Id<"documents">; sessionId?: Id<"chatSessions">; message: string }
): Promise<{ sessionId: Id<"chatSessions">; response: string; model: string }> => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const userId = identity.subject;

  // Get document
  const document = await ctx.runQuery(internal.documents.getByIdInternal, {
    documentId: args.documentId,
  });

  if (!document || document.userId !== userId) {
    throw new Error("Unauthorized");
  }

  // Get or create session
  let sessionId: Id<"chatSessions"> | undefined = args.sessionId;
  if (!sessionId) {
    sessionId = await ctx.runMutation(internal.ai.createChatSession, {
      userId,
      documentId: args.documentId,
    });
  }
  
  // Ensure sessionId is defined
  if (!sessionId) {
    throw new Error("Failed to create chat session");
  }
  
  // Now sessionId is guaranteed to be defined
  const finalSessionId: Id<"chatSessions"> = sessionId;

  // Get conversation history
  const history = await ctx.runQuery(internal.ai.getChatHistory, {
    sessionId: finalSessionId,
  });

  // Extract document content as context
  const documentContext = extractPlainText(document.content);

  // Get Gemini API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  // Build conversation for Gemini
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Try different models in order of preference
  // Free tier models first, then paid tier
  // Note: Use simple model names without version numbers
  const modelsToTry = [
    "gemini-1.5-flash",         // Free tier - most common
    "gemini-1.5-pro",           // Free tier - better quality
    "gemini-2.0-flash-exp",    // Free tier - experimental
    "gemini-3-pro-preview",     // Preview (may require paid)
    "gemini-3-pro",             // Latest 3.0 (may require paid)
    "gemini-2.5-pro",           // Requires paid tier
  ];
  let usedModel = modelsToTry[0];

  // Try to create chat with available model
  let chat: any = null;
  for (const modelName of modelsToTry) {
    try {
      const testModel = genAI.getGenerativeModel({ model: modelName });
      chat = testModel.startChat({
        history: [
          {
            role: "user",
            parts: [
              {
                text: `Đây là nội dung tài liệu:\n\n${documentContext}\n\nHãy trả lời các câu hỏi dựa trên nội dung này.`,
              },
            ],
          },
          {
            role: "model",
            parts: [
              {
                text: "Tôi đã hiểu nội dung tài liệu. Bạn có thể hỏi tôi bất kỳ câu hỏi nào về nội dung này.",
              },
            ],
          },
          ...history.map((msg: { role: string; content: string }) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }],
          })),
        ],
      });
      usedModel = modelName;
      break;
    } catch (err: any) {
      if (err.status === 404 || err.status === 429) {
        // 404: Model not found, 429: Quota exceeded - Try next model
        if (err.status === 429) {
          console.error(`Model ${modelName} quota exceeded, trying next model...`);
        }
        continue; // Try next model
      }
      throw err;
    }
  }
  
  if (!chat) {
    throw new Error(`No available Gemini models found. Please check your API key and ensure Generative AI API is enabled. Tried models: ${modelsToTry.join(", ")}`);
  }

  // Save user message
  await ctx.runMutation(internal.ai.saveChatMessage, {
    sessionId: finalSessionId,
    role: "user",
    content: args.message,
  });

  try {
    // Send message and get response
    const result = await chat.sendMessage(args.message);
    const response = await result.response;
    const text = response.text();

    // Save assistant message
    await ctx.runMutation(internal.ai.saveChatMessage, {
      sessionId: finalSessionId,
      role: "assistant",
      content: text,
      model: "gemini-1.5-flash",
    });

    // Update session timestamp
    await ctx.runMutation(internal.ai.updateSessionTimestamp, {
      sessionId: finalSessionId,
    });

    return {
      sessionId: finalSessionId,
      response: text,
      model: "gemini-1.5-flash",
    };
    } catch (error: any) {
      console.error("Gemini chat error:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        code: error.code,
      });

      // Check for specific error types
      if (error.message?.includes("quota") || error.message?.includes("429") || error.status === 429) {
        // Check if it's a specific model quota issue
        if (error.message?.includes("gemini-2.5-pro")) {
          throw new Error("Model gemini-2.5-pro requires paid tier. Code will auto-fallback to free tier models.");
        }
        throw new Error("API quota exceeded. Please try again later or use a different model.");
      }

      if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("401") || error.status === 401) {
        throw new Error("Invalid API key. Please check your GEMINI_API_KEY configuration.");
      }

      if (error.message?.includes("403") || error.status === 403) {
        throw new Error("API access forbidden. Please check your API key permissions.");
      }

      // Return more detailed error message
      const errorMessage = error.message || "Unknown error";
      throw new Error(`Failed to get response: ${errorMessage}. Please check your API key and quota.`);
    }
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

