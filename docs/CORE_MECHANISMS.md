# 🔬 CƠ CHẾ LÕI CỦA TẤT CẢ CHỨC NĂNG - PLMS

> **Tài liệu phân tích chi tiết cơ chế hoạt động của từng chức năng trong hệ thống**
> 
> Cập nhật: 22/12/2024

---

## 📋 Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [UC01-06: Authentication & User Management](#2-uc01-06-authentication--user-management)
3. [UC07-13: Document Management](#3-uc07-13-document-management)
4. [UC14: Table Management](#4-uc14-table-management)
5. [UC15: Schedule Management](#5-uc15-schedule-management)
6. [UC16: Calendar View](#6-uc16-calendar-view)
7. [UC17: Notifications](#7-uc17-notifications)
8. [UC18: AI Summarization](#8-uc18-ai-summarization)
9. [UC19: AI Chat](#9-uc19-ai-chat)
10. [Cơ chế chung](#10-cơ-chế-chung)

---

## 1. Tổng quan kiến trúc

### 1.1 Tech Stack Core

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                        │
├─────────────────────────────────────────────────────────┤
│  Next.js 13 (App Router) + React 18                     │
│  → Server Components + Client Components                │
│  → File-based routing                                   │
│  → Automatic code splitting                             │
└─────────────────────────────────────────────────────────┘
                         ↓ HTTPS
┌─────────────────────────────────────────────────────────┐
│                   BACKEND LAYER                          │
├─────────────────────────────────────────────────────────┤
│  Convex (Serverless Backend)                            │
│  → Query: Realtime data reads                           │
│  → Mutation: Data writes                                │
│  → Action: External API calls                           │
│  → Cron: Scheduled jobs                                 │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                       │
├─────────────────────────────────────────────────────────┤
│  • Clerk (Authentication)                               │
│  • EdgeStore (File Storage)                             │
│  • Gemini AI (Primary AI)                               │
│  • SambaNova (Fallback AI)                              │
│  • Hugging Face (Fallback AI)                           │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow Pattern

```typescript
// Pattern 1: QUERY (Realtime Read)
Component → useQuery() → Convex Client → Convex Server → Database
         ← Realtime Update ←            ←              ←

// Pattern 2: MUTATION (Write)
Component → useMutation() → Convex Client → Convex Server → Database
         ← Confirmation   ←               ←               ←

// Pattern 3: ACTION (External API)
Component → useAction() → Convex Client → Convex Server → External API
         ← Response     ←               ←               ← Response
```

---

## 2. UC01-06: Authentication & User Management

### 2.1 UC01: Đăng nhập

#### Cơ chế lõi: **Clerk JWT Authentication**

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │     │ Next.js  │     │  Clerk   │     │  Convex  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ 1. Click Login │                │                │
     │───────────────►│                │                │
     │                │ 2. Redirect    │                │
     │                │───────────────►│                │
     │                │                │                │
     │◄───────────────────────────────│                │
     │        3. Clerk UI              │                │
     │                                 │                │
     │ 4. Enter email/password         │                │
     │────────────────────────────────►│                │
     │                                 │ 5. Validate    │
     │                                 │────────────────│
     │                                 │                │
     │◄────────────────────────────────│                │
     │        6. JWT Token             │                │
     │                                 │                │
     │ 7. Redirect to /documents       │                │
     │───────────────►│                │                │
     │                │ 8. API call    │                │
     │                │   with JWT     │                │
     │                │────────────────────────────────►│
     │                │                │ 9. Verify JWT  │
     │                │                │◄───────────────│
     │                │                │                │
     │                │◄───────────────────────────────│
     │◄───────────────│   10. User Data                │
     │   11. Render   │                │                │
```

**Code Implementation:**

```typescript
// app/(marketing)/(routes)/sign-in/page.tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <SignIn 
      appearance={{
        elements: {
          // Custom styling
        }
      }}
      redirectUrl="/documents"
    />
  );
}

// Convex handler authentication check
handler: async (ctx, args) => {
  // 1. Get JWT identity from Clerk
  const identity = await ctx.auth.getUserIdentity();
  
  // 2. Check authentication
  if (!identity) {
    throw new Error("Not authenticated");
  }
  
  // 3. Extract userId
  const userId = identity.subject; // Clerk user ID
  
  // 4. Continue with business logic
  // ...
}
```

**Key Points:**
- ✅ **Stateless**: JWT-based, không cần session storage
- ✅ **Secure**: Token được sign bởi Clerk
- ✅ **Automatic**: Clerk tự động handle refresh token
- ✅ **Middleware**: Next.js middleware tự động protect routes

---

### 2.2 UC02: Đăng ký

#### Cơ chế lõi: **Clerk Signup + Convex Webhook Sync**

```typescript
// Flow:
User fills form → Clerk creates account → Webhook → Convex creates user record

// app/(marketing)/(routes)/sign-up/page.tsx
<SignUp
  appearance={{ /* custom */ }}
  redirectUrl="/documents"
  afterSignUpUrl="/documents"
/>

// Webhook handler (if needed for custom user data)
// convex/users.ts
export const createUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    fullName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      fullName: args.fullName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return userId;
  },
});
```

**Key Points:**
- ✅ **Validation**: Clerk handles email verification
- ✅ **Security**: Password hashing by Clerk
- ✅ **Sync**: User data synced to Convex via webhook (optional)

---

### 2.3 UC05: Cập nhật thông tin cá nhân

#### Cơ chế lõi: **Clerk UserProfile + Convex Sync**

```typescript
// app/(main)/(routes)/user-profile/page.tsx
import { UserProfile } from "@clerk/nextjs";

export default function UserProfilePage() {
  return (
    <UserProfile
      appearance={{ /* custom */ }}
      routing="path"
      path="/user-profile"
    />
  );
}

// Clerk automatically updates user data
// Optional: Sync to Convex for custom fields
export const updateUserProfile = mutation({
  args: {
    fullName: v.optional(v.string()),
    phone: v.optional(v.string()),
    gender: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    if (user) {
      await ctx.db.patch(user._id, {
        ...args,
        updatedAt: Date.now(),
      });
    }
  },
});
```

---

## 3. UC07-13: Document Management

### 3.1 Cơ chế Editor: **BlockNote (Block-based Editor)**

#### Architecture:

```
┌─────────────────────────────────────────────────────────┐
│                   BlockNote Editor                       │
├─────────────────────────────────────────────────────────┤
│  User Input (WYSIWYG)                                   │
│       ↓                                                  │
│  Block Structure (JSON)                                 │
│       ↓                                                  │
│  Convex Database (JSON string)                          │
│       ↓                                                  │
│  Render (HTML via BlockNoteView)                        │
└─────────────────────────────────────────────────────────┘
```

#### Code Implementation:

```typescript
// components/editor.tsx
import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";

const Editor = ({ onChange, initialContent, editable }: EditorProps) => {
  const editor: BlockNoteEditor = useBlockNote({
    editable,
    
    // 1. Parse initial content from JSON
    initialContent: initialContent
      ? (JSON.parse(initialContent) as PartialBlock[])
      : undefined,
    
    // 2. On change, serialize to JSON
    onEditorContentChange: (editor) => {
      onChange(JSON.stringify(editor.topLevelBlocks, null, 2));
    },
    
    // 3. File upload handler
    uploadFile: handleUpload,
  });

  return (
    <BlockNoteView
      editor={editor}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
    />
  );
};
```

**Data Structure Example:**

```json
[
  {
    "id": "block-1",
    "type": "heading",
    "props": {
      "level": 1,
      "textAlignment": "left"
    },
    "content": [
      {
        "type": "text",
        "text": "My Document Title",
        "styles": {}
      }
    ],
    "children": []
  },
  {
    "id": "block-2",
    "type": "paragraph",
    "props": {},
    "content": [
      {
        "type": "text",
        "text": "This is a paragraph with ",
        "styles": {}
      },
      {
        "type": "text",
        "text": "bold text",
        "styles": { "bold": true }
      }
    ],
    "children": []
  }
]
```

**Key Points:**
- ✅ **Format**: JSON (NOT Markdown)
- ✅ **Storage**: String in Convex database
- ✅ **Rendering**: HTML via BlockNoteView
- ✅ **Features**: Rich text, code blocks, images, tables, math (KaTeX)

---

### 3.2 UC07: Tạo trang mới

#### Cơ chế lõi: **Hierarchical Document Tree**

```typescript
// convex/documents.ts
export const create = mutation({
  args: {
    title: v.string(),
    parentDocument: v.optional(v.id("documents")),
    content: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;

    // Create document
    const document = await ctx.db.insert("documents", {
      title: args.title,
      parentDocument: args.parentDocument,
      content: args.content,
      icon: args.icon,
      userId,
      isArchived: false,
      isPublished: false,
    });

    return document;
  },
});
```

**Tree Structure:**

```
documents (userId: "user123")
├── Document A (_id: "doc1", parentDocument: undefined)
│   ├── Document A1 (_id: "doc2", parentDocument: "doc1")
│   └── Document A2 (_id: "doc3", parentDocument: "doc1")
├── Document B (_id: "doc4", parentDocument: undefined)
└── Document C (_id: "doc5", parentDocument: undefined)
```

**Query for Sidebar:**

```typescript
export const getSidebar = query({
  args: {
    parentDocument: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user_parent", (q) =>
        q
          .eq("userId", userId)
          .eq("parentDocument", args.parentDocument)
      )
      .filter((q) => q.eq(q.field("isArchived"), false))
      .order("desc")
      .collect();

    return documents;
  },
});
```

---

### 3.3 UC08-09: Cập nhật & Sửa nội dung

#### Cơ chế lõi: **Optimistic Updates + Debouncing**

```typescript
// Frontend: Optimistic update
const update = useMutation(api.documents.update);

// Debounced save (avoid too many API calls)
const debouncedUpdate = useMemo(
  () =>
    debounce((content: string) => {
      update({ id: documentId, content });
    }, 500),
  [update, documentId]
);

// On editor change
onEditorContentChange: (editor) => {
  const content = JSON.stringify(editor.topLevelBlocks, null, 2);
  debouncedUpdate(content); // Save after 500ms of no typing
}

// Backend: Simple update
export const update = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    // ... other fields
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { id, ...rest } = args;

    // Get existing document
    const existingDocument = await ctx.db.get(id);
    if (!existingDocument) throw new Error("Not found");
    if (existingDocument.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Update
    const document = await ctx.db.patch(id, rest);
    return document;
  },
});
```

**Key Points:**
- ✅ **Performance**: Debouncing reduces API calls
- ✅ **UX**: Optimistic updates for instant feedback
- ✅ **Security**: Authorization check before update

---

### 3.4 UC11-12: Xóa & Khôi phục (Soft Delete)

#### Cơ chế lõi: **Soft Delete with Recursive Operations**

```typescript
// Archive (Soft Delete)
export const archive = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;
    const existingDocument = await ctx.db.get(args.id);

    if (!existingDocument) throw new Error("Not found");
    if (existingDocument.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Recursive archive function
    const recursiveArchive = async (documentId: Id<"documents">) => {
      const children = await ctx.db
        .query("documents")
        .withIndex("by_user_parent", (q) =>
          q.eq("userId", userId).eq("parentDocument", documentId)
        )
        .collect();

      // Archive all children in parallel
      await Promise.all(
        children.map(async (child) => {
          await ctx.db.patch(child._id, { isArchived: true });
          await recursiveArchive(child._id); // Recursive call
        })
      );
    };

    // Archive the document
    const document = await ctx.db.patch(args.id, { isArchived: true });

    // Archive all children
    await recursiveArchive(args.id);

    return document;
  },
});

