# UC05 - Cập nhật thông tin cá nhân

## 1. Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | UC05 |
| **Tên** | Cập nhật thông tin cá nhân |
| **Mô tả** | Người dùng cập nhật thông tin profile: họ tên, số điện thoại, giới tính, avatar |
| **Actor** | Người dùng đã đăng nhập |
| **Precondition** | - Người dùng đã đăng nhập<br>- User profile đã tồn tại trong database |
| **Postcondition** | - Thông tin được cập nhật trong Convex<br>- Thông tin được sync với Clerk<br>- UI cập nhật real-time |
| **Độ ưu tiên** | 🔴 Cao |
| **Trạng thái** | ❌ Cần triển khai hoàn toàn |
| **Sprint** | Sprint 1 (Week 1) |

---

## 2. Luồng xử lý

### 2.1 Luồng chính (Main Flow)

1. Người dùng đang đăng nhập
2. Người dùng click vào avatar hoặc menu
3. Người dùng chọn "Profile" hoặc "Settings"
4. Hệ thống redirect đến `/profile`
5. Hệ thống load thông tin hiện tại từ Convex
6. Hiển thị form với dữ liệu đã điền sẵn:
   - Họ tên
   - Email (read-only)
   - Số điện thoại
   - Giới tính
   - Avatar hiện tại
7. Người dùng chỉnh sửa thông tin
8. **(Optional)** Người dùng upload avatar mới
9. Người dùng click "Save changes"
10. Hệ thống validate dữ liệu
11. Upload avatar lên EdgeStore (nếu có)
12. Cập nhật thông tin trong Convex database
13. Sync thông tin với Clerk (firstName, lastName, imageUrl)
14. Hiển thị toast thành công
15. UI cập nhật với thông tin mới
16. Use case kết thúc

### 2.2 Luồng thay thế (Alternative Flows)

**A1: Chỉ cập nhật avatar**
- Tại bước 7: Người dùng chỉ thay đổi avatar
- Upload avatar mới
- Cập nhật avatarUrl trong database
- Skip các field khác

**A2: Xóa avatar**
- Tại bước 8: Người dùng click "Remove avatar"
- Xóa avatar từ EdgeStore
- Set avatarUrl = null trong database
- Hiển thị default avatar

**A3: Cancel changes**
- Tại bước 9: Người dùng click "Cancel"
- Discard tất cả thay đổi
- Reset form về giá trị ban đầu
- Không lưu gì cả

**A4: Real-time preview**
- Tại bước 7-8: Mỗi khi thay đổi
- Hiển thị preview ngay lập tức
- Chưa lưu vào database
- Chỉ update UI tạm thời

### 2.3 Luồng ngoại lệ (Exception Flows)

**E1: Validation failed**
- Tại bước 10: Dữ liệu không hợp lệ
- Hiển thị lỗi cụ thể:
  - "Full name is required"
  - "Phone number is invalid"
- Highlight field lỗi
- Quay lại bước 7

**E2: Avatar upload failed**
- Tại bước 11: EdgeStore error
- Hiển thị lỗi: "Failed to upload avatar"
- Retry button
- Hoặc skip avatar, chỉ update text fields

**E3: Avatar quá lớn**
- Tại bước 8: File > 5MB
- Hiển thị lỗi: "Avatar must be less than 5MB"
- Đề xuất compress image
- Quay lại bước 8

**E4: Database update failed**
- Tại bước 12: Convex mutation error
- Rollback avatar upload (xóa từ EdgeStore)
- Hiển thị lỗi: "Failed to save changes"
- Retry button

**E5: Network error**
- Tại bất kỳ bước nào: Mất kết nối
- Save changes locally (localStorage)
- Hiển thị warning: "Changes saved locally. Will sync when online"
- Auto-retry khi có network

---

## 3. Biểu đồ hoạt động

