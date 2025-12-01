# UC06 - Đổi mật khẩu

## 1. Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | UC06 |
| **Tên** | Đổi mật khẩu |
| **Mô tả** | Người dùng đổi mật khẩu khi đã đăng nhập (khác với quên mật khẩu) |
| **Actor** | Người dùng đã đăng nhập |
| **Precondition** | - Người dùng đã đăng nhập<br>- Biết mật khẩu hiện tại |
| **Postcondition** | - Mật khẩu được cập nhật<br>- Email confirmation sent<br>- Force re-login (optional) |
| **Độ ưu tiên** | 🟡 Trung bình |
| **Trạng thái** | ❌ Cần triển khai (Clerk API có sẵn) |
| **Sprint** | Sprint 1 (Week 1) |

---

## 2. Luồng xử lý

### 2.1 Luồng chính (Main Flow)

1. Người dùng đang đăng nhập
2. Người dùng vào Settings/Profile
3. Người dùng click tab "Security" hoặc "Change Password"
4. Hệ thống hiển thị form đổi mật khẩu
5. Người dùng nhập:
   - Mật khẩu hiện tại
   - Mật khẩu mới
   - Xác nhận mật khẩu mới
6. Người dùng click "Change password"
7. Hệ thống validate form:
   - Mật khẩu hiện tại đúng
   - Mật khẩu mới >= 8 ký tự
   - Mật khẩu mới != mật khẩu cũ
   - Xác nhận khớp với mật khẩu mới
8. Gọi Clerk API để cập nhật mật khẩu
9. Clerk verify mật khẩu hiện tại
10. Clerk hash mật khẩu mới (BCrypt)
11. Clerk cập nhật mật khẩu trong database
12. **(Optional)** Sign out từ tất cả thiết bị khác
13. Gửi email confirmation
14. Hiển thị toast thành công
15. **(Optional)** Force re-login
16. Use case kết thúc

### 2.2 Luồng thay thế (Alternative Flows)

**A1: Không sign out từ thiết bị khác**
- Tại bước 12: Checkbox "Keep me signed in on other devices"
- Skip sign out
- Chỉ update password
- Các session khác vẫn valid

**A2: Force re-login ngay**
- Tại bước 15: Checkbox "Sign out after change"
- Sign out ngay lập tức
- Redirect đến login page
- Phải đăng nhập lại với password mới

**A3: Show password strength meter**
- Tại bước 5: Khi nhập password mới
- Hiển thị strength meter real-time
- Màu: Red (weak) → Yellow (medium) → Green (strong)
- Đề xuất improvements

### 2.3 Luồng ngoại lệ (Exception Flows)

**E1: Mật khẩu hiện tại sai**
- Tại bước 9: Clerk verify failed
- Hiển thị lỗi: "Current password is incorrect"
- Highlight field
- Quay lại bước 5

**E2: Mật khẩu mới quá yếu**
- Tại bước 7: Password strength < minimum
- Hiển thị lỗi: "Password is too weak"
- Show strength meter
- Đề xuất: "Use at least 8 characters with numbers and symbols"
- Quay lại bước 5

**E3: Mật khẩu mới trùng mật khẩu cũ**
- Tại bước 7: newPassword === currentPassword
- Hiển thị lỗi: "New password must be different from current password"
- Quay lại bước 5

**E4: Xác nhận không khớp**
- Tại bước 7: newPassword !== confirmPassword
- Hiển thị lỗi: "Passwords don't match"
- Highlight confirm field
- Quay lại bước 5

**E5: Mật khẩu đã bị compromise**
- Tại bước 8: Check pwned database
- Hiển thị lỗi: "This password has been compromised in a data breach"
- Đề xuất: "Please use a different password"
- Quay lại bước 5

**E6: Rate limiting**
- Tại bước 8: Quá nhiều attempts (>5 trong 10 phút)
- Hiển thị lỗi: "Too many attempts. Please try again in 10 minutes"
- Lock form
- Show countdown timer

---

## 3. Biểu đồ hoạt động