// Restore
export const restore = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    // Similar recursive logic
    // If parent is archived, detach from parent
    // Restore all children
  },
});

// Hard Delete
export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    // Recursive delete all children
    // Then delete the document
  },
});
```

**Soft Delete Benefits:**
- ✅ **Safety**: Can be restored
- ✅ **Audit**: Keep history
- ✅ **Performance**: Faster than hard delete

---

### 3.5 UC13: Tìm kiếm

#### Cơ chế lõi: **Vietnamese-aware Full-text Search**

```typescript
// Helper: Normalize Vietnamese (remove diacritics)
function normalizeVietnamese(str: string): string {
  const diacriticsMap: Record<string, string> = {
    'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
    'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
    'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
    // ... more mappings
  };
  
  return str
    .toLowerCase()
    .split('')
    .map(char => diacriticsMap[char] || char)
    .join('');
}

// Search query
export const searchDocuments = query({
  args: { search: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;

    // Get all user's documents
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isArchived"), false))
      .collect();

    // Normalize search query
    const normalizedSearch = normalizeVietnamese(args.search);

    // Filter by normalized title
    const filtered = documents.filter((doc) => {
      const normalizedTitle = normalizeVietnamese(doc.title);
      return normalizedTitle.includes(normalizedSearch);
    });

    return filtered;
  },
});
```

**Key Points:**
- ✅ **Vietnamese Support**: Diacritic-insensitive search
- ✅ **Performance**: Client-side filtering (for small datasets)
- ✅ **Future**: Can use Convex searchIndex for large datasets

---

## 4. UC14: Table Management

### 4.1 Cơ chế lõi: **Relational Table Structure**

#### Database Schema:

```
tables (1)
  ↓ has many
