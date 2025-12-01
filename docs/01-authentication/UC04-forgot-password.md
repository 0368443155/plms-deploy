# UC04 - Quên mật khẩu

## 1. Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | UC04 |
| **Tên** | Quên mật khẩu / Khôi phục mật khẩu |
| **Mô tả** | Người dùng reset mật khẩu khi quên thông qua email OTP |
| **Actor** | Người dùng đã đăng ký |
| **Precondition** | - Email đã được đăng ký<br>- Người dùng chưa đăng nhập |
| **Postcondition** | - Mật khẩu được reset<br>- Email notification sent<br>- Có thể đăng nhập với mật khẩu mới |
| **Độ ưu tiên** | 🔴 Cao (Security critical) |
| **Trạng thái** | ⚠️ Cần kích hoạt (Clerk hỗ trợ sẵn) |
| **Sprint** | Sprint 1 (Week 1) |

---

## 2. Luồng xử lý

### 2.1 Luồng chính (Main Flow)

1. Người dùng ở trang đăng nhập
2. Người dùng click "Forgot password?"
3. Hệ thống hiển thị trang "Reset password"
4. Người dùng nhập email đã đăng ký
5. Người dùng click "Send reset code"
6. Hệ thống kiểm tra email có tồn tại
7. Clerk tạo OTP code (6 số)
8. Lưu OTP vào database với thời hạn 5 phút
9. Gửi email chứa OTP code
10. Hiển thị trang "Enter verification code"
11. Người dùng nhập OTP code từ email
12. Người dùng click "Verify"
13. Hệ thống validate OTP (đúng và chưa hết hạn)
14. Hiển thị trang "Create new password"
15. Người dùng nhập mật khẩu mới và xác nhận
16. Người dùng click "Reset password"
17. Hệ thống validate mật khẩu mới
18. Clerk cập nhật mật khẩu (hash BCrypt)
19. Xóa OTP code đã sử dụng
20. Gửi email confirmation
21. Hiển thị thông báo thành công
22. Redirect đến trang đăng nhập
23. Use case kết thúc

### 2.2 Luồng thay thế (Alternative Flows)

**A1: Sử dụng magic link thay vì OTP**
- Tại bước 7: Tạo magic link thay vì OTP
- Gửi email với link reset
- Người dùng click link
- Redirect đến trang reset password
- Tiếp tục từ bước 14

**A2: Resend OTP code**
- Tại bước 11: Người dùng click "Resend code"
- Kiểm tra rate limit (max 3 lần/5 phút)
- Tạo OTP mới
- Gửi email mới
- Quay lại bước 11

**A3: OTP hết hạn**
- Tại bước 13: OTP đã quá 5 phút
- Hiển thị lỗi: "Code expired"
- Đề xuất: "Request new code"
- Quay lại bước 5

### 2.3 Luồng ngoại lệ (Exception Flows)

**E1: Email không tồn tại**
- Tại bước 6: Email chưa được đăng ký
- **Security:** Vẫn hiển thị "Email sent" (không tiết lộ email không tồn tại)
- Không gửi email thực tế
- Log attempt để phát hiện abuse

**E2: OTP không đúng**
- Tại bước 13: OTP sai
- Hiển thị lỗi: "Invalid code"
- Đếm số lần thất bại
- Sau 5 lần → Khóa tạm thời 15 phút

**E3: Mật khẩu mới quá yếu**
- Tại bước 17: Password không đạt yêu cầu
- Hiển thị lỗi: "Password too weak"
- Hiển thị password strength meter
- Quay lại bước 15

**E4: Mật khẩu mới trùng mật khẩu cũ**
- Tại bước 17: Password giống password cũ
- Hiển thị lỗi: "New password must be different"
- Quay lại bước 15

**E5: Rate limiting**
- Tại bước 5: Quá nhiều requests (>3 trong 5 phút)
- Hiển thị lỗi: "Too many attempts. Try again in 5 minutes"
- Block requests từ IP/email

