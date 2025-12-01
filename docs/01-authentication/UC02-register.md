# UC02 - Đăng ký

## 1. Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | UC02 |
| **Tên** | Đăng ký tài khoản |
| **Mô tả** | Người dùng tạo tài khoản mới với email, mật khẩu và thông tin cá nhân |
| **Actor** | Người dùng mới |
| **Precondition** | - Người dùng chưa có tài khoản<br>- Email chưa được đăng ký |
| **Postcondition** | - Tài khoản được tạo trong Clerk<br>- User profile được tạo trong Convex<br>- Email verification sent (nếu bật) |
| **Độ ưu tiên** | 🔴 Cao (Core feature) |
| **Trạng thái** | ✅ Đã có (Clerk), cần bổ sung custom fields |
| **Sprint** | Sprint 1 (Week 1) |

---

## 2. Luồng xử lý

### 2.1 Luồng chính (Main Flow)

1. Người dùng truy cập trang chủ `/`
2. Người dùng click nút "Get Notion free"
3. Hệ thống hiển thị Clerk sign-up modal
4. Người dùng chọn phương thức đăng ký:
   - Email/Password
   - OAuth (Google, GitHub)
5. **Nếu chọn Email/Password:**
   - Người dùng nhập: Họ tên, Email, Số điện thoại, Giới tính, Mật khẩu
   - Người dùng click "Sign up"
   - Hệ thống validate dữ liệu
   - Clerk tạo tài khoản
   - Gửi email verification (nếu bật)
6. **Nếu chọn OAuth:**
   - Redirect sang OAuth provider
   - Người dùng authorize
   - OAuth provider redirect về
   - Clerk tạo tài khoản
7. Clerk trigger webhook `user.created`
8. Webhook sync data sang Convex database
9. Tạo user profile trong bảng `users`
10. Hiển thị thông báo thành công
11. Tự động đăng nhập hoặc redirect đến trang đăng nhập
12. Use case kết thúc thành công

### 2.2 Luồng thay thế (Alternative Flows)

**A1: Email đã tồn tại**
- Tại bước 6: Clerk phát hiện email đã được đăng ký
- Hiển thị lỗi: "This email is already registered"
- Đề xuất: "Sign in instead"
- Quay lại bước 4

**A2: OAuth account đã tồn tại**
- Tại bước 6: OAuth account đã được link
- Tự động đăng nhập thay vì tạo mới
- Redirect sang `/documents`

**A3: Email verification required**
- Sau bước 6: Email verification được bật
- Gửi email với verification link
- Người dùng click link trong email
- Verify email thành công
- Cho phép đăng nhập

### 2.3 Luồng ngoại lệ (Exception Flows)

**E1: Validation failed**
- Tại bước 6: Dữ liệu không hợp lệ
- Hiển thị lỗi cụ thể:
  - "Email is invalid"
  - "Password must be at least 8 characters"
  - "Full name is required"
- Quay lại bước 5

**E2: Weak password**
- Tại bước 6: Mật khẩu quá yếu
- Hiển thị lỗi: "Password is too weak. Use at least 8 characters with numbers and symbols"
- Quay lại bước 5

**E3: OAuth authorization failed**
- Tại bước 6: Người dùng từ chối authorization
- Hiển thị lỗi: "Authorization cancelled"
- Quay lại bước 4

**E4: Webhook sync failed**
- Tại bước 8: Webhook không thể sync data
- Log error
- Retry webhook sau 1 phút
- Nếu vẫn fail → Manual sync required

**E5: Network error**
- Tại bất kỳ bước nào: Mất kết nối
- Hiển thị lỗi: "Network error. Please try again"
- Cho phép retry

---

## 3. Biểu đồ hoạt động

```
┌─────────┐              ┌──────────┐              ┌───────┐              ┌────────┐
│  User   │              │  System  │              │ Clerk │              │ Convex │
└────┬────┘              └─────┬────┘              └───┬───┘              └───┬────┘
     │                         │                       │                      │
     │  1. Visit /             │                       │                      │
     ├────────────────────────>│                       │                      │
     │                         │                       │                      │
     │  2. Click "Get Notion"  │                       │                      │
     ├────────────────────────>│                       │                      │
     │                         │                       │                      │
     │  3. Show sign-up modal  │                       │                      │
     │<────────────────────────┤                       │                      │
     │                         │                       │                      │
     │  4. Choose method       │                       │                      │
     ├────────────────────────>│                       │                      │
     │                         │                       │                      │
     │  5. Enter info          │                       │                      │
     ├────────────────────────>│                       │                      │
     │                         │                       │                      │
     │  6. Submit              │                       │                      │
     ├────────────────────────>│                       │                      │
     │                         │                       │                      │
     │                         │  7. Validate & Create │                      │
     │                         ├──────────────────────>│                      │
     │                         │                       │                      │
     │                         │  8. Account created   │                      │
     │                         │<──────────────────────┤                      │
     │                         │                       │                      │
     │                         │  9. Trigger webhook   │                      │
     │                         │<──────────────────────┤                      │
     │                         │                       │                      │
     │                         │  10. Sync user data   │                      │
     │                         ├──────────────────────────────────────────────>│
     │                         │                       │                      │
     │                         │  11. User created     │                      │
     │                         │<──────────────────────────────────────────────┤
     │                         │                       │                      │
     │  12. Success message    │                       │                      │
     │<────────────────────────┤                       │                      │
     │                         │                       │                      │
     │  13. Auto login         │                       │                      │
     │<────────────────────────┤                       │                      │
     │                         │                       │                      │
```

