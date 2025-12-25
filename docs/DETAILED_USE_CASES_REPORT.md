# ĐẶC TẢ CHI TIẾT USE CASE (CẬP NHẬT THEO CODEBASE THỰC TẾ)

Dưới đây là tài liệu chi tiết cho toàn bộ 19 Use Case của hệ thống PLMS, được cập nhật chính xác theo kiến trúc **Next.js + Convex + Clerk + SambaNova**. Bạn có thể dùng nội dung này để đưa vào chương "Đặc tả Use Case" trong báo cáo.

---

## I. NHÓM CHỨC NĂNG HỆ THỐNG & TÀI KHOẢN (UC01 - UC06)

### UC01: Đăng nhập (Login)
*   **Mô tả:** Người dùng truy cập hệ thống bằng tài khoản đã đăng ký thông qua Clerk (Google, Email, GitHub).
*   **Tác nhân:** Người dùng (Học sinh/Sinh viên).
*   **Điều kiện tiên quyết:** Đã có tài khoản hoặc tài khoản mạng xã hội hợp lệ.
*   **Dòng sự kiện chính:**
    1.  Người dùng nhấn nút "Login" trên trang chủ.
    2.  Hệ thống chuyển hướng sang trang đăng nhập của Clerk.
    3.  Người dùng chọn phương thức (Google/GitHub/Email) và nhập thông tin.
    4.  Clerk xác thực thành công và trả về Token.
    5.  Hệ thống (Convex) nhận Token, lưu thông tin vào bảng `users` (nếu lần đầu) và bảng `loginLogs`.
    6.  Chuyển hướng người dùng vào trang Dashboard chính (`/documents`).
*   **Ngoại lệ:**
    *   Sai mật khẩu/Email: Clerk báo lỗi và yêu cầu nhập lại.
    *   Mất mạng: Báo lỗi kết nối.

### UC02: Đăng ký (Register)
*   **Mô tả:** Người dùng tạo tài khoản mới.
*   **Tác nhân:** Người dùng (Khách).
*   **Dòng sự kiện chính:**
    1.  Người dùng nhấn "Get Jotion free".
    2.  Chuyển hướng sang Clerk Register.
    3.  Người dùng nhập Email/Password hoặc chọn Google.
    4.  Nhập mã OTP xác thực (nếu dùng Email).
    5.  Hệ thống tạo bản ghi người dùng mới trong Convex và khởi tạo không gian làm việc mặc định.
    
### UC04: Quên mật khẩu (Forgot Password)
*   **Cơ chế:** Xử lý hoàn toàn bởi Clerk.
*   **Mô tả:** Người dùng yêu cầu reset mật khẩu qua email.

### UC05: Cập nhật thông tin cá nhân
*   **Mô tả:** Người dùng đổi tên hiển thị hoặc avatar.
*   **Thực hiện:**
    1.  Vào phần Settings -> Profile.
    2.  Sửa tên hoặc upload ảnh mới (lưu vào EdgeStore).
    3.  Nhấn Save -> Gọi mutation `updateUser` xuống Convex.

---

## II. NHÓM CHỨC NĂNG QUẢN LÝ TÀI LIỆU (UC07 - UC13)

### UC07: Tạo trang tài liệu mới (Create Document)
*   **Mô tả:** Tạo một trang ghi chú trắng hoặc từ mẫu.
*   **Tác nhân:** Người dùng.
*   **Dòng sự kiện chính:**
    1.  Người dùng nhấn nút "+" trên thanh Sidebar.
    2.  Hệ thống gọi mutation `createDocument`.
    3.  Convex tạo bản ghi mới trong bảng `documents` với `userId` hiện tại.
    4.  Giao diện tự động mở trang vừa tạo và focus vào tiêu đề.

### UC08: Cập nhật tiêu đề & meta (Update Document)
*   **Mô tả:** Đổi tên, thêm icon, thêm ảnh bìa.
*   **Dòng sự kiện chính:**
    1.  Người dùng click vào tiêu đề trang hoặc icon.
    2.  Nhập nội dung mới.
    3.  Hệ thống **tự động lưu** (Auto-save) sau mỗi lần gõ (Debounce 500ms).
    4.  Mutation `update` được gọi để đồng bộ xuống DB.

### UC09: Soạn thảo nội dung (Edit Content)
*   **Công nghệ:** BlockNote (Notion-style editor).
*   **Mô tả:** Soạn thảo văn bản, checklist, heading, table.
*   **Dòng sự kiện chính:**
    1.  Người dùng gõ nội dung vào vùng soạn thảo.
    2.  Trình soạn thảo chuyển đổi nội dung sang dạng JSON blocks.
    3.  Gửi JSON này xuống Convex `update` trường `content`.
    4.  **Real-time:** Nếu mở trên tab khác, nội dung tự động cập nhật ngay lập tức.

### UC11: Xóa tạm thời (Soft Delete)
*   **Mô tả:** Đưa tài liệu vào thùng rác (`isArchived = true`).
*   **Dòng sự kiện:**
    1.  Người dùng nhấn menu "..." -> chọn "Delete".
    2.  Hệ thống gọi mutation `archive`.
    3.  Tài liệu biến mất khỏi Sidebar, chuyển vào mục "Trash".
    4.  Các tài liệu con (nếu có) cũng bị ẩn theo.

