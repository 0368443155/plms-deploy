# UC03 - Đăng xuất

## 1. Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | UC03 |
| **Tên** | Đăng xuất |
| **Mô tả** | Người dùng đăng xuất khỏi hệ thống, xóa session và redirect về trang chủ |
| **Actor** | Người dùng đã đăng nhập |
| **Precondition** | - Người dùng đã đăng nhập<br>- Session còn hiệu lực |
| **Postcondition** | - Session bị xóa<br>- Cookies bị xóa<br>- Redirect về trang chủ `/` |
| **Độ ưu tiên** | 🟡 Trung bình |
| **Trạng thái** | ✅ Đã có (Clerk), cần bổ sung auto-logout |
| **Sprint** | Sprint 1 (Week 1) |

---

## 2. Luồng xử lý

### 2.1 Luồng chính (Main Flow)

1. Người dùng đang ở bất kỳ trang nào trong app
2. Người dùng click vào avatar/menu dropdown
3. Hệ thống hiển thị dropdown menu
4. Người dùng click "Sign out"
5. **(Optional)** Hệ thống hiển thị confirmation dialog
6. Người dùng xác nhận đăng xuất
7. Hệ thống ghi log đăng xuất (timestamp, userId)
8. Clerk xóa session và token
9. Xóa cookies client-side
10. Clear local storage
11. Redirect về trang chủ `/`
12. Hiển thị toast: "Signed out successfully"
13. Use case kết thúc

### 2.2 Luồng thay thế (Alternative Flows)

**A1: Đăng xuất không cần confirmation**
- Bỏ qua bước 5-6
- Đăng xuất ngay lập tức
- Tiết kiệm 1 click

**A2: Đăng xuất từ tất cả thiết bị**
- Tại bước 4: Người dùng chọn "Sign out from all devices"
- Clerk revoke tất cả sessions
- Đăng xuất khỏi mọi thiết bị
- Hiển thị toast: "Signed out from all devices"

**A3: Session đã hết hạn**
- Tại bước 8: Session đã expire
- Clerk tự động xóa session
- Redirect về trang chủ
- Hiển thị toast: "Session expired. Please sign in again"

### 2.3 Luồng ngoại lệ (Exception Flows)

**E1: Network error**
- Tại bước 8: Không thể kết nối Clerk
- Vẫn xóa session local
- Redirect về trang chủ
- Hiển thị warning: "Signed out locally. Network error occurred"

**E2: Người dùng hủy đăng xuất**
- Tại bước 6: Click "Cancel" trong confirmation
- Đóng dialog
- Quay lại trang hiện tại
- Không làm gì cả

---

## 3. Biểu đồ hoạt động

### 3.1 Luồng đăng xuất thông thường

```
┌─────────┐              ┌──────────┐              ┌───────┐
│  User   │              │  System  │              │ Clerk │
└────┬────┘              └─────┬────┘              └───┬───┘
     │                         │                       │
     │  1. Click avatar        │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │  2. Show dropdown       │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     │  3. Click "Sign out"    │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │  4. Show confirmation   │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     │  5. Confirm             │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │                         │  6. Log activity      │
     │                         │  (timestamp, userId)  │
     │                         │                       │
     │                         │  7. Sign out          │
     │                         ├──────────────────────>│
     │                         │                       │
     │                         │  8. Delete session    │
     │                         │<──────────────────────┤
     │                         │                       │
     │                         │  9. Clear cookies     │
     │                         │                       │
     │  10. Redirect to /      │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     │  11. Show toast         │                       │
     │<────────────────────────┤                       │
     │                         │                       │
```

### 3.2 Luồng auto-logout (Idle timeout)

```
┌─────────┐              ┌──────────┐              ┌───────┐
│  User   │              │  System  │              │ Clerk │
└────┬────┘              └─────┬────┘              └───┬───┘
     │                         │                       │
     │                         │  1. Track activity    │
     │                         │  (mouse, keyboard)    │
     │                         │                       │
     │                         ▼                       │
     │                    ◇─────────◇                  │
     │                   / Idle 120  \                 │
     │                  /   minutes?   \               │
     │                 ◇───────────────◇               │
     │                 │               │               │
     │               [No]            [Yes]             │
     │                 │               │               │
     │                 │               ▼               │
     │                 │      ┌──────────────┐         │
     │                 │      │ Show warning │         │
     │                 │      │ "Auto logout │         │
     │                 │      │  in 60s"     │         │
     │                 │      └──────┬───────┘         │
     │                 │             │                 │
     │  Warning shown  │             │                 │
     │<────────────────┼─────────────┘                 │
     │                 │                               │
     │                 │      ◇─────────◇              │
     │                 │     / User has  \             │
     │                 │    /  activity?  \            │
     │                 │   ◇───────────────◇           │
     │                 │   │               │           │
     │                 │ [Yes]           [No]          │
     │                 │   │               │           │
     │                 │   ▼               ▼           │
     │                 │ ┌────┐    ┌──────────────┐   │
     │                 │ │Reset│    │ Auto sign out│   │
     │                 │ │timer│    └──────┬───────┘   │
     │                 │ └────┘           │           │
     │                 │                  ▼           │
     │                 │         ┌──────────────┐    │
     │                 │         │ Delete       │    │
     │                 │         │ session      │────┼──>
     │                 │         └──────┬───────┘    │
     │                 │                │            │
     │  Redirect to /  │                │            │
     │<────────────────┼────────────────┘            │
     │                 │                             │
```