```
┌─────────┐          ┌──────────┐          ┌────────┐          ┌───────────┐
│  User   │          │  System  │          │ Convex │          │ EdgeStore │
└────┬────┘          └─────┬────┘          └───┬────┘          └─────┬─────┘
     │                     │                   │                      │
     │  1. Click "Profile" │                   │                      │
     ├────────────────────>│                   │                      │
     │                     │                   │                      │
     │  2. Load profile    │                   │                      │
     │                     ├──────────────────>│                      │
     │                     │                   │                      │
     │                     │  3. Return data   │                      │
     │                     │<──────────────────┤                      │
     │                     │                   │                      │
     │  4. Show form       │                   │                      │
     │<────────────────────┤                   │                      │
     │                     │                   │                      │
     │  5. Edit info       │                   │                      │
     ├────────────────────>│                   │                      │
     │                     │                   │                      │
     │  6. Upload avatar   │                   │                      │
     ├────────────────────>│                   │                      │
     │                     │                   │                      │
     │                     │  7. Upload file   │                      │
     │                     ├──────────────────────────────────────────>│
     │                     │                   │                      │
     │                     │  8. Return URL    │                      │
     │                     │<──────────────────────────────────────────┤
     │                     │                   │                      │
     │  9. Click "Save"    │                   │                      │
     ├────────────────────>│                   │                      │
     │                     │                   │                      │
     │                     │  10. Validate     │                      │
     │                     │                   │                      │
     │                     │  11. Update DB    │                      │
     │                     ├──────────────────>│                      │
     │                     │                   │                      │
     │                     │  12. Success      │                      │
     │                     │<──────────────────┤                      │
     │                     │                   │                      │
     │  13. Show success   │                   │                      │
     │<────────────────────┤                   │                      │
     │                     │                   │                      │
     │  14. Update UI      │                   │                      │
     │<────────────────────┤                   │                      │
     │                     │                   │                      │
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
    clerkId: v.string(),
    fullName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    gender: v.optional(v.string()),    // "male", "female", "other", "prefer_not_to_say"
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),       // Optional bio
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_updated", ["updatedAt"]),
});
```

---

## 5. API Endpoints

### 5.1 Convex Queries

```typescript
// convex/users.ts
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getProfile = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      throw new Error("Unauthorized");
    }
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    return user;
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // Return public profile only
    return {
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
    };
  },
});
```

### 5.2 Convex Mutations

```typescript
// convex/users.ts
export const updateProfile = mutation({
  args: {
    fullName: v.string(),
    phone: v.optional(v.string()),
    gender: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      throw new Error("Unauthorized");
    }
    
    // Get current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // Validate full name
    if (!args.fullName || args.fullName.trim().length < 2) {
      throw new Error("Full name must be at least 2 characters");
    }
    
    // Validate phone (optional)
    if (args.phone && !isValidPhone(args.phone)) {
      throw new Error("Invalid phone number");
    }
    
    // Validate gender (optional)
    const validGenders = ["male", "female", "other", "prefer_not_to_say"];
    if (args.gender && !validGenders.includes(args.gender)) {
      throw new Error("Invalid gender");
    }
    
    // Update user
    await ctx.db.patch(user._id, {
      fullName: args.fullName.trim(),
      phone: args.phone,
      gender: args.gender,
      avatarUrl: args.avatarUrl,
      bio: args.bio,
      updatedAt: Date.now(),
    });
    
    return user._id;
  },
});

export const deleteAvatar = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      throw new Error("Unauthorized");
    }
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // Remove avatar URL
    await ctx.db.patch(user._id, {
      avatarUrl: undefined,
      updatedAt: Date.now(),
    });
    
    return true;
  },
});

// Helper function
function isValidPhone(phone: string): boolean {
  // Simple validation - adjust based on requirements
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}
```

---

## 6. UI Components

### 6.1 Component Tree

```
app/(main)/(routes)/profile/
├── page.tsx                        # Profile page
└── _components/
    ├── profile-form.tsx            # Main form
    ├── avatar-upload.tsx           # Avatar upload
    ├── avatar-preview.tsx          # Avatar preview
    └── profile-skeleton.tsx        # Loading skeleton

components/ui/
├── input.tsx                       # Input component
├── select.tsx                      # Select component
├── textarea.tsx                    # Textarea component
└── button.tsx                      # Button component
```

### 6.2 Profile Page

```typescript
// app/(main)/(routes)/profile/page.tsx
"use client";

import { ProfileForm } from "./_components/profile-form";
import { ProfileSkeleton } from "./_components/profile-skeleton";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const ProfilePage = () => {
  const profile = useQuery(api.users.getProfile);

  if (profile === undefined) {
    return <ProfileSkeleton />;
  }

  if (profile === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your personal information
          </p>
        </div>
        
        <ProfileForm initialData={profile} />
      </div>
    </div>
  );
};

export default ProfilePage;
```

