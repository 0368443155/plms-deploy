# UC01 - Đăng nhập

## 1. Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | UC01 |
| **Tên** | Đăng nhập |
| **Mô tả** | Người dùng đăng nhập vào hệ thống bằng email và mật khẩu |
| **Actor** | Người dùng (User) |
| **Precondition** | - Người dùng đã có tài khoản<br>- Người dùng chưa đăng nhập |
| **Postcondition** | - Người dùng được xác thực<br>- Session được tạo<br>- Redirect sang `/documents` |
| **Độ ưu tiên** | 🔴 Cao (Core feature) |
| **Trạng thái** | ✅ Hoàn thành |
| **Sprint** | N/A (Đã có sẵn) |

---

## 2. Luồng xử lý

### 2.1 Luồng chính (Main Flow)

1. Người dùng truy cập trang chủ `/`
2. Hệ thống hiển thị landing page với nút "Get Notion free"
3. Người dùng click nút "Get Notion free"
4. Hệ thống hiển thị Clerk sign-in modal
5. Người dùng nhập email và mật khẩu
6. Người dùng click "Sign in"
7. Hệ thống xác thực thông tin với Clerk
8. Clerk tạo session và JWT token
9. Convex nhận JWT và xác thực
10. Hệ thống redirect người dùng sang `/documents`
11. Use case kết thúc thành công

### 2.2 Luồng thay thế (Alternative Flows)

**A1: Đăng nhập bằng OAuth (Google/GitHub)**
- Tại bước 5: Người dùng click "Continue with Google" hoặc "Continue with GitHub"
- Hệ thống redirect sang OAuth provider
- Người dùng xác thực với OAuth provider
- OAuth provider redirect về với authorization code
- Clerk tạo session
- Tiếp tục bước 9

**A2: Người dùng đã đăng nhập**
- Tại bước 1: Hệ thống phát hiện session còn hiệu lực
- Hệ thống hiển thị nút "Enter Notion" thay vì "Get Notion free"
- Người dùng click "Enter Notion"
- Redirect sang `/documents`

### 2.3 Luồng ngoại lệ (Exception Flows)

**E1: Email không tồn tại**
- Tại bước 7: Clerk không tìm thấy email
- Hệ thống hiển thị lỗi: "Couldn't find your account"
- Đề xuất: "Sign up instead"
- Quay lại bước 4

**E2: Mật khẩu sai**
- Tại bước 7: Mật khẩu không khớp
- Hệ thống hiển thị lỗi: "Password is incorrect"
- Đề xuất: "Forgot password?"
- Quay lại bước 5

**E3: Tài khoản bị khóa (Rate limiting)**
- Tại bước 7: Quá nhiều lần đăng nhập sai
- Hệ thống hiển thị lỗi: "Too many attempts. Please try again later"
- Khóa tài khoản trong 30 phút
- Use case kết thúc

**E4: Network error**
- Tại bước 7 hoặc 9: Mất kết nối mạng
- Hệ thống hiển thị lỗi: "Network error. Please check your connection"
- Người dùng thử lại
- Quay lại bước 6

---

## 3. Biểu đồ hoạt động

```
┌─────────┐                  ┌──────────┐                ┌───────┐              ┌────────┐
│  User   │                  │  System  │                │ Clerk │              │ Convex │
└────┬────┘                  └─────┬────┘                └───┬───┘              └───┬────┘
     │                             │                         │                      │
     │  1. Visit /                 │                         │                      │
     ├────────────────────────────>│                         │                      │
     │                             │                         │                      │
     │  2. Show landing page       │                         │                      │
     │<────────────────────────────┤                         │                      │
     │                             │                         │                      │
     │  3. Click "Get Notion free" │                         │                      │
     ├────────────────────────────>│                         │                      │
     │                             │                         │                      │
     │  4. Show sign-in modal      │                         │                      │
     │<────────────────────────────┤                         │                      │
     │                             │                         │                      │
     │  5. Enter email & password  │                         │                      │
     ├────────────────────────────>│                         │                      │
     │                             │                         │                      │
     │  6. Click "Sign in"         │                         │                      │
     ├────────────────────────────>│                         │                      │
     │                             │                         │                      │
     │                             │  7. Authenticate        │                      │
     │                             ├────────────────────────>│                      │
     │                             │                         │                      │
     │                             │  8. Create session + JWT│                      │
     │                             │<────────────────────────┤                      │
     │                             │                         │                      │
     │                             │  9. Verify JWT          │                      │
     │                             ├──────────────────────────────────────────────>│
     │                             │                         │                      │
     │                             │  10. JWT valid          │                      │
     │                             │<──────────────────────────────────────────────┤
     │                             │                         │                      │
     │  11. Redirect to /documents │                         │                      │
     │<────────────────────────────┤                         │                      │
     │                             │                         │                      │
```

