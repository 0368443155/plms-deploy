# CÁC BIỂU ĐỒ UML CHO BÁO CÁO (CẬP NHẬT THEO CODEBASE THỰC TẾ)

Tài liệu này chứa mã nguồn Mermaid cho các biểu đồ UML cần thiết để đưa vào báo cáo. Bạn có thể copy mã này vào [Mermaid Live Editor](https://mermaid.live/) để xuất ra hình ảnh chất lượng cao.

## 1. Biểu đồ Use Case (Use Case Diagram)

Cập nhật để phản ánh đúng các chức năng hiện có trong `plms-deploy`, bao gồm quản lý tài liệu, lịch học, và tính năng AI mới (SambaNova/HuggingFace).

```mermaid
usecaseDiagram
    actor "Người dùng (User)" as U
    actor "Hệ thống (System)" as S
    actor "SambaNova / HuggingFace" as AI
    actor "Clerk Auth" as Auth

    package "Hệ thống PLMS" {
        usecase "Đăng nhập / Đăng ký" as UC1
        usecase "Quản lý Tài liệu (BlockNote)" as UC2
        usecase "Quản lý Lịch học" as UC3
        usecase "Tóm tắt tài liệu bằng AI" as UC4
        usecase "Chat với tài liệu (AI)" as UC5
        usecase "Quản lý Bảng dữ liệu" as UC6
        usecase "Nhận thông báo" as UC7
    }

    U --> UC1
    U --> UC2
    U --> UC3
    U --> UC4
    U --> UC5
    U --> UC6
    U --> UC7

    UC1 ..> Auth : "Xác thực"
    UC4 ..> AI : "Gửi context tài liệu"
    UC5 ..> AI : "Hỏi đáp ngữ cảnh"
```

## 2. Biểu đồ Lớp (Class Diagram)

Dựa trên `convex/schema.ts`, phản ánh chính xác các bảng dữ liệu thực tế đang chạy trên Convex.

```mermaid
classDiagram
    class User {
        +String clerkId
        +String fullName
        +String email
        +String avatarUrl
        +Number createdAt
    }

    class Document {
        +String title
        +String userId
        +String content (JSON/BlockNote)
        +String coverImage
        +String icon
        +Boolean isPublished
        +Boolean isArchived
        +String parentDocumentId
    }

    class Schedule {
        +String subjectName
        +Number dayOfWeek
        +String startTime
        +String endTime
        +String room
        +String teacher
    }

    class ChatSession {
        +String userId
        +String documentId
        +String title
        +Number createdAt
    }

    class ChatMessage {
        +String sessionId
        +String role (user/assistant)
        +String content
        +String model
    }

    class AISummary {
        +String documentId
        +String summary
        +String contentHash
        +String model
    }

    User "1" --> "*" Document : "Sở hữu"
    User "1" --> "*" Schedule : "Có"
    Document "1" --> "*" Document : "Cha/Con"
    Document "1" --> "*" AISummary : "Có"
    Document "1" --> "*" ChatSession : "Ngữ cảnh cho"
    ChatSession "1" --> "*" ChatMessage : "Chứa"
```

## 3. Biểu đồ Tuần tự (Sequence Diagrams)

### 3.1. Luồng Chat với AI (Cập nhật logic SambaNova -> HuggingFace)

Đây là logic quan trọng vừa được refactor trong `convex/ai.ts`.

```mermaid
sequenceDiagram
    participant User as Người dùng
    participant UI as Giao diện (Next.js)
    participant Convex as Backend (Convex)
    participant Samba as SambaNova API
    participant HF as HuggingFace (Fallback)

    User->>UI: Gửi câu hỏi "Tóm tắt bài này"
    UI->>Convex: call action chatWithAI(message, docId)
    activate Convex
    Convex->>Convex: Lấy nội dung Document
    Convex->>Convex: Lấy lịch sử ChatSession

    note right of Convex: Thử ưu tiên SambaNova (Llama 3.1)
    Convex->>Samba: POST /chat/completions
    
    alt SambaNova thành công
        Samba-->>Convex: Trả về câu trả lời
    else SambaNova thất bại / Hết quota
        Convex->>Convex: Log lỗi
        note right of Convex: Fallback sang Hugging Face
        Convex->>HF: POST /models/dialogpt
        HF-->>Convex: Trả về câu trả lời
    end

    Convex->>Convex: Lưu tin nhắn vào DB (chatMessages)
    Convex-->>UI: Trả về câu trả lời + Model đã dùng
    deactivate Convex
    UI-->>User: Hiển thị câu trả lời
```

### 3.2. Luồng Tạo Lịch học

```mermaid
sequenceDiagram
    participant User
    participant Modal as AddScheduleModal
    participant Convex

    User->>Modal: Nhập thông tin (Môn, Ngày, Giờ)
    User->>Modal: Bấm "Lưu"
    Modal->>Convex: call mutation createSchedule()
    activate Convex
    Convex->>Convex: Validate dữ liệu
    Convex->>Convex: Insert vào bảng 'schedules'
    Convex-->>Modal: Trả về scheduleId mới
    deactivate Convex
    Modal-->>User: Đóng modal, cập nhật lưới lịch
```

## 4. Biểu đồ Hoạt động (Activity Diagram)

Mô tả chi tiết giải thuật xử lý AI Fallback trong `summarizeDocumentHandler`.

```mermaid
flowchart TD
    A[Bắt đầu Tóm tắt] --> B{Kiểm tra Cache?}
    B -- Có cache & Hash khớp --> C[Trả về kết quả từ Cache]
    B -- Không có / Force Regenerate --> D[Lấy nội dung Document]
    
    D --> E{Có API Key SambaNova?}
    E -- Có --> F[Gọi SambaNova API]
    E -- Không --> G
    
    F --> H{Thành công?}
    H -- OK --> I[Lưu kết quả + Model 'SambaNova']
    H -- Lỗi --> G[Gọi HuggingFace API (Fallback)]
    
    G --> J{Thành công?}
    J -- OK --> K[Lưu kết quả + Model 'HuggingFace']
    J -- Lỗi --> L[Throw Error: Hệ thống bận]
    
    I --> M[Lưu vào bảng aiSummaries]
    K --> M
    M --> N[Trả về kết quả cho Client]
    C --> N
    N --> O[Kết thúc]
```

## 5. Biểu đồ Triển khai (Deployment Diagram)

Thể hiện kiến trúc hiện đại của dự án (Next.js + Convex).

```mermaid
deploymentDiagram
    node "Client Device" {
        component "Web Browser" as Browser
    }

    node "Vercel Cloud" {
        component "Next.js Frontend" as NextJS
    }

    node "Convex Cloud" {
        database "Realtime Database" as DB
        component "Backend Functions" as Functions
    }

    node "External Services" {
        component "Clerk Auth" as Clerk
        component "EdgeStore (Files)" as EdgeStore
        component "SambaNova AI" as AIService
    }

    Browser -- HTTPS --> NextJS
    NextJS -- HTTPS/WSS --> Functions
    Functions -- Read/Write --> DB
    Browser -- Auth Tokens --> Clerk
    NextJS -- Validate Token --> Clerk
    Functions -- API Call --> AIService
    Browser -- Uploads --> EdgeStore
```
