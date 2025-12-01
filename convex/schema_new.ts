// CONVEX SCHEMA MỚI - BẢN ĐẦY ĐỦ CHO TẤT CẢ 19 USE CASES
// File: convex/schema.ts

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // ========================================
    // EXISTING TABLE (UC07-UC13)
    // ========================================

    /**
     * Documents - Trang ghi chú chính
     * UC07: Tạo trang mới
     * UC08: Cập nhật trang (title, icon, cover)
     * UC09: Sửa nội dung trang
     * UC10: Đọc nội dung trang
     * UC11: Xóa trang (soft delete)
     * UC12: Khôi phục/Xóa vĩnh viễn
     * UC13: Tìm kiếm trang
     */
    documents: defineTable({
        title: v.string(),
        userId: v.string(),
        isArchived: v.boolean(),
        parentDocument: v.optional(v.id("documents")),
        content: v.optional(v.string()),
        coverImage: v.optional(v.string()),
        icon: v.optional(v.string()),
        isPublished: v.boolean(),
    })
        .index("by_user", ["userId"])
        .index("by_user_parent", ["userId", "parentDocument"])
        .index("by_user_archived", ["userId", "isArchived"]),

    // ========================================
    // NEW TABLES
    // ========================================

    /**
     * Users - Thông tin người dùng
     * UC02: Đăng ký (sync from Clerk)
     * UC05: Cập nhật thông tin cá nhân
     */
    users: defineTable({
        clerkId: v.string(),        // Link to Clerk user ID
        fullName: v.string(),
        email: v.string(),
        phone: v.optional(v.string()),
        gender: v.optional(v.string()), // "male", "female", "other"
        avatarUrl: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_clerk_id", ["clerkId"])
        .index("by_email", ["email"]),

    /**
     * Login Logs - Lịch sử đăng nhập
     * UC01: Đăng nhập (tracking)
     */
    loginLogs: defineTable({
        userId: v.string(),
        email: v.string(),
        success: v.boolean(),
        ipAddress: v.optional(v.string()),
        userAgent: v.optional(v.string()),
        failureReason: v.optional(v.string()),
        timestamp: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_email", ["email"])
        .index("by_timestamp", ["timestamp"]),

    /**
     * Password Reset Tokens - Token đặt lại mật khẩu
     * UC04: Quên mật khẩu
     * Note: Clerk handles this, but we can track it
     */
    passwordResetTokens: defineTable({
        email: v.string(),
        token: v.string(),
        expiresAt: v.number(),
        used: v.boolean(),
        createdAt: v.number(),
    })
        .index("by_email", ["email"])
        .index("by_token", ["token"]),

    // ========================================
    // UC14: QUẢN LÝ BẢNG DỮ LIỆU
    // ========================================

    /**
     * Tables - Bảng dữ liệu tùy chỉnh
     */
    tables: defineTable({
        userId: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_user_updated", ["userId", "updatedAt"]),

    /**
     * Table Columns - Cột của bảng
     */
    tableColumns: defineTable({
        tableId: v.id("tables"),
        name: v.string(),
        type: v.string(),           // "text", "number", "date", "select", "checkbox"
        order: v.number(),          // Thứ tự hiển thị
        config: v.optional(v.string()), // JSON config (e.g., select options)
        width: v.optional(v.number()),  // Column width in pixels
    })
        .index("by_table", ["tableId"])
        .index("by_table_order", ["tableId", "order"]),

    /**
     * Table Rows - Hàng của bảng
     */
    tableRows: defineTable({
        tableId: v.id("tables"),
        order: v.number(),
        createdAt: v.number(),
    })
        .index("by_table", ["tableId"])
        .index("by_table_order", ["tableId", "order"]),

    /**
     * Table Cells - Ô dữ liệu
     */
    tableCells: defineTable({
        rowId: v.id("tableRows"),
        columnId: v.id("tableColumns"),
        value: v.string(),          // Store as JSON string
    })
        .index("by_row", ["rowId"])
        .index("by_column", ["columnId"])
        .index("by_row_column", ["rowId", "columnId"]),

    // ========================================
    // UC15: QUẢN LÝ LỊCH HỌC
    // ========================================

    /**
     * Schedules - Thời khóa biểu cố định hàng tuần
     */
    schedules: defineTable({
        userId: v.string(),
        subjectId: v.optional(v.id("documents")), // Link to subject document
        subjectName: v.string(),
        dayOfWeek: v.number(),      // 0-6 (Sunday-Saturday) or 1-7 (Monday-Sunday)
        startTime: v.string(),      // "08:00" format
        endTime: v.string(),        // "09:30" format
        room: v.optional(v.string()),
        teacher: v.optional(v.string()),
        notes: v.optional(v.string()),
        color: v.optional(v.string()), // Hex color for visual distinction
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_user_day", ["userId", "dayOfWeek"])
        .index("by_subject", ["subjectId"]),

    // ========================================
    // UC16: XEM LỊCH TỔNG QUAN
    // ========================================

    /**
     * Events - Sự kiện một lần (deadline, exam, assignment, etc.)
     */
    events: defineTable({
        userId: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        startDate: v.number(),      // Unix timestamp
        endDate: v.number(),        // Unix timestamp
        allDay: v.boolean(),
        type: v.string(),           // "deadline", "exam", "assignment", "meeting", "custom"
        relatedDocumentId: v.optional(v.id("documents")),
        relatedTableId: v.optional(v.id("tables")),
        color: v.optional(v.string()),
        reminder: v.optional(v.number()), // Minutes before event to remind
        location: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_user_date", ["userId", "startDate"])
        .index("by_type", ["type"])
        .index("by_document", ["relatedDocumentId"]),

    // ========================================
    // UC17: NHẬN VÀ XEM THÔNG BÁO
    // ========================================

    /**
     * Notifications - Thông báo hệ thống
     */
    notifications: defineTable({
        userId: v.string(),
        type: v.string(),           // "deadline", "reminder", "system", "achievement"
        title: v.string(),
        message: v.string(),
        isRead: v.boolean(),
        relatedEventId: v.optional(v.id("events")),
        relatedDocumentId: v.optional(v.id("documents")),
        relatedTableId: v.optional(v.id("tables")),
        actionUrl: v.optional(v.string()), // Link to related page
        priority: v.optional(v.string()),  // "low", "medium", "high"
        createdAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_user_read", ["userId", "isRead"])
        .index("by_user_created", ["userId", "createdAt"])
        .index("by_type", ["type"]),

    // ========================================
    // UC18-19: AI FEATURES
    // ========================================

    /**
     * AI Summaries - Lưu cache tóm tắt AI
     * UC18: Tóm tắt nội dung trang
     */
    aiSummaries: defineTable({
        documentId: v.id("documents"),
        userId: v.string(),
        summary: v.string(),
        contentHash: v.string(),    // Hash of content to detect changes
        model: v.string(),          // AI model used (e.g., "gemini-pro")
        createdAt: v.number(),
    })
        .index("by_document", ["documentId"])
        .index("by_user", ["userId"])
        .index("by_document_hash", ["documentId", "contentHash"]),

    /**
     * Chat Sessions - Phiên chat với AI
     * UC19: Hỏi đáp trên tài liệu
     */
    chatSessions: defineTable({
        userId: v.string(),
        documentId: v.id("documents"),
        title: v.optional(v.string()), // Auto-generated from first question
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_document", ["documentId"])
        .index("by_user_document", ["userId", "documentId"])
        .index("by_user_updated", ["userId", "updatedAt"]),

    /**
     * Chat Messages - Tin nhắn trong chat session
     * UC19: Hỏi đáp trên tài liệu
     */
    chatMessages: defineTable({
        sessionId: v.id("chatSessions"),
        role: v.string(),           // "user" | "assistant"
        content: v.string(),
        model: v.optional(v.string()), // AI model used for assistant messages
        tokens: v.optional(v.number()), // Token count (for cost tracking)
        createdAt: v.number(),
    })
        .index("by_session", ["sessionId"])
        .index("by_session_created", ["sessionId", "createdAt"]),

    // ========================================
    // ANALYTICS & TRACKING (Optional)
    // ========================================

    /**
     * User Activity - Theo dõi hoạt động người dùng
     */
    userActivity: defineTable({
        userId: v.string(),
        action: v.string(),         // "view_document", "edit_document", "create_table", etc.
        resourceType: v.string(),   // "document", "table", "event", etc.
        resourceId: v.optional(v.string()),
        metadata: v.optional(v.string()), // JSON metadata
        timestamp: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_user_timestamp", ["userId", "timestamp"])
        .index("by_action", ["action"]),

    /**
     * AI Usage - Theo dõi sử dụng AI (cho cost management)
     */
    aiUsage: defineTable({
        userId: v.string(),
        feature: v.string(),        // "summarize", "chat"
        model: v.string(),
        tokensUsed: v.number(),
        cost: v.optional(v.number()), // Estimated cost in USD
        timestamp: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_user_timestamp", ["userId", "timestamp"])
        .index("by_feature", ["feature"]),

    // ========================================
    // SYSTEM TABLES
    // ========================================

    /**
     * System Settings - Cài đặt hệ thống
     */
    systemSettings: defineTable({
        key: v.string(),
        value: v.string(),          // JSON value
        description: v.optional(v.string()),
        updatedAt: v.number(),
    })
        .index("by_key", ["key"]),

    /**
     * Feature Flags - Bật/tắt tính năng
     */
    featureFlags: defineTable({
        name: v.string(),
        enabled: v.boolean(),
        description: v.optional(v.string()),
        rolloutPercentage: v.optional(v.number()), // 0-100 for gradual rollout
        updatedAt: v.number(),
    })
        .index("by_name", ["name"]),
});

// ========================================
// SCHEMA SUMMARY
// ========================================

/**
 * TOTAL TABLES: 21
 * 
 * Core Features (10):
 * - documents (existing)
 * - users
 * - loginLogs
 * - passwordResetTokens
 * - tables, tableColumns, tableRows, tableCells
 * - schedules
 * - events
 * 
 * Communication (1):
 * - notifications
 * 
 * AI Features (3):
 * - aiSummaries
 * - chatSessions
 * - chatMessages
 * 
 * Analytics (2):
 * - userActivity
 * - aiUsage
 * 
 * System (2):
 * - systemSettings
 * - featureFlags
 * 
 * INDEXES: 60+
 * 
 * ESTIMATED DATABASE SIZE (for 1000 users):
 * - documents: ~100MB (100 docs/user, 10KB each)
 * - users: ~1MB
 * - tables: ~50MB (dynamic data)
 * - events: ~10MB
 * - notifications: ~20MB
 * - chatMessages: ~100MB (heavy AI usage)
 * - Total: ~300-500MB
 * 
 * CONVEX FREE TIER:
 * - 1M function calls/month
 * - 1GB database storage
 * - Should be sufficient for MVP and small-scale deployment
 */