**E6: Email delivery failed**
- Tại bước 9: SMTP error
- Log error
- Retry gửi email (max 3 lần)
- Nếu vẫn fail → Hiển thị lỗi generic

---

## 3. Biểu đồ hoạt động

```
┌─────────┐              ┌──────────┐              ┌───────┐              ┌───────┐
│  User   │              │  System  │              │ Clerk │              │ Email │
└────┬────┘              └─────┬────┘              └───┬───┘              └───┬───┘
     │                         │                       │                      │
     │  1. Click "Forgot pwd"  │                       │                      │
     ├────────────────────────>│                       │                      │
     │                         │                       │                      │
     │  2. Show reset page     │                       │                      │
     │<────────────────────────┤                       │                      │
     │                         │                       │                      │
     │  3. Enter email         │                       │                      │
     ├────────────────────────>│                       │                      │
     │                         │                       │                      │
     │  4. Click "Send code"   │                       │                      │
     ├────────────────────────>│                       │                      │
     │                         │                       │                      │
     │                         │  5. Check email       │                      │
     │                         ├──────────────────────>│                      │
     │                         │                       │                      │
     │                         │  6. Generate OTP      │                      │
     │                         │<──────────────────────┤                      │
     │                         │                       │                      │
     │                         │  7. Send email with OTP                      │
     │                         ├──────────────────────────────────────────────>│
     │                         │                       │                      │
     │  8. Show "Enter code"   │                       │                      │
     │<────────────────────────┤                       │                      │
     │                         │                       │                      │
     │  9. Enter OTP           │                       │                      │
     ├────────────────────────>│                       │                      │
     │                         │                       │                      │
     │  10. Verify OTP         │                       │                      │
     │                         ├──────────────────────>│                      │
     │                         │                       │                      │
     │                         │  11. OTP valid        │                      │
     │                         │<──────────────────────┤                      │
     │                         │                       │                      │
     │  12. Show "New password"│                       │                      │
     │<────────────────────────┤                       │                      │
     │                         │                       │                      │
     │  13. Enter new password │                       │                      │
     ├────────────────────────>│                       │                      │
     │                         │                       │                      │
     │  14. Reset password     │                       │                      │
     │                         ├──────────────────────>│                      │
     │                         │                       │                      │
     │                         │  15. Password updated │                      │
     │                         │<──────────────────────┤                      │
     │                         │                       │                      │
     │  16. Success + Redirect │                       │                      │
     │<────────────────────────┤                       │                      │
     │                         │                       │                      │
```

---

## 4. Database Schema

### 4.1 Password Reset Tokens (Clerk manages internally)

Clerk lưu trữ:
- OTP codes
- Expiry timestamps
- Usage status
- Associated email

### 4.2 Rate Limiting (Optional - Convex)

```typescript
// convex/schema.ts
passwordResetAttempts: defineTable({
  email: v.string(),
  ipAddress: v.string(),
  attemptCount: v.number(),
  lastAttempt: v.number(),
  lockedUntil: v.optional(v.number()),
})
  .index("by_email", ["email"])
  .index("by_ip", ["ipAddress"])
  .index("by_email_ip", ["email", "ipAddress"]),
```

---

## 5. API Endpoints

### 5.1 Clerk API (External)

**POST** `/v1/client/sign_ins/{sign_in_id}/prepare_first_factor`
- **Purpose:** Bắt đầu password reset flow
- **Request:**
  ```json
  {
    "strategy": "reset_password_email_code",
    "email_address": "user@example.com"
  }
  ```
- **Response:**
  ```json
  {
    "id": "signin_xxx",
    "status": "needs_first_factor",
    "supported_first_factors": [
      {
        "strategy": "reset_password_email_code",
        "email_address_id": "idn_xxx"
      }
    ]
  }
  ```

**POST** `/v1/client/sign_ins/{sign_in_id}/attempt_first_factor`
- **Purpose:** Verify OTP code
- **Request:**
  ```json
  {
    "strategy": "reset_password_email_code",
    "code": "123456"
  }
  ```