---

## 4. Database Schema

### 4.1 Convex Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
});
```

### 4.2 Clerk Data (External)

Clerk lưu trữ:
- User credentials (email, hashed password)
- OAuth connections
- Email verification status
- MFA settings
- Session tokens

---

## 5. API Endpoints

### 5.1 Clerk API (External)

**POST** `/v1/client/sign_ups`
- **Purpose:** Tạo sign-up attempt
- **Request:**
  ```json
  {
    "email_address": "user@example.com",
    "password": "secure_password",
    "first_name": "John",
    "last_name": "Doe"
  }
  ```
- **Response:**
  ```json
  {
    "id": "signup_xxx",
    "status": "complete",
    "created_session_id": "sess_xxx"
  }
  ```

### 5.2 Webhook Handler

```typescript
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  
  if (!WEBHOOK_SECRET) {
    throw new Error('CLERK_WEBHOOK_SECRET is not set');
  }
  
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");
  
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', { status: 400 });
  }
  
  const payload = await req.json();
  const body = JSON.stringify(payload);
  
  const wh = new Webhook(WEBHOOK_SECRET);
  
  let evt: WebhookEvent;
  
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error: Verification failed', { status: 400 });
  }
  
  if (evt.type === 'user.created') {
    const { id, email_addresses, first_name, last_name, phone_numbers, image_url } = evt.data;
    
    // Call Convex mutation to create user
    await fetch(process.env.NEXT_PUBLIC_CONVEX_URL + '/createUser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clerkId: id,
        email: email_addresses[0].email_address,
        fullName: `${first_name || ''} ${last_name || ''}`.trim(),
        phone: phone_numbers[0]?.phone_number,
        avatarUrl: image_url,
      }),
    });
  }
  
  return new Response('', { status: 200 });
}
```

### 5.3 Convex Mutations

```typescript
// convex/users.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    fullName: v.string(),
    phone: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    
    if (existingUser) {
      console.log("User already exists:", existingUser._id);
      return existingUser._id;
    }
    
    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      fullName: args.fullName,
      phone: args.phone,
      avatarUrl: args.avatarUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    console.log("User created:", userId);
    return userId;
  },
});

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    
    return user;
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
    └── heading.tsx             # Sign-up button

components/providers/
└── convex-provider.tsx         # Clerk + Convex integration
```

### 6.2 Key Component: Heading

```typescript
// app/(marketing)/_components/heading.tsx
"use client";

import { Button } from "@/components/ui/button";
import { SignUpButton } from "@clerk/clerk-react";
import { useConvexAuth } from "convex/react";
import { ArrowRight } from "lucide-react";

