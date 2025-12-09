# 🚀 QUICK START GUIDE - Implementation

**Mục đích:** Hướng dẫn nhanh để bắt đầu implement các use cases

---

## 📋 PRE-IMPLEMENTATION CHECKLIST

### ✅ Bước 1: Review Documentation

- [ ] Đọc `REVIEW_AND_FIXES.md` - Hiểu rõ vấn đề
- [ ] Đọc `CRITICAL_FIXES.md` - Biết cách fix UC14 & UC19
- [ ] Chọn approach: Sequential / Parallel / Priority-based

### ✅ Bước 2: Setup Environment

```bash
# 1. Install dependencies
npm install @tanstack/react-table papaparse @types/papaparse react-big-calendar date-fns @google/generative-ai

# 2. Get Gemini API key
# Visit: https://makersuite.google.com/app/apikey
# Copy key

# 3. Add to .env.local
echo "GEMINI_API_KEY=your_key_here" >> .env.local
```

### ✅ Bước 3: Migrate Schema

```bash
# Backup current schema
cp convex/schema.ts convex/schema_backup.ts

# Replace with new schema
cp convex/schema_new.ts convex/schema.ts

# Deploy to Convex
npx convex dev
```

### ✅ Bước 4: Verify Migration

1. Open Convex dashboard: https://dashboard.convex.dev
2. Check that all 21 tables are created
3. Test existing documents still work
4. Check indexes are created

---

## 🎯 RECOMMENDED IMPLEMENTATION ORDER

### Option A: Priority-based (Recommended)

**Week 1-2: High Priority**
- UC15: Quản lý lịch học (1 tuần)
- UC16: Xem lịch tổng quan (1 tuần)

**Week 3: Medium Priority**
- UC17: Thông báo (1 tuần)

**Week 4-6: Low Priority**
- UC14: Quản lý bảng (1.5 tuần)
- UC18: Tóm tắt AI (3-4 ngày)
- UC19: Hỏi đáp AI (1 tuần)

**Total: 6 tuần**

### Option B: Sequential (Safer)

1. UC14 (1.5 tuần)
2. UC15 (1 tuần)
3. UC16 (1.5 tuần)
4. UC17 (1 tuần)
5. UC18 (3-4 ngày)
6. UC19 (1 tuần)

**Total: 8 tuần**

---

## 📝 IMPLEMENTATION TEMPLATE

### For each Use Case:

#### 1. Backend (Days 1-3)

```bash
# Create API file
touch convex/[feature].ts

# Implement mutations/queries
# - Create
# - Read
# - Update
# - Delete
# - List

# Test in Convex dashboard
```

#### 2. Frontend (Days 4-7)

```bash
# Create components directory
mkdir -p app/(main)/(routes)/[feature]/_components

# Create components
touch app/(main)/(routes)/[feature]/_components/[component].tsx

# Create page
touch app/(main)/(routes)/[feature]/page.tsx

# Test in browser
npm run dev
```

#### 3. Integration & Testing

- [ ] Test CRUD operations
- [ ] Test error handling
- [ ] Test edge cases
- [ ] Test performance
- [ ] Update documentation

---

## 🔥 QUICK START: UC15 (Schedules)

### Step 1: Create Backend (30 mins)

```typescript
// convex/schedules.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createSchedule = mutation({
  args: {
    subjectName: v.string(),
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    room: v.optional(v.string()),
    teacher: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    // TODO: Add conflict detection
    
    const scheduleId = await ctx.db.insert("schedules", {
      userId,
      subjectName: args.subjectName,
      dayOfWeek: args.dayOfWeek,
      startTime: args.startTime,
      endTime: args.endTime,
      room: args.room,
      teacher: args.teacher,
      color: args.color || "#3B82F6",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return scheduleId;
  },
});

export const getSchedules = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    const schedules = await ctx.db
      .query("schedules")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    return schedules;
  },
});
```

### Step 2: Create UI (1 hour)

```typescript
// app/(main)/(routes)/schedule/page.tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";

const SchedulePage = () => {
  const schedules = useQuery(api.schedules.getSchedules);
  const createSchedule = useMutation(api.schedules.createSchedule);
  
  const handleCreate = async () => {
    await createSchedule({
      subjectName: "Test Subject",
      dayOfWeek: 1,
      startTime: "08:00",
      endTime: "09:30",
    });
  };
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Lịch học</h1>
      <Button onClick={handleCreate}>Thêm lịch</Button>
      
      <div className="mt-4">
        {schedules?.map((schedule) => (
          <div key={schedule._id} className="p-4 border rounded mb-2">
            <h3>{schedule.subjectName}</h3>
            <p>{schedule.startTime} - {schedule.endTime}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SchedulePage;
```

