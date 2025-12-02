# Fix: Prism.js SSR Error in Next.js

**Error:** `Cannot set properties of undefined (setting 'class-name')`  
**File:** `components/code-block-enhancer.tsx`  
**Date:** 03/12/2025

---

## 🐛 Problem

Khi mở hoặc tạo ghi chú mới, xuất hiện lỗi:

```
Uncaught TypeError: Cannot set properties of undefined (setting 'class-name')
    at Object.extend (prism.js:345:1)
    at eval (prism-cpp.js:6:1)
```

### Root Cause

1. **SSR Issue:** Prism.js được import trong Next.js SSR, nhưng Prism cần `window` object (chỉ có ở client-side)
2. **Import Order:** `prism-cpp` phụ thuộc vào `prism-c` và `prism-clike`, nhưng chưa import đúng thứ tự
3. **Missing Dependencies:** Thiếu `prism-clike` và `prism-c` trước khi import `prism-cpp`

---

## ✅ Solution

### 1. Dynamic Import (Client-side Only)

Thay vì:
```typescript
// ❌ BAD - Runs on server
import Prism from "prismjs";
import "prismjs/components/prism-cpp";
```

Sử dụng:
```typescript
// ✅ GOOD - Client-side only
let Prism: any = null;
if (typeof window !== "undefined") {
  Prism = require("prismjs");
  require("prismjs/components/prism-cpp");
}
```

### 2. Correct Import Order

Dependencies phải được import trước:

```typescript
// ✅ Correct order
require("prismjs/components/prism-clike");  // Base for C-like languages
require("prismjs/components/prism-c");      // C (needed by C++)
require("prismjs/components/prism-cpp");    // C++ (depends on C)
require("prismjs/components/prism-java");   // Java (depends on clike)
```

### 3. Safety Checks

Thêm checks để tránh lỗi:

```typescript
useEffect(() => {
  if (!isMounted || !Prism) return; // Check Prism loaded
  
  try {
    Prism.highlightElement(codeBlock);
  } catch (error) {
    console.error("Prism error:", error);
  }
}, [isMounted]);
```

### 4. Mounted State

Chỉ render khi component đã mounted (client-side):

```typescript
const [isMounted, setIsMounted] = useState(false);

useEffect(() => {
  setIsMounted(true);
}, []);

if (!isMounted) {
  return <div>{children}</div>; // Fallback
}
```

---

## 📝 Complete Fix

File: `components/code-block-enhancer.tsx`

```typescript
"use client";

import { useEffect, useRef, useState } from "react";

// Dynamically import Prism only on client-side
let Prism: any = null;
if (typeof window !== "undefined") {
  Prism = require("prismjs");
  
  // Import themes
  require("prismjs/themes/prism.css");
  require("prismjs/themes/prism-tomorrow.css");
  
  // Import language components in CORRECT ORDER
  require("prismjs/components/prism-markup");
  require("prismjs/components/prism-css");
  require("prismjs/components/prism-clike");     // ← Important!
  require("prismjs/components/prism-javascript");
  require("prismjs/components/prism-typescript");
  require("prismjs/components/prism-python");
  require("prismjs/components/prism-c");         // ← Before C++
  require("prismjs/components/prism-cpp");       // ← After C
  require("prismjs/components/prism-java");
  require("prismjs/components/prism-json");
}

export const CodeBlockEnhancer = ({ children }: { children: React.ReactNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !containerRef.current || !Prism) return;

    const codeBlocks = containerRef.current.querySelectorAll("pre code");
    
    codeBlocks.forEach((codeBlock) => {
      try {
        Prism.highlightElement(codeBlock as HTMLElement);
      } catch (error) {
        console.error("Prism highlighting error:", error);
      }
    });
  }, [isMounted]);

  // Don't render until mounted
  if (!isMounted) {
    return <div>{children}</div>;
  }

  return (
    <div ref={containerRef} className="code-block-enhancer">
      {children}
    </div>
  );
};
```

---

## 🎯 Key Points

1. **Always check `typeof window !== "undefined"`** before importing Prism
2. **Import dependencies first:** `clike` → `c` → `cpp`
3. **Use `require()` not `import`** for dynamic imports
4. **Add safety checks:** `if (!Prism) return`
5. **Use mounted state** to ensure client-side rendering

---

## 🧪 Testing

After fix, verify:

1. ✅ No errors in console
2. ✅ Code blocks are highlighted
3. ✅ C++ code works correctly
4. ✅ No SSR warnings
5. ✅ Page loads without crashes

---

## 📚 References

- [Prism.js Documentation](https://prismjs.com/)
- [Next.js Dynamic Imports](https://nextjs.org/docs/advanced-features/dynamic-import)
- [Prism Language Dependencies](https://prismjs.com/#languages-list)

---

## 🔗 Related

- [UC09 - Edit Content](./UC09-edit-content.md) - Code highlighting feature
- [STUDENT-IMPROVEMENTS.md](./STUDENT-IMPROVEMENTS.md) - Student features

---

**Status:** ✅ Fixed  
**Impact:** Critical - Blocking editor usage  
**Solution Time:** ~10 minutes