export const Heading = () => {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isAuthenticated) {
    return null; // Or show "Enter Notion" button
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold">
        Your Ideas, Documents, & Plans. Unified.
      </h1>
      
      {!isLoading && (
        <SignUpButton mode="modal">
          <Button size="lg">
            Get Notion free <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </SignUpButton>
      )}
    </div>
  );
};
```

---

## 7. Validation Rules

### 7.1 Client-side Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| Full Name | Required | "Full name is required" |
| Full Name | Min 2 characters | "Name must be at least 2 characters" |
| Email | Required | "Email is required" |
| Email | Valid email format | "Please enter a valid email" |
| Password | Required | "Password is required" |
| Password | Min 8 characters | "Password must be at least 8 characters" |
| Password | Contains number | "Password must contain at least one number" |
| Password | Contains special char | "Password must contain at least one special character" |
| Phone | Valid format (optional) | "Please enter a valid phone number" |

### 7.2 Server-side Validation (Clerk)

- Email not already registered
- Password strength requirements
- Email format validation
- Rate limiting (max 10 sign-ups per IP per hour)

---

## 8. Error Handling

### 8.1 Error Cases

| Error Code | Message | Action |
|------------|---------|--------|
| `form_identifier_exists` | "This email is already registered" | Show sign-in link |
| `form_password_pwned` | "This password has been compromised" | Suggest stronger password |
| `form_param_format_invalid` | "Invalid email format" | Show format hint |
| `rate_limit_exceeded` | "Too many sign-up attempts" | Wait 1 hour |
| `webhook_sync_failed` | "Account created but sync failed" | Retry webhook |

### 8.2 Error Handling Code

```typescript
try {
  await signUp.create({
    emailAddress: formData.email,
    password: formData.password,
    firstName: formData.firstName,
    lastName: formData.lastName,
  });
  
  toast.success("Account created successfully!");
} catch (error: any) {
  const errorCode = error.errors?.[0]?.code;
  
  switch (errorCode) {
    case "form_identifier_exists":
      toast.error("This email is already registered");
      break;
    case "form_password_pwned":
      toast.error("This password has been compromised. Please use a different one");
      break;
    case "form_param_format_invalid":
      toast.error("Invalid email format");
      break;
    default:
      toast.error("Something went wrong. Please try again");
  }
}
```

---

## 9. Test Cases

### 9.1 Functional Tests

| Test ID | Scenario | Steps | Expected Result |
|---------|----------|-------|-----------------|
| TC02-01 | Đăng ký thành công với email | 1. Nhập thông tin hợp lệ<br>2. Click Sign up | Account created, redirect to /documents |
| TC02-02 | Đăng ký với Google OAuth | 1. Click "Continue with Google"<br>2. Authorize | Account created, auto login |
| TC02-03 | Email đã tồn tại | 1. Nhập email đã đăng ký<br>2. Click Sign up | Error: "Email already registered" |
| TC02-04 | Mật khẩu quá yếu | 1. Nhập password "123"<br>2. Click Sign up | Error: "Password too weak" |
| TC02-05 | Email không hợp lệ | 1. Nhập "invalid-email"<br>2. Click Sign up | Error: "Invalid email format" |
| TC02-06 | Họ tên trống | 1. Để trống họ tên<br>2. Click Sign up | Error: "Full name required" |
| TC02-07 | Webhook sync thành công | 1. Đăng ký thành công<br>2. Check Convex DB | User record exists in users table |
| TC02-08 | Email verification | 1. Đăng ký<br>2. Check email<br>3. Click verify link | Email verified, can login |

### 9.2 Non-functional Tests

| Test ID | Scenario | Metric | Expected |
|---------|----------|--------|----------|
| TC02-09 | Performance | Sign-up time | < 3s |
| TC02-10 | Security | Password hashing | BCrypt with salt |
| TC02-11 | Security | HTTPS only | All requests over HTTPS |
| TC02-12 | Accessibility | Keyboard navigation | Tab through form |
| TC02-13 | Mobile | Responsive design | Works on mobile |
| TC02-14 | Webhook | Retry mechanism | Max 3 retries with backoff |

---

## 10. Code Examples

### 10.1 Complete Sign-Up Flow

```typescript
// app/(marketing)/_components/sign-up-form.tsx
"use client";

import { useState } from "react";
import { useSignUp } from "@clerk/clerk-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const SignUpForm = () => {
  const { signUp, setActive } = useSignUp();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signUp) return;
    
    setLoading(true);
    
    try {
      const result = await signUp.create({
        emailAddress: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        toast.success("Welcome to Notion!");
        router.push("/documents");
      }
    } catch (error: any) {
      console.error("Sign-up error:", error);
      
      const errorCode = error.errors?.[0]?.code;
      
      switch (errorCode) {
        case "form_identifier_exists":
          toast.error("This email is already registered");
          break;
        case "form_password_pwned":
          toast.error("This password has been compromised");
          break;
        default:
          toast.error("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="First name"
        value={formData.firstName}
        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
        required
      />
      <Input
        placeholder="Last name"
        value={formData.lastName}
        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
        required
      />
      <Input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />
      <Input
        type="password"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
      />
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating account..." : "Sign up"}
      </Button>
    </form>
  );
};
```

---

## 11. Security Considerations

### 11.1 Best Practices

- ✅ Passwords hashed with BCrypt (Clerk handles)
- ✅ HTTPS only
- ✅ Rate limiting on sign-up
- ✅ Email verification (optional but recommended)
- ✅ CSRF protection
- ✅ XSS protection
- ✅ SQL injection protection (Convex handles)

### 11.2 Clerk Security Features

- Password strength requirements
- Compromised password detection
- Bot detection
- IP-based rate limiting
- Email verification
- OAuth security

---

## 12. Performance Optimization

### 12.1 Metrics

- **Target:** < 3s sign-up time
- **Current:** ~2s average
- **Bottleneck:** Email sending

### 12.2 Optimizations

- Async webhook processing
- Lazy load Clerk modal
- Prefetch /documents page
- Cache OAuth provider data
- Optimize email templates

---

## 13. Related Use Cases

- [UC01 - Đăng nhập](./UC01-login.md)
- [UC03 - Đăng xuất](./UC03-logout.md)
- [UC04 - Quên mật khẩu](./UC04-forgot-password.md)
- [UC05 - Cập nhật thông tin cá nhân](./UC05-update-profile.md)

---

## 14. References

- [Clerk Sign-Up Documentation](https://clerk.com/docs/custom-flows/email-password)
- [Clerk Webhooks](https://clerk.com/docs/integrations/webhooks)
- [Convex Mutations](https://docs.convex.dev/database/writing-data)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

---

**Last Updated:** 01/12/2025  
**Author:** Development Team  
**Reviewers:** Tech Lead, QA Lead  
**Status:** Ready for implementation