---

## 4. Database Schema

### 4.1 Activity Logs (Optional)

```typescript
// convex/schema.ts
activityLogs: defineTable({
  userId: v.string(),
  action: v.string(),        // "sign_in", "sign_out"
  timestamp: v.number(),
  ipAddress: v.optional(v.string()),
  userAgent: v.optional(v.string()),
})
  .index("by_user", ["userId"])
  .index("by_timestamp", ["timestamp"])
  .index("by_user_action", ["userId", "action"]),
```

### 4.2 Clerk Session Data (External)

Clerk quản lý:
- Session tokens
- Refresh tokens
- Session expiry
- Device information

---

## 5. API Endpoints

### 5.1 Clerk API (External)

**POST** `/v1/client/sessions/{session_id}/end`
- **Purpose:** Kết thúc session
- **Response:**
  ```json
  {
    "object": "session",
    "id": "sess_xxx",
    "status": "ended"
  }
  ```

**POST** `/v1/client/sessions/end_all`
- **Purpose:** Kết thúc tất cả sessions
- **Response:**
  ```json
  {
    "sessions_ended": 3
  }
  ```

### 5.2 Convex API (Optional - for logging)

```typescript
// convex/activity.ts
import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const logSignOut = mutation({
  args: {
    userId: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activityLogs", {
      userId: args.userId,
      action: "sign_out",
      timestamp: Date.now(),
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });
  },
});
```

---

## 6. UI Components

### 6.1 Component Tree

```
components/
├── navigation.tsx              # Navbar with user menu
└── user-menu.tsx              # Dropdown menu

app/(main)/
└── _components/
    └── navbar.tsx             # Main navbar
```

### 6.2 Key Component: UserMenu

```typescript
// components/user-menu.tsx
"use client";

import { SignOutButton, useUser } from "@clerk/clerk-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export const UserMenu = () => {
  const { user } = useUser();
  const router = useRouter();

  const handleSignOut = () => {
    toast.success("Signed out successfully");
    router.push("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 hover:opacity-80">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.imageUrl} />
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center gap-2 p-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.imageUrl} />
          </Avatar>
          <div className="flex flex-col">
            <p className="text-sm font-medium">{user?.fullName}</p>
            <p className="text-xs text-muted-foreground">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <SignOutButton signOutCallback={handleSignOut}>
          <DropdownMenuItem>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </SignOutButton>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

### 6.3 Auto-Logout Hook

```typescript
// hooks/use-auto-logout.tsx
"use client";

import { useIdleTimer } from 'react-idle-timer';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { useState } from 'react';