- **Response:**
  ```json
  {
    "status": "needs_new_password"
  }
  ```

**POST** `/v1/client/sign_ins/{sign_in_id}/reset_password`
- **Purpose:** Set new password
- **Request:**
  ```json
  {
    "password": "new_secure_password",
    "sign_out_of_other_sessions": true
  }
  ```
- **Response:**
  ```json
  {
    "status": "complete",
    "created_session_id": "sess_xxx"
  }
  ```

---

## 6. UI Components

### 6.1 Component Tree

```
app/(auth)/
├── forgot-password/
│   └── page.tsx                    # Request reset page
├── verify-code/
│   └── page.tsx                    # Enter OTP page
└── reset-password/
    └── page.tsx                    # New password page

components/auth/
├── forgot-password-form.tsx
├── verify-code-form.tsx
└── reset-password-form.tsx
```

### 6.2 Forgot Password Form

```typescript
// components/auth/forgot-password-form.tsx
"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/clerk-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const ForgotPasswordForm = () => {
  const { signIn } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signIn) return;
    
    setLoading(true);
    
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      
      toast.success("Reset code sent to your email");
      router.push(`/verify-code?email=${encodeURIComponent(email)}`);
    } catch (error: any) {
      console.error("Password reset error:", error);
      
      // Security: Don't reveal if email exists
      toast.success("If this email is registered, you'll receive a reset code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Forgot password?</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Enter your email and we'll send you a code to reset your password
        </p>
      </div>
      
      <Input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Sending..." : "Send reset code"}
      </Button>
      
      <Button
        type="button"
        variant="ghost"
        onClick={() => router.push("/sign-in")}
        className="w-full"
      >
        Back to sign in
      </Button>
    </form>
  );
};
```

### 6.3 Verify Code Form

```typescript
// components/auth/verify-code-form.tsx
"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/clerk-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const VerifyCodeForm = () => {
  const { signIn } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signIn) return;
    
    setLoading(true);
    
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
      });
      
      if (result.status === "needs_new_password") {
        toast.success("Code verified! Set your new password");
        router.push(`/reset-password?email=${encodeURIComponent(email)}`);
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      
      const errorCode = error.errors?.[0]?.code;
      
      if (errorCode === "form_code_incorrect") {
        toast.error("Invalid code. Please try again");
      } else if (errorCode === "form_code_expired") {
        toast.error("Code expired. Request a new one");
      } else {
        toast.error("Verification failed. Please try again");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!signIn) return;
    
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      
      toast.success("New code sent!");
    } catch (error) {
      toast.error("Failed to resend code");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Enter verification code</h2>
        <p className="text-sm text-muted-foreground mt-2">
          We sent a 6-digit code to {email}
        </p>
      </div>
      
      <Input
        type="text"
        placeholder="000000"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        maxLength={6}
        required
      />
      
      <Button type="submit" disabled={loading || code.length !== 6} className="w-full">
        {loading ? "Verifying..." : "Verify code"}
      </Button>
      
      <Button
        type="button"
        variant="ghost"
        onClick={handleResend}
        className="w-full"
      >
        Resend code
      </Button>
    </form>
  );
};
```

### 6.4 Reset Password Form

```typescript
// components/auth/reset-password-form.tsx
"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/clerk-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const ResetPasswordForm = () => {
  const { signIn, setActive } = useSignIn();
  const router = useRouter();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    
    if (!signIn) return;
    
    setLoading(true);
    
    try {
      const result = await signIn.resetPassword({
        password,
        signOutOfOtherSessions: true,
      });
      
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        toast.success("Password reset successfully!");
        router.push("/documents");
      }
    } catch (error: any) {
      console.error("Reset password error:", error);
      
      const errorCode = error.errors?.[0]?.code;
      
      if (errorCode === "form_password_pwned") {
        toast.error("This password has been compromised. Use a different one");
      } else if (errorCode === "form_password_length_too_short") {
        toast.error("Password must be at least 8 characters");
      } else {
        toast.error("Failed to reset password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Create new password</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Your new password must be different from previous passwords
        </p>
      </div>
      
      <Input
        type="password"
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      
      <Input
        type="password"
        placeholder="Confirm password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />
      
      <Button 
        type="submit" 
        disabled={loading || !password || password !== confirmPassword} 
        className="w-full"
      >
        {loading ? "Resetting..." : "Reset password"}
      </Button>
    </form>
  );
};
```