tableColumns (N)
  
tables (1)
  ↓ has many
tableRows (N)
  ↓ has many
tableCells (N)
  ↑ references
tableColumns (1)
```

**Example Data:**

```typescript
// Table
{
  _id: "table1",
  userId: "user123",
  title: "Student Grades",
  description: "Track student grades",
  createdAt: 1703000000000,
  updatedAt: 1703000000000
}

// Columns
[
  { _id: "col1", tableId: "table1", name: "Student Name", type: "text", order: 0 },
  { _id: "col2", tableId: "table1", name: "Math", type: "number", order: 1 },
  { _id: "col3", tableId: "table1", name: "English", type: "number", order: 2 },
]

// Rows
[
  { _id: "row1", tableId: "table1", order: 0, createdAt: 1703000000000 },
  { _id: "row2", tableId: "table1", order: 1, createdAt: 1703000000000 },
]

// Cells
[
  { _id: "cell1", rowId: "row1", columnId: "col1", value: "John Doe" },
  { _id: "cell2", rowId: "row1", columnId: "col2", value: "95" },
  { _id: "cell3", rowId: "row1", columnId: "col3", value: "88" },
  { _id: "cell4", rowId: "row2", columnId: "col1", value: "Jane Smith" },
  { _id: "cell5", rowId: "row2", columnId: "col2", value: "92" },
  { _id: "cell6", rowId: "row2", columnId: "col3", value: "95" },
]
```

#### Rendering Logic:

```typescript
// Frontend component
const TableEditor = ({ tableId }: { tableId: Id<"tables"> }) => {
  // 1. Fetch table data
  const table = useQuery(api.tables.getById, { tableId });
  const columns = useQuery(api.tables.getColumns, { tableId });
  const rows = useQuery(api.tables.getRows, { tableId });
  const cells = useQuery(api.tables.getCells, { tableId });

  // 2. Build cell map for O(1) lookup
  const cellMap = useMemo(() => {
    const map = new Map<string, string>();
    cells?.forEach(cell => {
      const key = `${cell.rowId}-${cell.columnId}`;
      map.set(key, cell.value);
    });
    return map;
  }, [cells]);

  // 3. Render table
  return (
    <table>
      <thead>
        <tr>
          {columns?.map(col => (
            <th key={col._id}>{col.name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows?.map(row => (
          <tr key={row._id}>
            {columns?.map(col => {
              const key = `${row._id}-${col._id}`;
              const value = cellMap.get(key) || "";
              return (
                <td key={key}>
                  <input
                    value={value}
                    onChange={(e) => updateCell(row._id, col._id, e.target.value)}
                  />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

**Key Points:**
- ✅ **Flexible**: Can add/remove columns dynamically
- ✅ **Scalable**: Normalized structure
- ✅ **Performance**: Cell map for O(1) lookup

---

## 5. UC15: Schedule Management

### 5.1 Cơ chế lõi: **Recurring Weekly Schedule**

#### Data Model:

```typescript
// schedules table
{
  _id: "schedule1",
  userId: "user123",
  subjectId: "doc1", // Optional link to document
  subjectName: "Calculus I",
  dayOfWeek: 1, // Monday (0=Sunday, 1=Monday, ..., 6=Saturday)
  startTime: "08:00",
  endTime: "09:30",
  room: "A101",
  teacher: "Dr. Smith",
  color: "#3b82f6", // Blue
  createdAt: 1703000000000,
  updatedAt: 1703000000000
}
```

#### Conflict Detection:

```typescript
// Check for schedule overlap
export const createSchedule = mutation({
  args: {
    subjectName: v.string(),
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    // ... other fields
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;

    // 1. Get all schedules for the same day
    const existingSchedules = await ctx.db
      .query("schedules")
      .withIndex("by_user_day", (q) =>
        q.eq("userId", userId).eq("dayOfWeek", args.dayOfWeek)
      )
      .collect();

    // 2. Check for time overlap
    const hasConflict = existingSchedules.some(schedule => {
      return timeRangesOverlap(
        args.startTime,
        args.endTime,
        schedule.startTime,
        schedule.endTime
      );
    });

    if (hasConflict) {
      throw new Error("Schedule conflict detected");
    }

    // 3. Create schedule
    const schedule = await ctx.db.insert("schedules", {
      userId,
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return schedule;
  },
});

// Helper function
function timeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);

  // Overlap if: start1 < end2 AND start2 < end1
  return s1 < e2 && s2 < e1;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
```

**Key Points:**
- ✅ **Recurring**: Weekly pattern (not individual dates)
- ✅ **Validation**: Conflict detection
- ✅ **Flexible**: Can link to document for notes

---

## 6. UC16: Calendar View

### 6.1 Cơ chế lõi: **Unified Calendar (Schedules + Events)**

#### Data Transformation:

```typescript
// Combine schedules and events for calendar view
const CalendarPage = () => {
  const schedules = useQuery(api.schedules.getAll);
  const events = useQuery(api.events.getAll);

  // Transform schedules to calendar events
  const calendarEvents = useMemo(() => {
    const result: CalendarEvent[] = [];

    // 1. Add one-time events
    events?.forEach(event => {
      result.push({
        id: event._id,
        title: event.title,
        start: new Date(event.startDate),
        end: new Date(event.endDate),
        allDay: event.allDay,
        resource: {
          type: 'event',
          data: event
        }
      });
    });

    // 2. Generate recurring schedule instances for current month
    const startOfMonth = startOfMonth(new Date());
    const endOfMonth = endOfMonth(new Date());

    schedules?.forEach(schedule => {
      // Generate instances for each week in the month
      let currentDate = startOfMonth;
      while (currentDate <= endOfMonth) {
        if (currentDate.getDay() === schedule.dayOfWeek) {
          const [startHour, startMin] = schedule.startTime.split(':').map(Number);
          const [endHour, endMin] = schedule.endTime.split(':').map(Number);

          const start = new Date(currentDate);
          start.setHours(startHour, startMin, 0, 0);

          const end = new Date(currentDate);
          end.setHours(endHour, endMin, 0, 0);

          result.push({
            id: `${schedule._id}-${currentDate.toISOString()}`,
            title: schedule.subjectName,
            start,
            end,
            allDay: false,
            resource: {
              type: 'schedule',
              data: schedule
            }
          });
        }
        currentDate = addDays(currentDate, 1);
      }
    });

    return result;
  }, [schedules, events]);

  return (
    <Calendar
      localizer={localizer}
      events={calendarEvents}
      startAccessor="start"
      endAccessor="end"
      style={{ height: 500 }}
    />
  );
};
```

**Key Points:**
- ✅ **Unified View**: Schedules + Events in one calendar
- ✅ **Performance**: Generate only visible instances
- ✅ **Flexibility**: Different colors for different types

---

## 7. UC17: Notifications

### 7.1 Cơ chế lõi: **Cron-based Notification Generation**

#### Architecture:

```
Cron Job (every hour)
  ↓
Check upcoming events (next 24 hours)
  ↓
Generate notifications
  ↓
Store in notifications table
  ↓
Frontend polls/subscribes to notifications
```

#### Implementation:

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run every hour
crons.hourly(
  "generate-event-reminders",
  { hourUTC: "*" }, // Every hour
  internal.notifications.generateEventReminders
);

export default crons;

// convex/notifications.ts
export const generateEventReminders = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const next24Hours = now + 24 * 60 * 60 * 1000;

    // 1. Get all events in next 24 hours
    const upcomingEvents = await ctx.db
      .query("events")
      .withIndex("by_start_date")
      .filter((q) =>
        q.and(
          q.gte(q.field("startDate"), now),
          q.lte(q.field("startDate"), next24Hours)
        )
      )
      .collect();

    // 2. For each event, check if notification already exists
    for (const event of upcomingEvents) {
      const existingNotification = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", event.userId))
        .filter((q) =>
          q.and(
            q.eq(q.field("relatedEventId"), event._id),
            q.eq(q.field("type"), "reminder")
          )
        )
        .first();

      // 3. Create notification if not exists
      if (!existingNotification) {
        // Calculate reminder time based on event.reminder
        const reminderTime = event.reminder
          ? event.startDate - event.reminder * 60 * 1000
          : event.startDate - 20 * 60 * 60 * 1000; // Default: 20 hours before

        // Only create if reminder time is in the past (should notify now)
        if (reminderTime <= now) {
          await ctx.db.insert("notifications", {
            userId: event.userId,
            type: "reminder",
            title: `Sắp tới: ${event.title}`,
            message: `Sự kiện "${event.title}" sẽ diễn ra vào ${new Date(event.startDate).toLocaleString('vi-VN')}`,
            isRead: false,
            relatedEventId: event._id,
            actionUrl: `/calendar`,
            priority: "high",
            createdAt: Date.now(),
          });
        }
      }
    }
  },
});

// Frontend: Subscribe to notifications
const NotificationBell = () => {
  const notifications = useQuery(api.notifications.getUnread);
  const unreadCount = notifications?.length || 0;

  return (
    <button>
      <Bell />
      {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
    </button>
  );
};
```

**Key Points:**
- ✅ **Automated**: Cron job generates notifications
- ✅ **Realtime**: Convex subscriptions for instant updates
- ✅ **Flexible**: Custom reminder times per event

---

## 8. UC18: AI Summarization

### 8.1 Cơ chế lõi: **AI Action with Caching**

#### Architecture:

```
User clicks "Summarize"
  ↓
Check cache (by contentHash)
  ↓
If cached → Return cached summary
  ↓
If not cached:
  ↓
Call AI API (Gemini → SambaNova → Hugging Face)
  ↓
Store in cache
  ↓
Return summary
```

#### Implementation:

```typescript
// convex/ai.ts
export const summarizeDocument = action({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    // 1. Get document
    const document = await ctx.runQuery(
      internal.documents.getByIdInternal,
      { documentId: args.documentId }
    );

    if (!document) throw new Error("Document not found");

    // 2. Calculate content hash
    const contentHash = hashContent(document.content || "");

    // 3. Check cache
    const cached = await ctx.runQuery(
      internal.ai.getCachedSummary,
      { documentId: args.documentId, contentHash }
    );

    if (cached) {
      return { summary: cached.summary, fromCache: true };
    }

    // 4. Extract text from BlockNote JSON
    const text = extractTextFromBlockNote(document.content || "");

    if (!text || text.length < 50) {
      throw new Error("Document too short to summarize");
    }

    // 5. Call AI with fallback
    let summary: string;
    let model: string;

    try {
      // Try Gemini first
      summary = await callGeminiAPI(text);
      model = "gemini-pro";
    } catch (error) {
      console.error("Gemini failed, trying SambaNova:", error);
      try {
        summary = await callSambaNovaAPI(text);
        model = "sambanova";
      } catch (error2) {
        console.error("SambaNova failed, trying Hugging Face:", error2);
        summary = await callHuggingFaceAPI(text);
        model = "huggingface";
      }
    }

    // 6. Cache the result
    await ctx.runMutation(internal.ai.cacheSummary, {
      documentId: args.documentId,
      userId: document.userId,
      summary,
      contentHash,
      model,
    });

    return { summary, fromCache: false };
  },
});

// Helper: Extract text from BlockNote JSON
function extractTextFromBlockNote(content: string): string {
  try {
    const blocks = JSON.parse(content);
    let text = "";

    const extractFromBlock = (block: any) => {
      if (block.content) {
        block.content.forEach((item: any) => {
          if (item.type === "text") {
            text += item.text + " ";
          }
        });
      }
      if (block.children) {
        block.children.forEach(extractFromBlock);
      }
    };

    blocks.forEach(extractFromBlock);
    return text.trim();
  } catch {
    return "";
  }
}

// Helper: Hash content for cache key
function hashContent(content: string): string {
  // Simple hash (in production, use crypto.subtle.digest)
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}
```

**Key Points:**
- ✅ **Caching**: Avoid redundant API calls
- ✅ **Fallback**: Multiple AI providers
- ✅ **Performance**: Content hash for cache invalidation

---

## 9. UC19: AI Chat

### 9.1 Cơ chế lõi: **Conversational AI with Context**

#### Architecture:

```
User sends message
  ↓
Create/Get chat session
  ↓
Add user message to session
  ↓
Build context (document content + chat history)
  ↓
Call AI API
  ↓
Add AI response to session
  ↓
Return response
```

#### Implementation:

```typescript
// convex/ai.ts
export const chatWithDocument = action({
  args: {
    documentId: v.id("documents"),
    sessionId: v.optional(v.id("chatSessions")),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;

    // 1. Get or create session
    let sessionId = args.sessionId;
    if (!sessionId) {
      sessionId = await ctx.runMutation(internal.ai.createChatSession, {
        userId,
        documentId: args.documentId,
        title: args.message.substring(0, 50), // First message as title
      });
    }

    // 2. Add user message
    await ctx.runMutation(internal.ai.addChatMessage, {
      sessionId,
      role: "user",
      content: args.message,
    });

    // 3. Get document content
    const document = await ctx.runQuery(
      internal.documents.getByIdInternal,
      { documentId: args.documentId }
    );

    // 4. Get chat history
    const history = await ctx.runQuery(internal.ai.getChatHistory, {
      sessionId,
    });

    // 5. Build context
    const documentText = extractTextFromBlockNote(document?.content || "");
    const context = `Document: ${document?.title}\n\n${documentText}`;

    // 6. Build messages for AI
    const messages = [
      {
        role: "system",
        content: `You are a helpful assistant. Answer questions based on this document:\n\n${context}`,
      },
      ...history.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: "user",
        content: args.message,
      },
    ];

    // 7. Call AI
    let response: string;
    let model: string;

    try {
      response = await callGeminiChat(messages);
      model = "gemini-pro";
    } catch (error) {
      console.error("Gemini failed, trying SambaNova:", error);
      response = await callSambaNovaChat(messages);
      model = "sambanova";
    }

    // 8. Add AI response
    await ctx.runMutation(internal.ai.addChatMessage, {
      sessionId,
      role: "assistant",
      content: response,
      model,
    });

    return {
      sessionId,
      response,
    };
  },
});
```

**Key Points:**
- ✅ **Context-aware**: Uses document content
- ✅ **History**: Maintains conversation context
- ✅ **Streaming**: Can be enhanced with streaming responses

---

## 10. Cơ chế chung

### 10.1 File Upload (EdgeStore)

```typescript
// lib/edgestore.ts
import { createEdgeStoreProvider } from "@edgestore/react";

const { EdgeStoreProvider, useEdgeStore } = createEdgeStoreProvider();

// Usage in component
const { edgestore } = useEdgeStore();

const handleUpload = async (file: File) => {
  const response = await edgestore.publicFiles.upload({
    file,
    onProgressChange: (progress) => {
      setUploadProgress(progress);
    },
  });
  
  return response.url; // https://files.edgestore.dev/...
};
```

**Key Points:**
- ✅ **CDN**: Fast file delivery
- ✅ **Progress**: Upload progress tracking
- ✅ **Security**: Signed URLs

---

### 10.2 Realtime Updates (Convex)

```typescript
// Automatic realtime updates
const document = useQuery(api.documents.getById, { documentId });

// When document changes in database:
// 1. Convex server detects change
// 2. Pushes update to all subscribed clients
// 3. React re-renders automatically

// No need for:
// - Manual polling
// - WebSocket setup
// - Cache invalidation
```

**Key Points:**
- ✅ **Automatic**: No manual setup
- ✅ **Efficient**: Only sends diffs
- ✅ **Scalable**: Handles many concurrent users

---

### 10.3 Authentication Flow

```typescript
// Middleware (automatic route protection)
// middleware.ts
import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: ["/", "/sign-in", "/sign-up"],
});

// In Convex handler
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");

const userId = identity.subject; // Clerk user ID
```

**Key Points:**
- ✅ **Middleware**: Automatic route protection
- ✅ **JWT**: Stateless authentication
- ✅ **Convex Integration**: Seamless auth check

---

## 📊 Performance Considerations

### Database Indexes

```typescript
// Optimized queries with indexes
documents: defineTable({ ... })
  .index("by_user", ["userId"])
  .index("by_user_parent", ["userId", "parentDocument"])
  .index("by_user_archived", ["userId", "isArchived"])

// Query uses index automatically
const docs = await ctx.db
  .query("documents")
  .withIndex("by_user_parent", (q) =>
    q.eq("userId", userId).eq("parentDocument", parentId)
  )
  .collect();
```

### Caching Strategy

1. **AI Summaries**: Cache by content hash
2. **Chat Sessions**: Store full history
3. **Notifications**: Pre-generate with cron

### Optimization Techniques

1. **Debouncing**: Editor auto-save
2. **Optimistic Updates**: Instant UI feedback
3. **Lazy Loading**: Dynamic imports
4. **Code Splitting**: Route-based chunks

---

## 🔐 Security Measures

1. **Authentication**: Clerk JWT
2. **Authorization**: User ID check in every handler
3. **Input Validation**: Convex validators
4. **XSS Protection**: React auto-escaping
5. **CSRF Protection**: Next.js built-in

---

## 🎯 Kết luận

Hệ thống PLMS sử dụng kiến trúc hiện đại với:

- ✅ **Serverless Backend**: Convex (auto-scaling, realtime)
- ✅ **Rich Text Editor**: BlockNote (JSON-based)
- ✅ **Authentication**: Clerk (secure, easy)
- ✅ **File Storage**: EdgeStore (CDN, fast)
- ✅ **AI Integration**: Multi-provider fallback
- ✅ **Realtime**: Automatic updates
- ✅ **Performance**: Optimized queries, caching

Mỗi chức năng được thiết kế với:
- **Scalability**: Có thể mở rộng
- **Maintainability**: Dễ bảo trì
- **User Experience**: Trải nghiệm tốt
- **Security**: An toàn

---

*Tài liệu này cung cấp cái nhìn sâu về cơ chế lõi của từng chức năng. Để hiểu chi tiết hơn, vui lòng xem source code tương ứng.*