```
┌─────────┐              ┌──────────┐              ┌───────┐              ┌───────┐
│  User   │              │  System  │              │ Clerk │              │ Email │
└────┬────┘              └─────┬────┘              └───┬───┘              └───┬───┘
     │                         │                       │                      │
     │  1. Go to Settings      │                       │                      │
     ├────────────────────────>│                       │                      │
     │                         │                       │                      │
     │  2. Click "Security"    │                       │                      │
     ├────────────────────────>│                       │                      │
     │                         │                       │                      │
     │  3. Show form           │                       │                      │
     │<────────────────────────┤                       │                      │
     │                         │                       │                      │
     │  4. Enter passwords     │                       │                      │
     ├────────────────────────>│                       │                      │
     │                         │                       │                      │
     │  5. Click "Change"      │                       │                      │
     ├────────────────────────>│                       │                      │
     │                         │                       │                      │
     │                         │  6. Validate form     │                      │
     │                         │                       │                      │
     │                         │  7. Update password   │                      │
     │                         ├──────────────────────>│                      │
     │                         │                       │                      │
     │                         │  8. Verify current    │                      │
     │                         │<──────────────────────┤                      │
     │                         │                       │                      │
     │                         │  9. Hash new password │                      │
     │                         │                       │                      │
     │                         │  10. Update DB        │                      │
     │                         │                       │                      │
     │                         │  11. Success          │                      │
     │                         │<──────────────────────┤                      │
     │                         │                       │                      │
     │                         │  12. Send confirmation                       │
     │                         ├──────────────────────────────────────────────>│
     │                         │                       │                      │
     │  13. Show success       │                       │                      │
     │<────────────────────────┤                       │                      │
     │                         │                       │                      │
     │  14. (Optional) Re-login│                       │                      │
     │<────────────────────────┤                       │                      │
     │                         │                       │                      │
```

---

## 4. Database Schema

### 4.1 Clerk Data (External)

Clerk quản lý:
- Hashed passwords (BCrypt)
- Password history (prevent reuse)
- Failed attempts counter
- Last password change timestamp

### 4.2 Activity Logs (Optional - Convex)

```typescript
// convex/schema.ts
passwordChangeLogs: defineTable({
  userId: v.string(),
  changedAt: v.number(),
  ipAddress: v.optional(v.string()),
  userAgent: v.optional(v.string()),
  signedOutOtherDevices: v.boolean(),
})
  .index("by_user", ["userId"])
  .index("by_timestamp", ["changedAt"]),
```

---

## 5. API Endpoints

### 5.1 Clerk API (External)

**POST** `/v1/users/{user_id}/password`
- **Purpose:** Update user password
- **Request:**
  ```json
  {
    "current_password": "old_password",
    "new_password": "new_secure_password",
    "sign_out_of_other_sessions": true
  }
  ```
- **Response:**
  ```json
  {
    "object": "user",
    "id": "user_xxx",
    "password_last_changed_at": 1234567890
  }
  ```

### 5.2 Client-side API (Clerk React)

```typescript
import { useUser } from "@clerk/clerk-react";

const { user } = useUser();

await user.updatePassword({
  currentPassword: "old_password",
  newPassword: "new_password",
  signOutOfOtherSessions: true,
});
```

### 5.3 Convex API (Optional - for logging)

```typescript
// convex/activity.ts
export const logPasswordChange = mutation({
  args: {
    userId: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    signedOutOtherDevices: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("passwordChangeLogs", {
      userId: args.userId,
      changedAt: Date.now(),
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      signedOutOtherDevices: args.signedOutOtherDevices,
    });
  },
});
```

---

## 6. UI Components

### 6.1 Component Tree

```
app/(main)/(routes)/settings/
├── page.tsx                        # Settings page
└── _components/
    ├── settings-tabs.tsx           # Tabs navigation
    ├── security-tab.tsx            # Security settings
    ├── change-password-form.tsx    # Password form
    └── password-strength-meter.tsx # Strength indicator

components/ui/
├── input.tsx
├── button.tsx
├── checkbox.tsx
└── progress.tsx                    # For strength meter
```