export function useAutoLogout() {
  const { signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  
  const onIdle = () => {
    setShowWarning(true);
    toast.warning('You will be signed out in 60 seconds due to inactivity', {
      duration: 60000,
    });
    
    // Auto sign out after 60 seconds
    setTimeout(() => {
      signOut();
      toast.info('Automatically signed out due to inactivity');
    }, 60000);
  };
  
  const onActive = () => {
    if (showWarning) {
      setShowWarning(false);
      toast.dismiss();
      toast.success('Welcome back! Idle timer reset');
    }
  };
  
  const { getRemainingTime, reset } = useIdleTimer({
    onIdle,
    onActive,
    timeout: 120 * 60 * 1000, // 120 minutes
    throttle: 500,
  });
  
  return {
    getRemainingTime,
    reset,
    showWarning,
  };
}
```

---

## 7. Validation Rules

### 7.1 Pre-conditions

| Condition | Check | Action if Failed |
|-----------|-------|------------------|
| User authenticated | Check session exists | Redirect to login |
| Session valid | Check expiry | Auto sign out |
| Network available | Ping Clerk API | Sign out locally |

---

## 8. Error Handling

### 8.1 Error Cases

| Error Code | Message | Action |
|------------|---------|--------|
| `network_error` | "Network error. Signed out locally" | Clear local session, redirect |
| `session_expired` | "Session expired" | Auto sign out, redirect |
| `clerk_api_error` | "Sign out failed. Please try again" | Retry button |

### 8.2 Error Handling Code

```typescript
try {
  await signOut();
  toast.success("Signed out successfully");
  router.push("/");
} catch (error) {
  console.error("Sign out error:", error);
  
  // Even if API fails, clear local session
  localStorage.clear();
  sessionStorage.clear();
  
  toast.warning("Signed out locally. Network error occurred");
  router.push("/");
}
```

---

## 9. Test Cases

### 9.1 Functional Tests

| Test ID | Scenario | Steps | Expected Result |
|---------|----------|-------|-----------------|
| TC03-01 | Đăng xuất thành công | 1. Click avatar<br>2. Click "Sign out" | Redirect to /, session cleared |
| TC03-02 | Đăng xuất với confirmation | 1. Click "Sign out"<br>2. Confirm dialog | Signed out after confirmation |
| TC03-03 | Hủy đăng xuất | 1. Click "Sign out"<br>2. Click "Cancel" | Stay on current page |
| TC03-04 | Đăng xuất tất cả thiết bị | 1. Click "Sign out from all"<br>2. Confirm | All sessions ended |
| TC03-05 | Auto-logout sau 120 phút | 1. Idle 120 minutes<br>2. Wait 60s | Auto signed out |
| TC03-06 | Auto-logout warning | 1. Idle 120 minutes<br>2. Move mouse | Warning dismissed, timer reset |
| TC03-07 | Network error | 1. Disconnect network<br>2. Sign out | Local sign out, redirect |
| TC03-08 | Session expired | 1. Wait for expiry<br>2. Try action | Auto redirect to login |

### 9.2 Non-functional Tests

| Test ID | Scenario | Metric | Expected |
|---------|----------|--------|----------|
| TC03-09 | Performance | Sign-out time | < 1s |
| TC03-10 | Security | Session cleanup | All tokens cleared |
| TC03-11 | Security | Cookie cleanup | All cookies removed |
| TC03-12 | UX | Confirmation dialog | Optional, configurable |

---

## 10. Code Examples

### 10.1 Complete Sign-Out Implementation

```typescript
// app/(main)/_components/navbar.tsx
"use client";

import { UserMenu } from "@/components/user-menu";
import { useAutoLogout } from "@/hooks/use-auto-logout";

export const Navbar = () => {
  // Enable auto-logout
  useAutoLogout();

  return (
    <nav className="flex items-center justify-between p-4">
      <div className="flex items-center gap-4">
        {/* Logo and navigation */}
      </div>
      
      <UserMenu />
    </nav>
  );
};
```

### 10.2 Sign Out with Confirmation

```typescript
// components/sign-out-button.tsx
"use client";

import { SignOutButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

export const SignOutWithConfirmation = () => {
  const handleSignOut = () => {
    toast.success("Signed out successfully");
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            You will be signed out of your account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <SignOutButton signOutCallback={handleSignOut}>
            <AlertDialogAction>Sign out</AlertDialogAction>
          </SignOutButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
```

---

## 11. Security Considerations

### 11.1 Best Practices

- ✅ Clear all sessions on sign out
- ✅ Clear all cookies
- ✅ Clear local/session storage
- ✅ Invalidate refresh tokens
- ✅ Log sign-out activity
- ✅ Auto-logout on idle
- ✅ Secure redirect after sign out

### 11.2 Session Management

- Session timeout: 7 days (Clerk default)
- Idle timeout: 120 minutes (custom)
- Refresh token rotation
- Secure cookie flags (httpOnly, secure, sameSite)

---

## 12. Performance Optimization

### 12.1 Metrics

- **Target:** < 1s sign-out time
- **Current:** ~500ms average
- **Bottleneck:** Network latency

### 12.2 Optimizations

- Async session cleanup
- Optimistic UI updates
- Prefetch login page
- Cache cleanup in background

---

## 13. Related Use Cases

- [UC01 - Đăng nhập](./UC01-login.md)
- [UC02 - Đăng ký](./UC02-register.md)
- [UC04 - Quên mật khẩu](./UC04-forgot-password.md)

---

## 14. References

- [Clerk Sign Out Documentation](https://clerk.com/docs/references/react/use-auth#sign-out)
- [React Idle Timer](https://github.com/SupremeTechnopriest/react-idle-timer)
- [Next.js Authentication](https://nextjs.org/docs/authentication)

---

**Last Updated:** 01/12/2025  
**Author:** Development Team  
**Reviewers:** Tech Lead, Security Lead  
**Status:** Ready for implementation