---

## 7. Validation Rules

### 7.1 Email Validation

| Rule | Check | Error Message |
|------|-------|---------------|
| Required | Not empty | "Email is required" |
| Format | Valid email | "Invalid email format" |
| Registered | Exists in DB | (Don't reveal - security) |

### 7.2 OTP Validation

| Rule | Check | Error Message |
|------|-------|---------------|
| Required | Not empty | "Code is required" |
| Format | 6 digits | "Code must be 6 digits" |
| Valid | Matches DB | "Invalid code" |
| Not expired | < 5 minutes | "Code expired" |

### 7.3 Password Validation

| Rule | Check | Error Message |
|------|-------|---------------|
| Required | Not empty | "Password is required" |
| Min length | >= 8 chars | "Password must be at least 8 characters" |
| Strength | Contains number & symbol | "Password too weak" |
| Not compromised | Check pwned database | "Password has been compromised" |
| Match | password === confirm | "Passwords don't match" |

---

## 8. Error Handling

### 8.1 Error Cases

| Error Code | Message | Action |
|------------|---------|--------|
| `form_identifier_not_found` | "If email is registered, code sent" | Security - don't reveal |
| `form_code_incorrect` | "Invalid code" | Allow retry (max 5) |
| `form_code_expired` | "Code expired" | Offer resend |
| `form_password_pwned` | "Password compromised" | Suggest different password |
| `rate_limit_exceeded` | "Too many attempts" | Lock for 15 minutes |

---

## 9. Test Cases

### 9.1 Functional Tests

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| TC04-01 | Reset với email hợp lệ | OTP sent, verify successful |
| TC04-02 | Reset với email không tồn tại | Generic success message (security) |
| TC04-03 | OTP đúng | Proceed to new password |
| TC04-04 | OTP sai | Error, allow retry |
| TC04-05 | OTP hết hạn (>5 min) | Error, offer resend |
| TC04-06 | Resend OTP | New OTP sent |
| TC04-07 | Password mới hợp lệ | Reset successful, auto login |
| TC04-08 | Password mới quá yếu | Error with strength meter |
| TC04-09 | Password không khớp | Error "Passwords don't match" |
| TC04-10 | Rate limiting | Block after 3 attempts |

---

## 10. Code Examples

Đã bao gồm đầy đủ trong section 6.

---

## 11. Security Considerations

### 11.1 Best Practices

- ✅ Don't reveal if email exists
- ✅ OTP expires after 5 minutes
- ✅ Rate limiting (3 attempts per 5 minutes)
- ✅ Lock account after 5 failed OTP attempts
- ✅ Check password against pwned database
- ✅ Force sign out from other sessions
- ✅ Send email confirmation after reset
- ✅ Log all reset attempts

### 11.2 Email Security

- Use HTTPS for all links
- Include expiry time in email
- Add "If you didn't request this" warning
- Include IP address and timestamp

---

## 12. Performance Optimization

- Async email sending
- Cache OTP validation
- Optimize email templates
- CDN for email assets

---

## 13. Related Use Cases

- [UC01 - Đăng nhập](./UC01-login.md)
- [UC02 - Đăng ký](./UC02-register.md)
- [UC06 - Đổi mật khẩu](./UC06-change-password.md)

---

## 14. References

- [Clerk Password Reset](https://clerk.com/docs/custom-flows/forgot-password)
- [OWASP Password Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

**Last Updated:** 02/12/2025  
**Status:** Ready for implementation