### 6.2 Settings Page

```typescript
// app/(main)/(routes)/settings/page.tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SecurityTab } from "./_components/security-tab";

const SettingsPage = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account settings and preferences
          </p>
        </div>
        
        <Tabs defaultValue="security" className="w-full">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          
          <TabsContent value="security">
            <SecurityTab />
          </TabsContent>
          
          {/* Other tabs */}
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPage;
```

### 6.3 Change Password Form

```typescript
// app/(main)/(routes)/settings/_components/change-password-form.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordStrengthMeter } from "./password-strength-meter";
import { Eye, EyeOff } from "lucide-react";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
  signOutOtherDevices: z.boolean().default(true),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => data.newPassword !== data.currentPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

export const ChangePasswordForm = () => {
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      signOutOtherDevices: true,
    },
  });

  const onSubmit = async (values: PasswordFormValues) => {
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      await user.updatePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        signOutOfOtherSessions: values.signOutOtherDevices,
      });
      
      toast.success("Password changed successfully!");
      
      // Reset form
      form.reset();
      
      // Optional: Force re-login
      // await signOut();
      // router.push("/sign-in");
    } catch (error: any) {
      console.error("Change password error:", error);
      
      const errorCode = error.errors?.[0]?.code;
      
      switch (errorCode) {
        case "form_password_incorrect":
          form.setError("currentPassword", {
            message: "Current password is incorrect",
          });
          break;
        case "form_password_pwned":
          form.setError("newPassword", {
            message: "This password has been compromised. Use a different one",
          });
          break;
        case "form_password_length_too_short":
          form.setError("newPassword", {
            message: "Password must be at least 8 characters",
          });
          break;
        default:
          toast.error("Failed to change password. Please try again");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Change Password</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Update your password to keep your account secure
        </p>
      </div>

      {/* Current Password */}
      <div>
        <label className="text-sm font-medium">Current Password</label>
        <div className="relative mt-1">
          <Input
            {...form.register("currentPassword")}
            type={showCurrent ? "text" : "password"}
            placeholder="Enter current password"
            disabled={isSubmitting}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2"
            onClick={() => setShowCurrent(!showCurrent)}
          >
            {showCurrent ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
        {form.formState.errors.currentPassword && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.currentPassword.message}
          </p>
        )}
      </div>

      {/* New Password */}
      <div>
        <label className="text-sm font-medium">New Password</label>
        <div className="relative mt-1">
          <Input
            {...form.register("newPassword")}
            type={showNew ? "text" : "password"}
            placeholder="Enter new password"
            disabled={isSubmitting}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2"
            onClick={() => setShowNew(!showNew)}
          >
            {showNew ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
        
        {/* Password Strength Meter */}
        <PasswordStrengthMeter password={form.watch("newPassword")} />
        
        {form.formState.errors.newPassword && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.newPassword.message}
          </p>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label className="text-sm font-medium">Confirm New Password</label>
        <div className="relative mt-1">
          <Input
            {...form.register("confirmPassword")}
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm new password"
            disabled={isSubmitting}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2"
            onClick={() => setShowConfirm(!showConfirm)}
          >
            {showConfirm ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
        {form.formState.errors.confirmPassword && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Sign out other devices */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="signOutOtherDevices"
          checked={form.watch("signOutOtherDevices")}
          onCheckedChange={(checked) => 
            form.setValue("signOutOtherDevices", checked as boolean)
          }
          disabled={isSubmitting}
        />
        <label
          htmlFor="signOutOtherDevices"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Sign out from all other devices
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={isSubmitting || !form.formState.isDirty}
        >
          {isSubmitting ? "Changing..." : "Change password"}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={() => form.reset()}
          disabled={isSubmitting || !form.formState.isDirty}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};
```

### 6.4 Password Strength Meter