---

## 4. Database Schema

### 4.1 Convex Schema

Không cần bảng riêng cho login vì Clerk quản lý authentication. Tuy nhiên, có thể track login logs:

```typescript
// convex/schema.ts
loginLogs: defineTable({
  userId: v.string(),           // Clerk user ID
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
```

### 4.2 Clerk Data (External)

Clerk lưu trữ:
- User credentials (email, hashed password)
- Sessions
- OAuth connections
- MFA settings

---

## 5. API Endpoints

### 5.1 Clerk API (External)

**POST** `/v1/client/sign_ins`
- **Purpose:** Tạo sign-in attempt
- **Request:**
  ```json
  {
    "identifier": "user@example.com"
  }
  ```
- **Response:**
  ```json
  {
    "id": "signin_xxx",
    "status": "needs_first_factor",
    "supported_first_factors": [...]
  }
  ```

**POST** `/v1/client/sign_ins/{id}/attempt_first_factor`
- **Purpose:** Xác thực với password
- **Request:**
  ```json
  {
    "strategy": "password",
    "password": "user_password"
  }
  ```
- **Response:**
  ```json
  {
    "status": "complete",
    "created_session_id": "sess_xxx"
  }
  ```

### 5.2 Convex API (Optional - for logging)

```typescript
// convex/auth.ts
export const trackLoginAttempt = mutation({
  args: {
    email: v.string(),
    success: v.boolean(),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    await ctx.db.insert("loginLogs", {
      userId: identity?.subject || "unknown",
      email: args.email,
      success: args.success,
      failureReason: args.failureReason,
      timestamp: Date.now(),
    });
  },
});
```

---

## 6. UI Components

### 6.1 Component Tree

```
app/(marketing)/
├── page.tsx                    # Landing page
└── _components/
    ├── heading.tsx             # Hero section with login button
    ├── heroes.tsx              # Hero images
    └── footer.tsx              # Footer

components/
└── spinner.tsx                 # Loading spinner
```

### 6.2 Key Component: Heading

**File:** `app/(marketing)/_components/heading.tsx`

```typescript
"use client";

import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/clerk-react";
import { useConvexAuth } from "convex/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export const Heading = () => {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold">
        Your Ideas, Documents, & Plans. Unified. Welcome to{" "}
        <span className="underline">Notion</span>
      </h1>
      
      {isLoading && (
        <div className="w-full flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}
      
      {isAuthenticated && !isLoading && (
        <Button asChild>
          <Link href="/documents">
            Enter Notion <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      )}
      
      {!isAuthenticated && !isLoading && (
        <SignInButton mode="modal">
          <Button>
            Get Notion free <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </SignInButton>
      )}
    </div>
  );
};
```

### 6.3 Clerk Provider Setup

**File:** `components/providers/convex-provider.tsx`

```typescript
"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const ConvexClientProvider = ({ children }: { children: ReactNode }) => {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
    >
      <ConvexProviderWithClerk useAuth={useAuth} client={convex}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
};
```

---

## 7. Validation Rules

### 7.1 Client-side Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| Email | Required | "Email is required" |
| Email | Valid email format | "Please enter a valid email" |
| Password | Required | "Password is required" |
| Password | Min 8 characters | "Password must be at least 8 characters" |

### 7.2 Server-side Validation (Clerk)

- Email exists in database
- Password matches hashed password
- Account not locked
- Rate limiting (max 5 attempts per 30 minutes)

---

## 8. Error Handling

### 8.1 Error Cases

| Error Code | Message | Action |
|------------|---------|--------|
| `form_identifier_not_found` | "Couldn't find your account" | Show sign-up link |
| `form_password_incorrect` | "Password is incorrect" | Show forgot password link |
| `session_exists` | "You're already signed in" | Redirect to /documents |
| `clerk_network_error` | "Network error. Please try again" | Retry button |
| `rate_limit_exceeded` | "Too many attempts. Try again in 30 minutes" | Lock account |