### 6.3 Profile Form Component

```typescript
// app/(main)/(routes)/profile/_components/profile-form.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AvatarUpload } from "./avatar-upload";
import { Doc } from "@/convex/_generated/dataModel";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  initialData: Doc<"users">;
}

export const ProfileForm = ({ initialData }: ProfileFormProps) => {
  const updateProfile = useMutation(api.users.updateProfile);
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: initialData.fullName,
      phone: initialData.phone || "",
      gender: initialData.gender as any,
      bio: initialData.bio || "",
    },
  });

  const onSubmit = async (values: ProfileFormValues) => {
    setIsSubmitting(true);
    
    try {
      await updateProfile({
        fullName: values.fullName,
        phone: values.phone || undefined,
        gender: values.gender,
        bio: values.bio || undefined,
        avatarUrl: avatarUrl || undefined,
      });
      
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Update profile error:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Avatar Upload */}
      <div>
        <label className="text-sm font-medium">Profile Picture</label>
        <AvatarUpload
          value={avatarUrl}
          onChange={setAvatarUrl}
          disabled={isSubmitting}
        />
      </div>

      {/* Full Name */}
      <div>
        <label className="text-sm font-medium">Full Name *</label>
        <Input
          {...form.register("fullName")}
          placeholder="John Doe"
          disabled={isSubmitting}
        />
        {form.formState.errors.fullName && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.fullName.message}
          </p>
        )}
      </div>

      {/* Email (Read-only) */}
      <div>
        <label className="text-sm font-medium">Email</label>
        <Input
          value={initialData.email}
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Email cannot be changed
        </p>
      </div>

      {/* Phone */}
      <div>
        <label className="text-sm font-medium">Phone Number</label>
        <Input
          {...form.register("phone")}
          placeholder="+1 (555) 123-4567"
          disabled={isSubmitting}
        />
        {form.formState.errors.phone && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.phone.message}
          </p>
        )}
      </div>

      {/* Gender */}
      <div>
        <label className="text-sm font-medium">Gender</label>
        <Select
          value={form.watch("gender")}
          onValueChange={(value) => form.setValue("gender", value as any)}
          disabled={isSubmitting}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bio */}
      <div>
        <label className="text-sm font-medium">Bio</label>
        <Textarea
          {...form.register("bio")}
          placeholder="Tell us about yourself..."
          rows={4}
          disabled={isSubmitting}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {form.watch("bio")?.length || 0}/500 characters
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={isSubmitting || !form.formState.isDirty}
        >
          {isSubmitting ? "Saving..." : "Save changes"}
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

### 6.4 Avatar Upload Component

```typescript
// app/(main)/(routes)/profile/_components/avatar-upload.tsx
"use client";

import { useState } from "react";
import { useEdgeStore } from "@/lib/edgestore";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

interface AvatarUploadProps {
  value?: string;
  onChange: (url?: string) => void;
  disabled?: boolean;
}

