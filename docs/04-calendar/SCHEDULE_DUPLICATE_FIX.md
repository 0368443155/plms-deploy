# 🔧 Schedule Duplicate Issue - Debug & Fix Guide

## 🐛 Vấn Đề

Lỗi: `Schedule conflict detected. Another schedule "Python cơ bản" (09:00 - 09:30) overlaps with this time slot (07:00 - 09:30)`

**Nguyên nhân:** Data bị duplicate trong database

## ✅ Đã Fix

### 1. **Improved Overlap Detection**
- Changed logic from `start1 < end2 && start2 < end1` to `start1 < end2 && end1 > start2`
- Now allows adjacent schedules (e.g., 07:00-09:00 and 09:00-10:00 are OK)

### 2. **Better Error Messages**
- Now shows which schedule conflicts: `"Python cơ bản" (09:00 - 09:30)`
- Easier to debug

### 3. **Debug Tools Added**
- `getAllDebug` query - View all schedules with IDs and timestamps
- `removeDuplicates` mutation - Auto-remove duplicate schedules

## 🔍 Debug Steps

### Step 1: Check có duplicate không

```typescript
// In browser console hoặc component
const schedules = await convex.query(api.schedules.getAllDebug);
console.table(schedules);

// Tìm duplicates
const duplicates = schedules.filter((s, i, arr) => 
  arr.findIndex(x => 
    x.dayOfWeek === s.dayOfWeek && 
    x.startTime === s.startTime && 
    x.endTime === s.endTime &&
    x.subjectName === s.subjectName
  ) !== i
);

console.log('Duplicates found:', duplicates);
```

### Step 2: Remove duplicates

```typescript
// Call mutation to remove duplicates
const result = await convex.mutation(api.schedules.removeDuplicates);
console.log(result); // { message: "Removed X duplicate schedule(s)", deletedCount: X }
```

## 🛠️ Quick Fix Component

Create this component to debug and fix:

**File:** `app/(main)/_components/schedule-debug.tsx`

```typescript
"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const ScheduleDebug = () => {
  const schedules = useQuery(api.schedules.getAllDebug);
  const removeDuplicates = useMutation(api.schedules.removeDuplicates);

  const handleRemoveDuplicates = async () => {
    try {
      const result = await removeDuplicates();
      toast.success(result.message);
    } catch (error) {
      toast.error("Failed to remove duplicates");
      console.error(error);
    }
  };

  if (!schedules) return <div>Loading...</div>;

  // Find duplicates
  const duplicates = schedules.filter((s, i, arr) => 
    arr.findIndex(x => 
      x.dayOfWeek === s.dayOfWeek && 
      x.startTime === s.startTime && 
      x.endTime === s.endTime &&
      x.subjectName === s.subjectName
    ) !== i
  );

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-bold mb-4">Schedule Debug</h3>
      
      <div className="mb-4">
        <p>Total schedules: {schedules.length}</p>
        <p>Duplicates found: {duplicates.length}</p>
      </div>

      {duplicates.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Duplicate Schedules:</h4>
          <div className="space-y-2">
            {duplicates.map((s) => (
              <div key={s._id} className="p-2 bg-red-100 rounded text-sm">
                {s.subjectName} - Day {s.dayOfWeek} - {s.startTime}-{s.endTime}
                <br />
                <span className="text-xs text-gray-600">
                  ID: {s._id} | Created: {s.createdAt}
                </span>
              </div>
            ))}
          </div>
          
          <Button 
            onClick={handleRemoveDuplicates}
            className="mt-4"
            variant="destructive"
          >
            Remove Duplicates
          </Button>
        </div>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer font-semibold">All Schedules</summary>
        <div className="mt-2 space-y-2">
          {schedules.map((s) => (
            <div key={s._id} className="p-2 bg-gray-100 rounded text-sm">
              {s.subjectName} - Day {s.dayOfWeek} - {s.startTime}-{s.endTime}
              <br />
              <span className="text-xs text-gray-600">
                ID: {s._id} | Created: {s.createdAt}
              </span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
};
```

## 🚀 Usage

### Option 1: Add to existing page

```typescript
// In your schedule page
import { ScheduleDebug } from "./_components/schedule-debug";

// Add somewhere in the page (temporarily for debugging)
<ScheduleDebug />
```

### Option 2: Use in browser console

```typescript
// Open browser console
const schedules = await convex.query(api.schedules.getAllDebug);
console.table(schedules);

// Remove duplicates
const result = await convex.mutation(api.schedules.removeDuplicates);
console.log(result);
```

### Option 3: Use Convex Dashboard

1. Go to Convex Dashboard
2. Open "Data" tab
3. Select "schedules" table
4. Look for duplicate rows
5. Manually delete duplicates

## 🔍 Root Cause Analysis

### Possible causes of duplicates:

1. **Double submission** - User clicked "Create" button twice
2. **Race condition** - Multiple requests sent simultaneously
3. **Client-side bug** - Form submitted multiple times
4. **Network retry** - Request retried on network error

### Prevention:

Add to your create schedule form:

```typescript
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async (data) => {
  if (isSubmitting) return; // Prevent double submission
  
  setIsSubmitting(true);
  try {
    await createSchedule(data);
  } finally {
    setIsSubmitting(false);
  }
};

// Disable button while submitting
<Button disabled={isSubmitting}>
  {isSubmitting ? "Creating..." : "Create Schedule"}
</Button>
```

## ✅ Checklist

- [ ] Run `getAllDebug` to check for duplicates
- [ ] Run `removeDuplicates` to clean up
- [ ] Add double-submission prevention to form
- [ ] Test creating new schedule
- [ ] Verify no more conflicts

## 📝 Changes Made

### 1. Fixed Overlap Logic
**Before:**
```typescript
return start1 < end2 && start2 < end1;
// Problem: Rejects adjacent schedules (07:00-09:00 and 09:00-10:00)
```

**After:**
```typescript
return start1 < end2 && end1 > start2;
// Fixed: Allows adjacent schedules
```

### 2. Better Error Messages
**Before:**
```typescript
throw new Error("Schedule conflict detected");
```

**After:**
```typescript
throw new Error(`Schedule conflict detected. Another schedule "${conflicting.subjectName}" (${conflicting.startTime} - ${conflicting.endTime}) overlaps...`);
```

### 3. Added Debug Tools
- `getAllDebug` - View all schedules with full details
- `removeDuplicates` - Auto-remove duplicates

---

**Created:** 11/12/2025  
**Status:** Ready to use  
**Version:** 2.0 (Restored after rollback)
