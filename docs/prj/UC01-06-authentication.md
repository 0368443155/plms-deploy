# 🔐 UC01-UC06: AUTHENTICATION MODULE

## 📋 Mục lục
1. [Tổng quan](#1-tổng-quan)
2. [UC01: Đăng nhập](#2-uc01-đăng-nhập)
3. [UC02: Đăng ký](#3-uc02-đăng-ký)
4. [UC03: Đăng xuất](#4-uc03-đăng-xuất)
5. [UC04: Quên mật khẩu](#5-uc04-quên-mật-khẩu)
6. [UC05: Cập nhật thông tin](#6-uc05-cập-nhật-thông-tin)
7. [UC06: Đổi mật khẩu](#7-uc06-đổi-mật-khẩu)
8. [Cơ chế bảo mật](#8-cơ-chế-bảo-mật)

---

## 1. Tổng quan

### 1.1 Authentication Provider: Clerk

PLMS sử dụng **Clerk** làm authentication provider. Clerk xử lý:
- User management
- Session management
- JWT tokens
- OAuth (Google, GitHub)
- Email verification
- Password reset

### 1.2 Kiến trúc Authentication

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    ClerkProvider                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │              ConvexProviderWithClerk                 │  │  │
│  │  │  ┌───────────────────────────────────────────────┐  │  │  │
│  │  │  │                 App Components                 │  │  │  │
│  │  │  │                                                │  │  │  │
│  │  │  │  useUser()  │  useAuth()  │  useConvexAuth() │  │  │  │
│  │  │  └───────────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CLERK                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Users     │  │  Sessions   │  │    JWT      │             │
│  │  Database   │  │  Management │  │   Tokens    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ JWT Token in Header
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CONVEX                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ctx.auth.getUserIdentity() → { subject: "user_xxx" }   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Files liên quan

```
app/
├── layout.tsx                    # ClerkProvider wrapping
├── (marketing)/
│   ├── page.tsx                  # Landing page
│   └── _components/
│       └── heroes.tsx            # Login/Signup buttons
│
components/
├── providers/
│   └── convex-provider.tsx       # ConvexProviderWithClerk
│
lib/
└── utils.ts                      # Validation functions
```

---

## 2. UC01: Đăng nhập

### 2.1 Luồng đăng nhập

```
┌─────────┐   ┌───────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│  User   │   │   Page    │   │  Clerk  │   │ Convex  │   │   App   │
└────┬────┘   └─────┬─────┘   └────┬────┘   └────┬────┘   └────┬────┘
     │              │              │              │              │
     │ Click Login  │              │              │              │
     │─────────────►│              │              │              │
     │              │              │              │              │
     │              │ <SignInButton│              │              │
     │              │     mode="modal">           │              │
     │◄─────────────│              │              │              │
     │              │              │              │              │
     │  Open Modal  │              │              │              │
     │─────────────────────────────►              │              │
     │              │              │              │              │
     │ Enter email/password        │              │              │
     │─────────────────────────────►              │              │
     │              │              │              │              │
     │              │              │ Validate     │              │
     │              │              │─────────────►│              │
     │              │              │              │              │
     │              │              │◄─────────────│              │
     │              │              │   OK/Error   │              │
     │              │              │              │              │
     │◄─────────────────────────────              │              │
     │         Success + JWT       │              │              │
     │              │              │              │              │
     │              │              │              │ Redirect to  │
     │              │              │              │ /documents   │
     │─────────────────────────────────────────────────────────►│
```

### 2.2 Code: SignIn Button

```tsx
// app/(marketing)/_components/heroes.tsx
import { SignInButton } from "@clerk/clerk-react";

export const Heroes = () => {
  const { isSignedIn } = useConvexAuth();

  return (
    <div>
      {isSignedIn ? (
        // Nếu đã đăng nhập, hiện nút vào app
        <Button asChild>
          <Link href="/documents">Vào PLMS</Link>
        </Button>
      ) : (
        // Nếu chưa đăng nhập, hiện nút đăng nhập
        <SignInButton mode="modal">
          <Button>Đăng nhập</Button>
        </SignInButton>
      )}
    </div>
  );
};
```

### 2.3 Code: Auth Provider Setup

```tsx
// components/providers/convex-provider.tsx
"use client";

import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const ConvexClientProvider = ({ children }) => {
  return (
    <ClerkProvider 
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
    >
      <ConvexProviderWithClerk 
        useAuth={useAuth} 
        client={convex}
      >
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
};
```

### 2.4 Xác thực trong Convex

```typescript
// convex/documents.ts
export const getById = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    // ============================================
    // BƯỚC 1: Lấy thông tin user từ JWT token
    // ============================================
    // ctx.auth.getUserIdentity() đọc JWT token từ header
    // và trả về thông tin user đã xác thực
    const identity = await ctx.auth.getUserIdentity();

    // ============================================
    // BƯỚC 2: Kiểm tra đã đăng nhập chưa
    // ============================================
    // identity = null nếu chưa đăng nhập hoặc token hết hạn
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // ============================================
    // BƯỚC 3: Lấy userId
    // ============================================
    // identity.subject = Clerk user ID (ví dụ: "user_2abc...")
    const userId = identity.subject;

    // ============================================
    // BƯỚC 4: Query data
    // ============================================
    const document = await ctx.db.get(args.documentId);

    if (!document) {
      throw new Error("Not found");
    }

    // ============================================
    // BƯỚC 5: Authorization - Kiểm tra quyền truy cập
    // ============================================
    // Chỉ owner hoặc document đã publish mới được xem
    if (document.userId !== userId && !document.isPublished) {
      throw new Error("Unauthorized");
    }

    return document;
  },
});
```

---

## 3. UC02: Đăng ký

### 3.1 Luồng đăng ký

```
┌─────────┐   ┌───────────┐   ┌─────────┐   ┌─────────┐
│  User   │   │   Form    │   │  Clerk  │   │  Email  │
└────┬────┘   └─────┬─────┘   └────┬────┘   └────┬────┘
     │              │              │              │
     │ Click Signup │              │              │
     │─────────────►│              │              │
     │              │              │              │
     │              │ <SignUpButton│              │
     │              │     mode="modal">           │
     │◄─────────────│              │              │
     │              │              │              │
     │ Enter info   │              │              │
     │─────────────►│              │              │
     │              │              │              │
     │              │ Validate     │              │
     │              │──────────────►              │
     │              │              │              │
     │              │              │ Create user  │
     │              │              │──────────────│
     │              │              │              │
     │              │              │ Send verify  │
     │              │              │─────────────►│
     │              │              │              │
     │◄─────────────────────────────              │
     │    Need verification        │              │
     │              │              │              │
     │ Click email link            │              │
     │─────────────────────────────────────────────►
     │              │              │              │
     │              │              │◄─────────────│
     │              │              │   Verified   │
     │              │              │              │
     │◄─────────────────────────────              │
     │        Account created      │              │
```

### 3.2 Code: SignUp Button

```tsx
// app/(marketing)/_components/heroes.tsx
import { SignUpButton } from "@clerk/clerk-react";

<SignUpButton mode="modal">
  <Button variant="ghost">
    Đăng ký miễn phí
  </Button>
</SignUpButton>
```

### 3.3 Validation tiếng Việt

```typescript
// lib/utils.ts

// ============================================
// REGEX CHO TÊN TIẾNG VIỆT
// ============================================
// Bao gồm tất cả chữ cái tiếng Việt có dấu
const vietnameseNamePattern = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵýỷỹ\s]+$/;

// ============================================
// HÀM VALIDATE TÊN
// ============================================
export function validateName(name: string): { isValid: boolean; error?: string } {
  // Trim khoảng trắng
  const trimmedName = name.trim();
  
  // 1. Kiểm tra độ dài tối thiểu
  if (trimmedName.length < 2) {
    return {
      isValid: false,
      error: "Họ tên phải có ít nhất 2 ký tự"
    };
  }
  
  // 2. Kiểm tra độ dài tối đa
  if (trimmedName.length > 50) {
    return {
      isValid: false,
      error: "Họ tên không được quá 50 ký tự"
    };
  }
  
  // 3. Kiểm tra ký tự hợp lệ (chỉ chữ cái và khoảng trắng)
  if (!vietnameseNamePattern.test(trimmedName)) {
    return {
      isValid: false,
      error: "Họ tên chỉ được chứa chữ cái"
    };
  }
  
  // 4. Kiểm tra không chỉ có khoảng trắng
  if (trimmedName.replace(/\s/g, '').length === 0) {
    return {
      isValid: false,
      error: "Họ tên không được để trống"
    };
  }
  
  return { isValid: true };
}
```

---

## 4. UC03: Đăng xuất

### 4.1 Luồng đăng xuất

```
┌─────────┐   ┌───────────┐   ┌─────────┐   ┌─────────┐
│  User   │   │   Menu    │   │  Clerk  │   │ Browser │
└────┬────┘   └─────┬─────┘   └────┬────┘   └────┬────┘
     │              │              │              │
     │ Click Avatar │              │              │
     │─────────────►│              │              │
     │              │              │              │
     │◄─────────────│              │              │
     │  Show Menu   │              │              │
     │              │              │              │
     │ Click Logout │              │              │
     │─────────────►│              │              │
     │              │              │              │
     │              │ signOut()    │              │
     │              │─────────────►│              │
     │              │              │              │
     │              │              │ Clear session│
     │              │              │─────────────►│
     │              │              │              │
     │              │◄─────────────│              │
     │              │   Success    │              │
     │              │              │              │
     │◄─────────────────────────────              │
     │    Redirect to "/"          │              │
```

### 4.2 Code: SignOut Button

```tsx
// app/(main)/_components/user-item.tsx
import { SignOutButton, useUser } from "@clerk/clerk-react";

export const UserItem = () => {
  const { user } = useUser();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-x-2">
          <Avatar>
            <AvatarImage src={user?.imageUrl} />
          </Avatar>
          <span>{user?.fullName}</span>
        </div>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent>
        <div className="p-2">
          <p className="font-medium">{user?.fullName}</p>
          <p className="text-xs text-muted-foreground">
            {user?.emailAddresses[0].emailAddress}
          </p>
        </div>
        
        <DropdownMenuSeparator />
        
        {/* SignOutButton từ Clerk */}
        <SignOutButton>
          <DropdownMenuItem>
            <LogOut className="h-4 w-4 mr-2" />
            Đăng xuất
          </DropdownMenuItem>
        </SignOutButton>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

---

## 5. UC04: Quên mật khẩu

### 5.1 Luồng reset password

Clerk tự động xử lý toàn bộ flow này thông qua built-in UI:

```
┌─────────┐   ┌───────────┐   ┌─────────┐   ┌─────────┐
│  User   │   │  Clerk UI │   │  Clerk  │   │  Email  │
└────┬────┘   └─────┬─────┘   └────┬────┘   └────┬────┘
     │              │              │              │
     │ Click "Forgot│              │              │
     │  password"   │              │              │
     │─────────────►│              │              │
     │              │              │              │
     │ Enter email  │              │              │
     │─────────────►│              │              │
     │              │              │              │
     │              │ Request reset│              │
     │              │─────────────►│              │
     │              │              │              │
     │              │              │ Send email   │
     │              │              │─────────────►│
     │              │              │              │
     │◄─────────────────────────────              │
     │   Check email               │              │
     │              │              │              │
     │ Click reset link            │              │
     │─────────────────────────────────────────────►
     │              │              │              │
     │◄─────────────────────────────              │
     │   Reset form                │              │
     │              │              │              │
     │ Enter new password          │              │
     │─────────────►│              │              │
     │              │              │              │
     │              │ Update pwd   │              │
     │              │─────────────►│              │
     │              │              │              │
     │◄─────────────│              │              │
     │   Success    │              │              │
```

### 5.2 Clerk Configuration

Trong Clerk Dashboard:
1. **Email Templates** → Customize reset password email
2. **Paths** → Configure redirect URLs
3. **Session** → Token expiration settings

---

## 6. UC05: Cập nhật thông tin

### 6.1 Luồng cập nhật profile

```
┌─────────┐   ┌───────────┐   ┌─────────┐   ┌───────────┐
│  User   │   │ Profile   │   │  Clerk  │   │ EdgeStore │
│         │   │   Page    │   │   API   │   │  (Avatar) │
└────┬────┘   └─────┬─────┘   └────┬────┘   └─────┬─────┘
     │              │              │               │
     │ Navigate to  │              │               │
     │ /user-profile│              │               │
     │─────────────►│              │               │
     │              │              │               │
     │              │ user.update()│               │
     │              │─────────────►│               │
     │              │              │               │
     │ Change avatar│              │               │
     │─────────────►│              │               │
     │              │              │               │
     │              │ Upload image │               │
     │              │──────────────────────────────►
     │              │              │               │
     │              │◄─────────────────────────────│
     │              │   Image URL  │               │
     │              │              │               │
     │              │ user.update({│               │
     │              │   imageUrl   │               │
     │              │ })           │               │
     │              │─────────────►│               │
     │              │              │               │
     │◄─────────────│              │               │
     │   Updated    │              │               │
```

### 6.2 Code: Profile Page

```tsx
// app/(main)/(routes)/user-profile/page.tsx
"use client";

import { UserProfile } from "@clerk/clerk-react";

const UserProfilePage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <UserProfile
        appearance={{
          elements: {
            rootBox: {
              width: "100%",
              maxWidth: "900px",
            },
          },
        }}
      />
    </div>
  );
};

export default UserProfilePage;
```

### 6.3 Code: Avatar Upload

```tsx
// Phần upload avatar tùy chỉnh (nếu không dùng Clerk UI)
import { useUser } from "@clerk/clerk-react";
import { useEdgeStore } from "@/lib/edgestore";

const AvatarUpload = () => {
  const { user } = useUser();
  const { edgestore } = useEdgeStore();

  const handleUpload = async (file: File) => {
    // 1. Upload lên EdgeStore
    const response = await edgestore.publicFiles.upload({
      file,
      options: {
        replaceTargetUrl: user?.imageUrl, // Xóa ảnh cũ
      },
    });

    // 2. Cập nhật Clerk user
    await user?.setProfileImage({
      file: response.url,
    });
    
    // Hoặc:
    // await user?.update({
    //   imageUrl: response.url,
    // });
  };

  return (
    <SingleImageDropzone
      value={user?.imageUrl}
      onChange={handleUpload}
    />
  );
};
```

---

## 7. UC06: Đổi mật khẩu

### 7.1 Luồng đổi mật khẩu

```
┌─────────┐   ┌───────────┐   ┌─────────┐
│  User   │   │ Clerk UI  │   │  Clerk  │
└────┬────┘   └─────┬─────┘   └────┬────┘
     │              │              │
     │ Go to        │              │
     │ Security tab │              │
     │─────────────►│              │
     │              │              │
     │ Click Change │              │
     │  Password    │              │
     │─────────────►│              │
     │              │              │
     │◄─────────────│              │
     │ Password form│              │
     │              │              │
     │ Enter current│              │
     │ + new pwd    │              │
     │─────────────►│              │
     │              │              │
     │              │ Validate +   │
     │              │  Update      │
     │              │─────────────►│
     │              │              │
     │              │◄─────────────│
     │              │  Success     │
     │◄─────────────│              │
     │   Updated    │              │
```

### 7.2 Validation Rules

Clerk tự động validate:
- Mật khẩu hiện tại phải đúng
- Mật khẩu mới ≠ mật khẩu cũ
- Độ dài tối thiểu (configurable in dashboard)
- Strength requirements

---

## 8. Cơ chế bảo mật

### 8.1 JWT Token Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     JWT TOKEN STRUCTURE                      │
├─────────────────────────────────────────────────────────────┤
│  Header (Algorithm)                                          │
│  {                                                           │
│    "alg": "RS256",                                          │
│    "typ": "JWT"                                             │
│  }                                                           │
├─────────────────────────────────────────────────────────────┤
│  Payload                                                     │
│  {                                                           │
│    "sub": "user_2abc123...",     // User ID                 │
│    "iat": 1702694400,             // Issued at              │
│    "exp": 1702780800,             // Expiration             │
│    "iss": "https://clerk.xxx",    // Issuer                 │
│    "azp": "xxx"                   // Authorized party       │
│  }                                                           │
├─────────────────────────────────────────────────────────────┤
│  Signature (Private key signed)                              │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Token Verification in Convex

```typescript
// Convex tự động verify JWT với Clerk public key
// File: convex/auth.config.js

export default {
  providers: [
    {
      domain: "https://your-clerk-domain.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
```

### 8.3 Session Management

| Cấu hình | Giá trị | Mô tả |
|----------|---------|-------|
| Token Lifetime | 60 phút | JWT token expiration |
| Session Lifetime | 7 ngày | Clerk session duration |
| Multi-session | Enabled | Cho phép nhiều thiết bị |
| Inactivity timeout | 30 phút | Auto logout khi idle |

### 8.4 Authorization Pattern

```typescript
// Mọi mutation đều phải kiểm tra:
// 1. Authentication (đã đăng nhập?)
// 2. Authorization (có quyền không?)

export const update = mutation({
  args: { id: v.id("documents"), title: v.string() },
  handler: async (ctx, args) => {
    // AUTHENTICATION
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    
    // Lấy document
    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new Error("Not found");
    }

    // AUTHORIZATION - Chỉ owner mới được sửa
    if (document.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Tiến hành update
    await ctx.db.patch(args.id, { title: args.title });
  },
});
```

---

## 📊 Bảng tổng hợp API Authentication

| Use Case | API/Method | Authentication | Authorization |
|----------|------------|----------------|---------------|
| UC01 | Clerk SignIn | N/A | N/A |
| UC02 | Clerk SignUp | N/A | N/A |
| UC03 | Clerk SignOut | Required | N/A |
| UC04 | Clerk Reset | N/A | Email verify |
| UC05 | Clerk Update | Required | Self only |
| UC06 | Clerk Password | Required | Self only |

---

*Cập nhật lần cuối: 16/12/2024*