### Step 3: Test (15 mins)

```bash
# Run dev server
npm run dev

# Open browser
# http://localhost:3000/schedule

# Test create schedule
# Verify in Convex dashboard
```

---

## 🔥 QUICK START: UC18 (AI Summary)

### Step 1: Setup Gemini (10 mins)

```bash
# Get API key from https://makersuite.google.com/app/apikey
# Add to .env.local
GEMINI_API_KEY=your_key_here
```

### Step 2: Create Backend (30 mins)

```typescript
// convex/ai.ts
import { v } from "convex/values";
import { action } from "./_generated/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const summarizeDocument = action({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Get document
    const document = await ctx.runQuery(api.documents.getById, {
      documentId: args.documentId,
    });
    
    if (!document) throw new Error("Document not found");
    
    // Extract text
    const text = extractPlainText(document.content);
    
    // Call Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Summarize this content in Vietnamese:\n\n${text}`;
    const result = await model.generateContent(prompt);
    const summary = result.response.text();
    
    return { summary };
  },
});

function extractPlainText(content: string | undefined): string {
  if (!content) return "";
  try {
    const blocks = JSON.parse(content);
    return blocks
      .map((block: any) => 
        block.content?.map((c: any) => c.text).join("") || ""
      )
      .join("\n");
  } catch {
    return "";
  }
}
```

### Step 3: Create UI (30 mins)

```typescript
// components/ai/summarize-button.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export const SummarizeButton = ({ documentId }: { documentId: string }) => {
  const summarize = useAction(api.ai.summarizeDocument);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  
  const handleSummarize = async () => {
    setLoading(true);
    try {
      const result = await summarize({ documentId });
      setSummary(result.summary);
      toast.success("Đã tạo tóm tắt!");
    } catch (error) {
      toast.error("Không thể tạo tóm tắt");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <Button onClick={handleSummarize} disabled={loading}>
        <Sparkles className="h-4 w-4 mr-2" />
        {loading ? "Đang tóm tắt..." : "Tóm tắt AI"}
      </Button>
      
      {summary && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <p>{summary}</p>
        </div>
      )}
    </div>
  );
};
```

---

## 📊 PROGRESS TRACKING

### Create a tracking file:

```markdown
# Implementation Progress

## UC14 - Tables
- [ ] Backend: createTable
- [ ] Backend: addRow
- [ ] Backend: updateCell
- [ ] Backend: deleteRow
- [ ] Frontend: TableView
- [ ] Frontend: TableCell
- [ ] Testing: CRUD operations
- [ ] Testing: CSV import/export

## UC15 - Schedules
- [ ] Backend: createSchedule
- [ ] Backend: getSchedules
- [ ] Backend: conflict detection
- [ ] Frontend: ScheduleGrid
- [ ] Frontend: AddScheduleModal
- [ ] Testing: Create/Edit/Delete
- [ ] Testing: Conflict detection

... (continue for all UCs)
```

---

## 🆘 TROUBLESHOOTING

### Common Issues:

**1. Schema migration fails**
```bash
# Solution: Clear Convex data and redeploy
npx convex data clear
npx convex dev
```

**2. Gemini API error**
```bash
# Check API key is correct
echo $GEMINI_API_KEY

# Verify quota
# Visit: https://makersuite.google.com/app/apikey
```

**3. Type errors**
```bash
# Regenerate Convex types
npx convex dev
```

**4. Authentication errors**
```typescript
// Always check identity
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");
```

---

## 📚 RESOURCES

- [Convex Docs](https://docs.convex.dev/)
- [Clerk Docs](https://clerk.com/docs)
- [Gemini API Docs](https://ai.google.dev/docs)
- [React Big Calendar](https://jquense.github.io/react-big-calendar/)
- [Tanstack Table](https://tanstack.com/table/v8)

---

## ✅ FINAL CHECKLIST

Before starting implementation:

- [ ] Read all review documents
- [ ] Understand schema changes
- [ ] Install dependencies
- [ ] Migrate schema
- [ ] Get Gemini API key
- [ ] Choose implementation approach
- [ ] Set up progress tracking
- [ ] Ready to code! 🚀

---

**Tạo bởi:** AI Assistant  
**Ngày:** 10/12/2025  
**Let's build! 💪**
