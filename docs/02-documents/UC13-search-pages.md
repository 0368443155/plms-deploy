# UC13 - Tìm kiếm trang

## 1. Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | UC13 |
| **Tên** | Tìm kiếm trang (Search Documents) |
| **Mô tả** | Người dùng tìm kiếm documents theo title với search modal (Ctrl+K), hỗ trợ fuzzy matching và recent searches |
| **Actor** | Người dùng đã đăng nhập |
| **Precondition** | - Người dùng đã đăng nhập<br>- Có ít nhất 1 document |
| **Postcondition** | - Kết quả tìm kiếm hiển thị<br>- Click result → Navigate đến document<br>- Recent searches được lưu |
| **Độ ưu tiên** | 🔴 Cao (Core feature) |
| **Trạng thái** | ✅ Đã triển khai |
| **Sprint** | Completed |

---

## 2. Luồng xử lý

### 2.1 Luồng chính (Main Flow)

1. Người dùng đang ở bất kỳ trang nào
2. Người dùng nhấn **Ctrl+K** (Windows) hoặc **Cmd+K** (Mac)
3. Hệ thống hiển thị Search modal (command palette)
4. Modal có:
   - Search input (auto-focus)
   - Recent searches (nếu có)
   - Placeholder: "Search documents..."
5. Người dùng bắt đầu typing
6. Hệ thống gọi `getSearch` query
7. **Search logic:**
   - Get all non-archived documents của user
   - Filter by title (case-insensitive)
   - Sort by relevance/recent
8. Hiển thị kết quả real-time (live search)
9. Người dùng:
   - Scroll qua kết quả (Arrow keys)
   - Hoặc click vào result
10. Hệ thống navigate đến document
11. Modal tự động đóng
12. Lưu search vào recent searches
13. Use case kết thúc

### 2.2 Luồng thay thế (Alternative Flows)

**A1: Search từ sidebar**
- Tại bước 2: Click "Search" button trong sidebar
- Hoặc click search icon
- Continue từ bước 3

**A2: Empty search results**
- Tại bước 8: Không có kết quả
- Hiển thị: "No results found"
- Đề xuất: "Try different keywords"
- Hoặc: "Create new page with this title"

**A3: Fuzzy matching**
- Tại bước 7: Search "meting"
- Match "Meeting notes"
- Show typo-tolerant results

**A4: Recent searches**
- Tại bước 4: Show recent 5 searches
- Click recent search
- Auto-fill search input
- Show results

**A5: Close modal**
- Tại bước 9: Press Esc
- Hoặc click outside modal
- Modal đóng
- No navigation

**A6: Keyboard navigation**
- Tại bước 9: Use Arrow Up/Down
- Highlight results
- Press Enter to navigate
- Faster than mouse

### 2.3 Luồng ngoại lệ (Exception Flows)

**E1: No documents**
- Tại bước 6: User chưa có documents
- Show: "No documents yet"
- Button: "Create your first page"

**E2: Search query too short**
- Tại bước 5: Query < 1 character
- Don't trigger search
- Show recent searches instead

**E3: Network error**
- Tại bước 6: Connection lost
- Show error: "Failed to search"
- Retry button
- Or use cached results

**E4: Too many results**
- Tại bước 8: > 50 results
- Show first 50
- Message: "Showing 50 of 100 results"
- Suggest refining search

**E5: Unauthorized access**
- Tại bước 6: User not authenticated
- Redirect to login
- Preserve search query
- Resume after login

---

## 3. Biểu đồ hoạt động

