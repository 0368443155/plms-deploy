# MÔ PHỎNG TRỰC QUAN CÁC BIỂU ĐỒ (DÙNG ĐỂ VẼ LẠI)

Dưới đây là các hình vẽ mô phỏng dạng text (ASCII Art) minh họa bố cục và các đường nối. Bạn hãy nhìn vào đây để vẽ lại trên Draw.io hoặc Word.

---

## 1. BIỂU ĐỒ USE CASE (CHỨC NĂNG)

**Bố cục:**
- **Bên trái:** Hình nhân vật "User" (Người dùng).
- **Ở giữa:** Một hình chữ nhật lớn đại diện cho "Hệ thống PLMS".
- **Bên trong hình chữ nhật:** Các hình bầu dục (Elip) là các chức năng.
- **Bên phải:** Các hình nhân vật đại diện cho hệ thống bên ngoài (AI, Clerk).

**Hình mô phỏng:**

```text
       [Actor: User]                                         [Actor: Clerk Auth]
             |                                                       ^
             | (1. Đăng nhập/Đăng ký)                                |
             +-------------------------------------------------------+
             |
             v
  +-----------------------------------------------------------+
  |                   HỆ THỐNG PLMS                           |
  |                                                           |
  |   (O) <--- 1. Quản lý Tài liệu                            |
  |            (Tạo, Sửa, Xóa Note/Page)                      |
  |                                                           |
  |   (O) <--- 2. Quản lý Lịch học                            |
  |            (Thêm lịch, Xem TKB)                           |
  |                                                           |
  |   (O) <--- 3. Tóm tắt tài liệu (AI) ------------------+   |
  |                                                       |   |      [Actor: AI System]
  |   (O) <--- 4. Chat với tài liệu (AI) -----------------+---+----> (SambaNova / HF)
  |                                                           |
  |   (O) <--- 5. Quản lý Bảng dữ liệu                        |
  |                                                           |
  +-----------------------------------------------------------+
```

---

## 2. BIỂU ĐỒ LỚP (CLASS DIAGRAM)

**Bố cục:** Các hình chữ nhật chia làm 3 ngăn (Tên lớp, Thuộc tính, Phương thức).
**Quan hệ:**
- User (1) ---- (*) Document
- User (1) ---- (*) Schedule
- Document (1) ---- (*) ChatSession

**Hình mô phỏng:**

```text
+------------------+         1..* +------------------------+
|      USER        |--------------|       SCHEDULE         |
+------------------+              +------------------------+
| - clerkId        |              | - subjectName: string  |
| - email          |              | - dayOfWeek: number    |
| - fullName       |              | - startTime: string    |
+------------------+              | - room: string         |
         | 1                      +------------------------+
         |
         | 0..* (Sở hữu)
         v
+------------------+         0..* +------------------------+
|    DOCUMENT      |--------------|      AI_SUMMARY        |
+------------------+              +------------------------+
| - title: string  |              | - summary: string      |
| - content: json  |              | - model: string        |
| - isPublished    |              +------------------------+
+------------------+
         | 1
         |
         | 0..* (Ngữ cảnh)
         v
+------------------+         1..* +------------------------+
|   CHAT_SESSION   |--------------|    CHAT_MESSAGE        |
+------------------+              +------------------------+
| - title: string  |              | - role: user/ai        |
| - createdAt      |              | - content: text        |
+------------------+              +------------------------+
```

---

## 3. BIỂU ĐỒ TUẦN TỰ (SEQUENCE - CHAT VỚI AI)

**Bố cục:** Các cột dọc đại diện cho các đối tượng. Mũi tên ngang là các bước thực hiện theo thời gian từ trên xuống.

**Hình mô phỏng:**

```text
User            Next.js (UI)         Convex (Backend)      SambaNova API       HuggingFace API
 |                   |                      |                    |                    |
 |---(Gửi câu hỏi)-->|                      |                    |                    |
 |                   |----(Gọi Action)----->|                    |                    |
 |                   |                      |                    |                    |
 |                   |                      |---(1. Thử gọi)---> |                    |
 |                   |                      |                    |                    |
 |                   |                      | <--(2a. Lỗi/Fail)- |                    |
 |                   |                      |                    |                    |
 |                   |                      |-------------------(3. Fallback)-------> |
 |                   |                      |                    |                    |
 |                   |                      | <--(4. Trả về KQ)--+------------------- |
 |                   |                      |                    |                    |
 |                   |                      |---(5. Lưu DB)      |                    |
 |                   |                      |                    |                    |
 |                   |<--(6. Hiển thị Chat)-|                    |                    |
 |<--(Xem kết quả)---|                      |                    |                    |
 v                   v                      v                    v                    v
```

---

## 4. BIỂU ĐỒ HOẠT ĐỘNG (ACTIVITY - XỬ LÝ AI)

**Bố cục:** Hình thoi là quyết định (Yes/No), Hình chữ nhật bo tròn là hành động.

**Hình mô phỏng:**

```text
      ( Bắt đầu )
           |
           v
   [ Kiểm tra Cache? ]
           |
      +----+----+
      |         |
    (Có)     (Không)
      |         |
      |         v
      |   [ Lấy nội dung Doc ]
      |         |
      |         v
      |   < Có Key SambaNova? >
      |      /        \
      |   (Có)      (Không)
      |    /            \
      |   v              v
      | [ Gọi Samba ]  [ Gọi HF (Fallback) ]
      |   |                  |
      |   v                  v
      | < Thành công? >      < Thành công? >
      |  /      \            /       \
      | (OK)   (Lỗi)-------(Lỗi)    (OK)
      |  |        \         /         |
      |  v         v       v          v
      | [Lưu Cache]--<--[Throw Error] [Lưu Cache]
      |      |                          |
      +------+--------------------------+
             |
             v
      ( Trả về kết quả )
             |
       ( Kết thúc )
```

---

## 5. BIỂU ĐỒ TRIỂN KHAI (DEPLOYMENT)

**Bố cục:** Các hình hộp 3D (Node) chứa các thành phần bên trong.

**Hình mô phỏng:**

```text
+---------------------------+              +-----------------------------+
|      Client (Browser)     |              |       Cloud (Vercel)        |
|                           |   HTTPS      |                             |
|  [ Giao diện Next.js ]<---+------------->|  [ Next.js Server / CDN ]   |
|                           |              |                             |
+---------------------------+              +-----------------------------+
            |                                           ^
            | WSS / HTTPS (API Call)                    |
            v                                           |
+---------------------------+                           |
|      Backend (Convex)     |                           |
|                           |                           |
|  [ Convex Functions ]     |                           |
|          |                |                           |
|          v                |                           |
|  ( Database Storage )     |                           |
+---------------------------+                           |
            |                                           |
            | API Call                                  |
            v                                           |
+---------------------------+              +-----------------------------+
|    AI Services Provider   |              |      Authentication         |
|                           |              |                             |
|  [ SambaNova / HF API ]   |              |       [ Clerk.com ]         |
|                           |              +-----------------------------+
+---------------------------+
```