### 8.2 Error Handling Code

```typescript
try {
  await signIn.attemptFirstFactor({
    strategy: "password",
    password: formData.password,
  });
} catch (error: any) {
  if (error.errors[0]?.code === "form_identifier_not_found") {
    toast.error("Couldn't find your account");
  } else if (error.errors[0]?.code === "form_password_incorrect") {
    toast.error("Password is incorrect");
  } else {
    toast.error("Something went wrong. Please try again");
  }
}
```

---

## 9. Test Cases

### 9.1 Functional Tests

| Test ID | Scenario | Steps | Expected Result |
|---------|----------|-------|-----------------|
| TC01-01 | Đăng nhập thành công | 1. Nhập email hợp lệ<br>2. Nhập password đúng<br>3. Click Sign in | Redirect sang /documents |
| TC01-02 | Email không tồn tại | 1. Nhập email không có trong DB<br>2. Nhập password<br>3. Click Sign in | Hiển thị lỗi "Couldn't find your account" |
| TC01-03 | Password sai | 1. Nhập email hợp lệ<br>2. Nhập password sai<br>3. Click Sign in | Hiển thị lỗi "Password is incorrect" |
| TC01-04 | Email trống | 1. Để trống email<br>2. Click Sign in | Hiển thị lỗi "Email is required" |
| TC01-05 | Password trống | 1. Nhập email<br>2. Để trống password<br>3. Click Sign in | Hiển thị lỗi "Password is required" |
| TC01-06 | Đăng nhập với Google | 1. Click "Continue with Google"<br>2. Chọn Google account | Redirect sang /documents |
| TC01-07 | Rate limiting | 1. Nhập sai password 5 lần | Hiển thị lỗi "Too many attempts" |

### 9.2 Non-functional Tests

| Test ID | Scenario | Metric | Expected |
|---------|----------|--------|----------|
| TC01-08 | Performance | Response time | < 2s |
| TC01-09 | Security | Password hashing | BCrypt with salt |
| TC01-10 | Security | HTTPS only | All requests over HTTPS |
| TC01-11 | Accessibility | Keyboard navigation | Tab through form |
| TC01-12 | Mobile | Responsive design | Works on mobile |

---

## 10. Code Examples

### 10.1 Complete Login Flow

```typescript
// app/(marketing)/_components/heading.tsx
"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/clerk-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export const LoginForm = () => {
  const { signIn, setActive } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signIn) return;
    
    setLoading(true);
    
    try {
      // Create sign-in attempt
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        // Set the active session
        await setActive({ session: result.createdSessionId });
        
        // Redirect to documents
        router.push("/documents");
        toast.success("Welcome back!");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      
      const errorCode = error.errors?.[0]?.code;
      
      switch (errorCode) {
        case "form_identifier_not_found":
          toast.error("Couldn't find your account");
          break;
        case "form_password_incorrect":
          toast.error("Password is incorrect");
          break;
        default:
          toast.error("Something went wrong. Please try again");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
};
```

---

## 11. Security Considerations

### 11.1 Best Practices

- ✅ Passwords hashed with BCrypt
- ✅ HTTPS only
- ✅ Rate limiting (5 attempts per 30 min)
- ✅ Session timeout (7 days)
- ✅ CSRF protection
- ✅ XSS protection

### 11.2 Clerk Security Features

- Multi-factor authentication (MFA)
- Passwordless authentication
- Social login (OAuth)
- Session management
- Bot detection
- IP blocking

---

## 12. Performance Optimization

### 12.1 Metrics

- **Target:** < 2s login time
- **Current:** ~1.5s average
- **Bottleneck:** Network latency to Clerk

### 12.2 Optimizations

- Use Clerk's CDN for faster loading
- Lazy load Clerk modal
- Cache user session
- Prefetch /documents page

---

## 13. Related Use Cases

- [UC02 - Đăng ký](./UC02-register.md)
- [UC03 - Đăng xuất](./UC03-logout.md)
- [UC04 - Quên mật khẩu](./UC04-forgot-password.md)

---

## 14. References

- [Clerk Documentation](https://clerk.com/docs)
- [Convex Auth](https://docs.convex.dev/auth/clerk)
- [Next.js Authentication](https://nextjs.org/docs/authentication)

---

**Last Updated:** 01/12/2025  
**Author:** Development Team  
**Reviewers:** Tech Lead, QA Lead