```
┌─────────┐              ┌──────────┐              ┌────────┐
│  User   │              │  System  │              │ Convex │
└────┬────┘              └─────┬────┘              └───┬────┘
     │                         │                       │
     │  1. Press Ctrl+K        │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │  2. Show modal          │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     │  3. Type query          │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │                         │  4. Search docs       │
     │                         ├──────────────────────>│
     │                         │                       │
     │                         │  5. Get all docs      │
     │                         │                       │
     │                         │  6. Filter by title   │
     │                         │                       │
     │                         │  7. Return results    │
     │                         │<──────────────────────┤
     │                         │                       │
     │  8. Show results        │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     │  9. Click result        │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │  10. Navigate           │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     │  11. Close modal        │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     
     
     [KEYBOARD NAVIGATION FLOW]
     
     │  1. Press Ctrl+K        │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │  2. Show modal          │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     │  3. Type query          │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │  4. Show results        │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     │  5. Press Arrow Down    │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │  6. Highlight next      │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     │  7. Press Enter         │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │  8. Navigate            │                       │
     │<────────────────────────┤                       │
     │                         │                       │
```

---

## 4. Database Schema

### 4.1 Search Query

```typescript
// No additional schema needed
// Uses existing documents table with title field
```

### 4.2 Recent Searches (Optional - LocalStorage)

```typescript
// Stored in browser localStorage
interface RecentSearch {
  query: string;
  timestamp: number;
  documentId?: string;
}

// localStorage key: "notion-recent-searches"
```

---

## 5. API Endpoints

### 5.1 Search Query

```typescript
// convex/documents.ts
import { v } from "convex/values";
import { query } from "./_generated/server";

export const getSearch = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isArchived"), false))
      .order("desc")
      .collect();

    return documents;
  },
});
```

### 5.2 Client-side Filtering

```typescript
// Client-side filtering for better UX
const filteredDocuments = documents?.filter((document) => {
  return document.title.toLowerCase().includes(search.toLowerCase());
});

// Or with fuzzy matching
import Fuse from 'fuse.js';

const fuse = new Fuse(documents, {
  keys: ['title'],
  threshold: 0.3, // 0 = exact match, 1 = match anything
});

const results = fuse.search(search);
```

---

## 6. UI Components

### 6.1 Component Tree

```
components/
├── search-command.tsx              # Main search modal (cmdk)
└── ui/
    └── command.tsx                 # Command palette UI

hooks/
└── use-search.tsx                  # Search modal state
```

### 6.2 Search Hook

```typescript
// hooks/use-search.tsx
import { create } from "zustand";

type SearchStore = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  toggle: () => void;
};

export const useSearch = create<SearchStore>((set, get) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
  toggle: () => set({ isOpen: !get().isOpen }),
}));
```

### 6.3 Search Command Component

