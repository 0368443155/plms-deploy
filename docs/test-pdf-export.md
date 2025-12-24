# Test PDF Export - Page Break Fix

## Cách test

1. Mở một document có nội dung dài (nhiều đoạn văn, heading, list)
2. Click nút "Export" → "Export as PDF"
3. Mở file PDF và kiểm tra:

## Checklist ✅

### 1. Văn bản không bị cắt ngang
- [ ] Không có dòng chữ nào bị chia đôi giữa 2 trang
- [ ] Tất cả các ký tự trong 1 dòng đều ở cùng 1 trang

### 2. Heading và nội dung
- [ ] Heading không bị tách rời khỏi nội dung phía sau
- [ ] Nếu heading ở cuối trang, nó sẽ được đẩy sang trang mới cùng với nội dung

### 3. Danh sách (Lists)
- [ ] Các mục danh sách không bị cắt ngang
- [ ] Danh sách con (nested) được giữ nguyên vẹn

### 4. Đoạn văn (Paragraphs)
- [ ] Đoạn văn không bị cắt ngang
- [ ] Tối thiểu 3 dòng ở cuối trang trước khi ngắt (orphans)
- [ ] Tối thiểu 3 dòng ở đầu trang sau khi ngắt (widows)

### 5. Code blocks
- [ ] Code blocks không bị cắt ngang
- [ ] Nếu code block quá dài, nó sẽ được đẩy sang trang mới

### 6. Bảng (Tables)
- [ ] Bảng không bị cắt ngang hàng
- [ ] Nếu bảng quá dài, nó sẽ ngắt ở ranh giới hàng

### 7. Format chung
- [ ] Font: Arial, 14px
- [ ] Line height: 1.6
- [ ] Margin: 10mm ở tất cả các cạnh
- [ ] Background: Trắng
- [ ] Text color: Đen

## Test Cases

### Test Case 1: Văn bản dài
**Nội dung:**
- 5-10 đoạn văn, mỗi đoạn 5-10 dòng
- Một số heading xen kẽ

**Kỳ vọng:**
- Không có dòng chữ nào bị cắt đôi
- Heading luôn đi kèm với ít nhất 1 đoạn văn phía sau

### Test Case 2: Danh sách dài
**Nội dung:**
- Danh sách có 20-30 mục
- Có danh sách con (nested)

**Kỳ vọng:**
- Các mục không bị cắt ngang
- Danh sách con không bị tách khỏi mục cha

### Test Case 3: Code blocks
**Nội dung:**
- Nhiều code blocks dài (10-20 dòng)

**Kỳ vọng:**
- Code blocks không bị cắt ngang
- Nếu quá dài, được đẩy sang trang mới

### Test Case 4: Hỗn hợp
**Nội dung:**
- Kết hợp văn bản, heading, list, code, blockquote

**Kỳ vọng:**
- Tất cả các phần tử đều được giữ nguyên vẹn
- Ngắt trang thông minh, không cắt ngang bất kỳ phần tử nào

## Nội dung mẫu để test

Bạn có thể copy nội dung sau vào document để test:

### Tiêu đề 1: Giới thiệu

Đây là một đoạn văn dài để test việc ngắt trang. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

### Tiêu đề 2: Danh sách

1. Mục thứ nhất với nội dung dài để test
2. Mục thứ hai với nội dung dài để test
3. Mục thứ ba với nội dung dài để test
   - Mục con 3.1
   - Mục con 3.2
   - Mục con 3.3
4. Mục thứ tư
5. Mục thứ năm

### Tiêu đề 3: Code Example

```javascript
function exportToPDF(element, filename) {
  const options = {
    margin: [10, 10, 10, 10],
    filename: `${filename}.pdf`,
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy'],
      avoid: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    },
  };
  
  return html2pdf().set(options).from(element).save();
}
```

### Tiêu đề 4: Kết luận

Đây là phần kết luận với nhiều đoạn văn để đảm bảo PDF có ít nhất 2-3 trang.

(Lặp lại nội dung trên nhiều lần để tạo document dài)

## Lưu ý khi test

1. **Browser**: Test trên Chrome/Edge để có kết quả tốt nhất
2. **Content**: Nội dung càng dài càng dễ phát hiện lỗi
3. **Variety**: Test với nhiều loại nội dung khác nhau
4. **Zoom**: Mở PDF ở zoom 100% để xem rõ nhất

## Báo lỗi

Nếu phát hiện lỗi, ghi chú:
- Loại nội dung bị lỗi (paragraph, heading, list, etc.)
- Vị trí lỗi (trang số mấy)
- Screenshot nếu có thể
- Nội dung cụ thể bị cắt