```typescript
// app/(main)/(routes)/settings/_components/password-strength-meter.tsx
"use client";

import { Progress } from "@/components/ui/progress";
import { useMemo } from "react";

interface PasswordStrengthMeterProps {
  password: string;
}

export const PasswordStrengthMeter = ({ password }: PasswordStrengthMeterProps) => {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "" };
    
    let score = 0;
    
    // Length
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 25;
    
    // Contains lowercase
    if (/[a-z]/.test(password)) score += 10;
    
    // Contains uppercase
    if (/[A-Z]/.test(password)) score += 10;
    
    // Contains number
    if (/[0-9]/.test(password)) score += 15;
    
    // Contains special char
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15;
    
    // Determine label and color
    if (score < 40) {
      return { score, label: "Weak", color: "bg-red-500" };
    } else if (score < 70) {
      return { score, label: "Medium", color: "bg-yellow-500" };
    } else {
      return { score, label: "Strong", color: "bg-green-500" };
    }
  }, [password]);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Password strength:</span>
        <span className={`text-xs font-medium ${
          strength.label === "Weak" ? "text-red-500" :
          strength.label === "Medium" ? "text-yellow-500" :
          "text-green-500"
        }`}>
          {strength.label}
        </span>
      </div>
      <Progress value={strength.score} className="h-2" />
      <p className="text-xs text-muted-foreground">
        Use at least 8 characters with numbers and symbols
      </p>
    </div>
  );
};
```

---

## 7. Validation Rules

### 7.1 Client-side Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| Current Password | Required | "Current password is required" |
| New Password | Required | "New password is required" |
| New Password | Min 8 characters | "Password must be at least 8 characters" |
| New Password | Contains number | "Password must contain at least one number" |
| New Password | Contains special char | "Password must contain at least one special character" |
| New Password | != Current | "New password must be different" |
| Confirm Password | Required | "Please confirm your password" |
| Confirm Password | Matches new | "Passwords don't match" |

### 7.2 Server-side Validation (Clerk)

- Current password correct
- New password strength requirements
- Password not in pwned database
- Rate limiting (max 5 attempts per 10 minutes)

---

## 8. Error Handling

### 8.1 Error Cases

| Error Code | Message | Action |
|------------|---------|--------|
| `form_password_incorrect` | "Current password is incorrect" | Highlight field |
| `form_password_pwned` | "Password has been compromised" | Suggest different password |
| `form_password_length_too_short` | "Password too short" | Show requirements |
| `rate_limit_exceeded` | "Too many attempts" | Lock for 10 minutes |
| `session_expired` | "Session expired" | Redirect to login |

---

## 9. Test Cases

### 9.1 Functional Tests

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| TC06-01 | Change với password hợp lệ | Success, password updated |
| TC06-02 | Current password sai | Error shown |
| TC06-03 | New password quá yếu | Error, strength meter red |
| TC06-04 | New = current password | Error "must be different" |
| TC06-05 | Confirm không khớp | Error "don't match" |
| TC06-06 | Sign out other devices | All sessions ended except current |
| TC06-07 | Password compromised | Error, suggest different |
| TC06-08 | Rate limiting | Locked after 5 attempts |

---

## 10. Code Examples

Đã bao gồm đầy đủ trong section 6.

---

## 11. Security Considerations

### 11.1 Best Practices

- ✅ Verify current password
- ✅ Check password strength
- ✅ Check pwned database
- ✅ Rate limiting
- ✅ Force re-login option
- ✅ Email notification
- ✅ Audit logging

---

## 12. Performance Optimization

- Debounce strength meter
- Async password validation
- Optimize re-renders

---

## 13. Related Use Cases

- [UC01 - Đăng nhập](./UC01-login.md)
- [UC04 - Quên mật khẩu](./UC04-forgot-password.md)
- [UC05 - Cập nhật thông tin](./UC05-update-profile.md)

---

## 14. References

- [Clerk Update Password](https://clerk.com/docs/references/react/use-user#update-password)
- [OWASP Password Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Have I Been Pwned](https://haveibeenpwned.com/)

---

**Last Updated:** 02/12/2025  
**Status:** Ready for implementation  
**Estimated Effort:** 1-2 days