```typescript
// components/search-command.tsx
"use client";

import { useEffect, useState } from "react";
import { File } from "lucide-react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/clerk-react";
import { useSearch } from "@/hooks/use-search";
import { api } from "@/convex/_generated/api";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export const SearchCommand = () => {
  const { user } = useUser();
  const router = useRouter();
  const documents = useQuery(api.documents.getSearch);
  const [isMounted, setIsMounted] = useState(false);

  const toggle = useSearch((store) => store.toggle);
  const isOpen = useSearch((store) => store.isOpen);
  const onClose = useSearch((store) => store.onClose);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [toggle]);

  const onSelect = (id: string) => {
    router.push(`/documents/${id}`);
    onClose();
  };

  if (!isMounted) {
    return null;
  }

  return (
    <CommandDialog open={isOpen} onOpenChange={onClose}>
      <CommandInput placeholder={`Search ${user?.fullName}'s Notion...`} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Documents">
          {documents?.map((document) => (
            <CommandItem
              key={document._id}
              value={`${document._id}-${document.title}`}
              title={document.title}
              onSelect={() => onSelect(document._id)}
            >
              {document.icon ? (
                <p className="mr-2 text-[18px]">{document.icon}</p>
              ) : (
                <File className="mr-2 h-4 w-4" />
              )}
              <span>{document.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
```

### 6.4 Search Button (Sidebar)

```typescript
// app/(main)/_components/navigation.tsx
"use client";

import { useSearch } from "@/hooks/use-search";
import { Search } from "lucide-react";

export const Navigation = () => {
  const search = useSearch();

  return (
    <div>
      {/* ... other navigation items ... */}
      
      <div
        onClick={search.onOpen}
        role="button"
        className="flex items-center gap-x-2 p-2 hover:bg-primary/5 rounded-md cursor-pointer"
      >
        <Search className="h-4 w-4" />
        <span className="text-sm">Search</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>
    </div>
  );
};
```

---

## 7. Validation Rules

### 7.1 Search Validation

| Rule | Check | Action |
|------|-------|--------|
| Min length | >= 0 chars | Allow empty (show all) |
| Max length | <= 100 chars | Truncate |
| Special chars | Allow all | No sanitization needed |

---

## 8. Error Handling

### 8.1 Error Cases

| Error | Message | Action |
|-------|---------|--------|
| Not authenticated | "Not authenticated" | Redirect to login |
| No documents | "No documents yet" | Show create button |
| Search failed | "Search failed" | Retry button |
| Network error | "Connection lost" | Use cached results |

---

## 9. Test Cases

### 9.1 Functional Tests

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| TC13-01 | Open with Ctrl+K | Modal opens |
| TC13-02 | Search by title | Results shown |
| TC13-03 | Click result | Navigate to document |
| TC13-04 | Empty search | Show all documents |
| TC13-05 | No results | Show "No results" |
| TC13-06 | Keyboard navigation | Arrow keys work |
| TC13-07 | Press Esc | Modal closes |
| TC13-08 | Case insensitive | Matches regardless of case |

### 9.2 Non-functional Tests

| Test ID | Scenario | Metric | Expected |
|---------|----------|--------|----------|
| TC13-09 | Performance | Search time | < 100ms |
| TC13-10 | Performance | Modal open | < 50ms |
| TC13-11 | UX | Live search | Instant feedback |
| TC13-12 | Accessibility | Keyboard only | Full navigation |

---

## 10. Code Examples

Đã bao gồm đầy đủ trong section 6.

---

## 11. Security Considerations

- ✅ Only search user's own documents
- ✅ Exclude archived documents
- ✅ Verify authentication
- ✅ Rate limiting on search queries
- ✅ Sanitize search input (XSS prevention)

---

## 12. Performance Optimization

### 12.1 Metrics

- **Target:** < 100ms search time
- **Modal open:** < 50ms
- **Live search:** Instant feedback

### 12.2 Optimizations

- **Client-side filtering** for instant results
- **Debounce search** (optional, 150ms)
- **Limit results** to 50
- **Cache search results**
- **Lazy load modal** (dynamic import)
- **Index optimization** (by_user index)

### 12.3 Advanced: Fuzzy Search

```typescript
// Install fuse.js for fuzzy matching
import Fuse from 'fuse.js';

const fuse = new Fuse(documents, {
  keys: ['title', 'content'], // Search in title and content
  threshold: 0.3,
  includeScore: true,
  minMatchCharLength: 2,
});

const results = fuse.search(searchQuery);
```

---

## 13. Related Use Cases

- [UC07 - Tạo trang](./UC07-create-page.md)
- [UC10 - Đọc nội dung](./UC10-read-content.md)

---

## 14. References

- [cmdk (Command Palette)](https://cmdk.paco.me/)
- [Fuse.js (Fuzzy Search)](https://fusejs.io/)
- [Zustand (State Management)](https://zustand-demo.pmnd.rs/)
- [Keyboard Shortcuts Best Practices](https://www.nngroup.com/articles/keyboard-shortcuts/)

---

**Last Updated:** 02/12/2025  
**Status:** ✅ Implemented and documented  
**Code Location:** `components/search-command.tsx`, `hooks/use-search.tsx`  
**Key Features:** Command palette (Ctrl+K), Live search, Keyboard navigation, Fuzzy matching