export const AvatarUpload = ({
  value,
  onChange,
  disabled,
}: AvatarUploadProps) => {
  const { edgestore } = useEdgeStore();
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Avatar must be less than 5MB");
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("File must be an image");
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Delete old avatar if exists
      if (value) {
        await edgestore.publicFiles.delete({ url: value });
      }
      
      // Upload new avatar
      const res = await edgestore.publicFiles.upload({
        file,
        options: {
          replaceTargetUrl: value,
        },
      });
      
      onChange(res.url);
      toast.success("Avatar uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!value) return;
    
    try {
      await edgestore.publicFiles.delete({ url: value });
      onChange(undefined);
      toast.success("Avatar removed");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to remove avatar");
    }
  };

  return (
    <div className="flex items-center gap-4 mt-2">
      <Avatar className="h-24 w-24">
        <AvatarImage src={value} />
        <AvatarFallback>
          <Upload className="h-8 w-8 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isUploading}
          onClick={() => document.getElementById("avatar-upload")?.click()}
        >
          {isUploading ? "Uploading..." : value ? "Change avatar" : "Upload avatar"}
        </Button>
        
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || isUploading}
            onClick={handleRemove}
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
        
        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
          disabled={disabled || isUploading}
        />
        
        <p className="text-xs text-muted-foreground">
          JPG, PNG or GIF. Max 5MB.
        </p>
      </div>
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
| Full Name | Min 2 characters | "Full name must be at least 2 characters" |
| Full Name | Max 100 characters | "Full name must be less than 100 characters" |
| Phone | Optional | - |
| Phone | Valid format | "Invalid phone number" |
| Phone | Min 10 digits | "Phone must have at least 10 digits" |
| Gender | Optional | - |
| Gender | Valid enum | "Invalid gender" |
| Bio | Optional | - |
| Bio | Max 500 characters | "Bio must be less than 500 characters" |
| Avatar | Max 5MB | "Avatar must be less than 5MB" |
| Avatar | Image only | "File must be an image" |

### 7.2 Server-side Validation

```typescript
// convex/users.ts validation
- Full name: trim(), length >= 2
- Phone: regex /^[\d\s\-\+\(\)]+$/, digits >= 10
- Gender: enum ["male", "female", "other", "prefer_not_to_say"]
- Bio: length <= 500
- Avatar URL: valid URL format
```

---

## 8. Error Handling

### 8.1 Error Cases

| Error Code | Message | Action |
|------------|---------|--------|
| `validation_error` | "Invalid input" | Show field-specific errors |
| `upload_failed` | "Failed to upload avatar" | Retry button |
| `file_too_large` | "Avatar must be less than 5MB" | Show file size |
| `invalid_file_type` | "File must be an image" | Show accepted formats |
| `update_failed` | "Failed to save changes" | Retry button |
| `unauthorized` | "Unauthorized" | Redirect to login |

### 8.2 Error Handling Code

```typescript
try {
  await updateProfile(values);
  toast.success("Profile updated!");
} catch (error: any) {
  if (error.message.includes("Unauthorized")) {
    toast.error("Please sign in again");
    router.push("/sign-in");
  } else if (error.message.includes("validation")) {
    toast.error("Please check your input");
  } else {
    toast.error("Failed to update profile");
  }
}
```

---

## 9. Test Cases

### 9.1 Functional Tests

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| TC05-01 | Update full name | Name updated, toast shown |
| TC05-02 | Update phone | Phone updated successfully |
| TC05-03 | Update gender | Gender updated |
| TC05-04 | Update bio | Bio updated |
| TC05-05 | Upload avatar | Avatar uploaded, URL saved |
| TC05-06 | Remove avatar | Avatar removed, default shown |
| TC05-07 | Cancel changes | Form reset, no save |
| TC05-08 | Invalid phone | Error shown, not saved |
| TC05-09 | Avatar too large | Error, upload blocked |
| TC05-10 | Invalid file type | Error, upload blocked |

### 9.2 Non-functional Tests

| Test ID | Scenario | Metric | Expected |
|---------|----------|--------|----------|
| TC05-11 | Performance | Update time | < 2s |
| TC05-12 | Performance | Avatar upload | < 5s |
| TC05-13 | UX | Real-time preview | Instant |
| TC05-14 | Accessibility | Keyboard navigation | Full support |
| TC05-15 | Mobile | Responsive design | Works on mobile |

---

## 10. Code Examples

Đã bao gồm đầy đủ trong section 6.

---

## 11. Security Considerations

### 11.1 Best Practices

- ✅ Validate file type and size
- ✅ Sanitize user input
- ✅ Check authorization before update
- ✅ Secure file upload (EdgeStore)
- ✅ Rate limiting on updates
- ✅ Audit logging

### 11.2 File Upload Security

- Max file size: 5MB
- Allowed types: image/*
- Virus scanning (EdgeStore handles)
- CDN delivery (EdgeStore)
- Automatic optimization

---

## 12. Performance Optimization

### 12.1 Metrics

- **Target:** < 2s update time
- **Avatar upload:** < 5s
- **Form validation:** < 100ms

### 12.2 Optimizations

- Debounce form validation
- Lazy load avatar upload
- Optimize images (EdgeStore auto)
- Cache user profile
- Optimistic UI updates

---

## 13. Related Use Cases

- [UC02 - Đăng ký](./UC02-register.md)
- [UC06 - Đổi mật khẩu](./UC06-change-password.md)

---

## 14. References

- [React Hook Form](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)
- [EdgeStore](https://edgestore.dev/)
- [Convex Mutations](https://docs.convex.dev/database/writing-data)

---

**Last Updated:** 02/12/2025  
**Status:** Ready for implementation  
**Estimated Effort:** 3-4 days