### UC12: Khôi phục / Xóa vĩnh viễn
*   **Mô tả:** Xử lý trong Trash box.
*   **Dòng sự kiện:**
    1.  Mở Trash box.
    2.  Tìm tài liệu cần xử lý.
    3.  Nhấn "Restore": Đặt lại `isArchived = false` (Tài liệu xuất hiện lại ở Sidebar).
    4.  Nhấn "Delete forever": Gọi mutation `remove` để xóa sạch khỏi CSDL.

### UC13: Tìm kiếm (Search)
*   **Mô tả:** Tìm nhanh tài liệu thao tiêu đề (CMD + K).
*   **Dòng sự kiện:**
    1.  Nhấn CMD+K.
    2.  Nhập từ khóa.
    3.  Hệ thống query Convex (dùng Index `search`) trả về danh sách gợi ý.
    4.  Click vào kết quả -> Mở trang tương ứng.

---

## III. NHÓM CHỨC NĂNG LỊCH & SỰ KIỆN (UC15 - UC16)

### UC15: Quản lý Lịch học (Manage Schedules)
*   **Mô tả:** Quản lý thời khóa biểu lặp lại hàng tuần.
*   **Tác nhân:** Sinh viên.
*   **Quy trình:**
    1.  Vào menu "Schedule".
    2.  Click vào ô trống trên lưới hoặc nút "Add Schedule".
    3.  **Modal hiện ra:** Nhập Môn học, Thời gian (07:00 - 09:00), Phòng, Giảng viên.
    4.  Nhấn Lưu -> Gọi mutation `createSchedule`.
    5.  Lưới lịch tự động vẽ lại ô màu tương ứng.

### UC16: Xem Lịch tổng quan (Calendar View)
*   **Mô tả:** Xem lịch tháng bao gồm cả TKB và các sự kiện riêng lẻ (Deadline).
*   **Hiển thị:** Dùng thư viện `react-big-calendar`.
*   **Luồng:**
    1.  Frontend fetch dữ liệu từ 2 bảng: `schedules` và `events`.
    2.  Merge dữ liệu: Biến đổi `schedules` lặp lại thành các event cho tháng hiện tại.
    3.  Hiển thị lên lịch.

---

## IV. NHÓM CHỨC NĂNG AI (UC18 - UC19) - QUAN TRỌNG

Chức năng này đã được cập nhật logic từ Gemini sang SambaNova + HuggingFace.

### UC18: Tóm tắt tài liệu (Summarize Document)
*   **Mô tả:** Sử dụng AI để đọc nội dung trang hiện tại và viết tóm tắt ngắn gọn.
*   **Tác nhân:** Người dùng.
*   **Điều kiện:** Tài liệu phải có nội dung (>100 ký tự).
*   **Dòng sự kiện chính:**
    1.  Người dùng nhấn nút "Summarize with AI" trên thanh công cụ.
    2.  Frontend gọi Action `summarizeDocument(documentId)`.
    3.  **Backend (Convex):**
        *   Bước 3a: Lấy nội dung text từ `document.content`.
        *   Bước 3b: Hash nội dung để kiểm tra Cache trong bảng `aiSummaries`.
        *   Bước 3c: Nếu chưa có Cache -> Gọi API **SambaNova (Llama 3.1)**.
        *   Bước 3d (Fallback): Nếu SambaNova lỗi -> Gọi **Hugging Face (BART-Large)**.
    4.  Lưu kết quả vào bảng `aiSummaries`.
    5.  Trả về kết quả cho Frontend hiển thị dưới dạng popup/block.
*   **Ngoại lệ:**
    *   Hết quota/API lỗi: Hiện thông báo "Hệ thống AI đang bận".
    *   Nội dung quá ngắn: Cảnh báo người dùng viết thêm.

### UC19: Chat với tài liệu (Chat with Document)
*   **Mô tả:** Hỏi đáp ngữ cảnh (Context-aware QA) dựa trên nội dung trang đang mở.
*   **Dòng sự kiện chính:**
    1.  Người dùng mở Sidebar Chat (phải).
    2.  Nhập câu hỏi: *"Hạn nộp bài này là khi nào?"*.
    3.  Nhấn Send.
    4.  **Backend xử lý:**
        *   Tạo/Lấy `chatSession` cho tài liệu này.
        *   Lấy toàn bộ nội dung tài liệu làm "System Context".
        *   Gửi Prompt = Context + Lịch sử chat + Câu hỏi mới -> **SambaNova**.
        *   Nhận câu trả lời streaming hoặc text.
    5.  Lưu tin nhắn vào bảng `chatMessages`.
    6.  Giao diện hiển thị tin nhắn trả lời của AI.

---

## V. NHÓM CHỨC NĂNG KHÁC

### UC14: Database Table (Bảng dữ liệu)
*   **Mô tả:** Tạo các bảng quán lý task, điểm số (giống Notion Database).
*   **Chức năng con:** Thêm cột (Text, Number, Date), Thêm dòng, Sửa ô dữ liệu.

### UC17: Thông báo (Notifications)
*   **Mô tả:** Nhận thông báo về Deadline sắp tới hoặc nhắc nhở từ lịch.
*   **Cơ chế:** Convex Cron Jobs (chạy ngầm) quét các Event sắp diễn ra -> Tạo bản ghi trong bảng `notifications`.

### UC20: Publish (Xuất bản)
*   **Mô tả:** Chia sẻ trang ra public.
*   **Quy trình:**
    1.  Nhấn nút "Share".
    2.  Bật toggle "Publish to web".
    3.  Hệ thống sinh URL duy nhất (VD: `plms.app/preview/doc-id-123`).
    4.  Người ngoài (không cần login) có thể xem nội dung này (Read-only).
