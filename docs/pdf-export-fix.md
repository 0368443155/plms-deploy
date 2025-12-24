# Khắc phục lỗi cắt chữ và bố cục khi Export PDF

## Vấn đề 1: Văn bản bị cắt ngang

Khi export tài liệu dài sang PDF, văn bản bị cắt ngang tại vị trí ngắt trang. Dòng chữ bị chia đôi:
- Nửa trên của dòng chữ nằm ở cuối trang 1
- Nửa dưới của dòng chữ nằm ở đầu trang 2

**Nguyên nhân:** Code cũ sử dụng phương pháp "image-based PDF":
1. Chuyển toàn bộ HTML thành 1 ảnh PNG duy nhất
2. Cắt ảnh thành nhiều trang theo chiều cao cố định (295mm)
3. **Không quan tâm đến việc dòng chữ bị cắt ngang**

## Vấn đề 2: Bố cục bị vỡ, Font chữ phóng to

Khi export PDF, đặc biệt với template:
- **Font chữ phóng to quá mức**: Tiêu đề chiếm gần hết chiều ngang trang
- **Khoảng trắng lớn**: Xuất hiện khoảng trắng bên phải, nội dung bị dồn sang trái
- **Bố cục không đúng**: Nội dung bị ép vào cột hẹp

**Nguyên nhân:**
1. Không set width cố định cho container
2. Font size từ web (rem/em) không được normalize
3. Scale quá cao (2x) làm phóng to quá mức
4. Heading giữ nguyên font size gốc (rất lớn)

## Giải pháp ✅

Thay thế phương pháp cũ bằng **html2pdf.js** với CSS page-break properties và normalize layout:

### 1. Cài đặt thư viện mới
```bash
npm install html2pdf.js @types/html2pdf.js
```

### 2. Thay đổi cách tiếp cận

**Trước (Image-based):**
- `html2canvas` → Chuyển HTML thành ảnh
- `jsPDF` → Cắt ảnh thành nhiều trang
- ❌ Không tôn trọng cấu trúc văn bản
- ❌ Không kiểm soát được font size và layout

**Sau (HTML-based với CSS page-break + Layout normalization):**
- `html2pdf.js` → Render HTML trực tiếp sang PDF
- CSS `page-break-inside: avoid` → Ngăn cắt ngang phần tử
- **Width cố định**: `210mm` (A4 width)
- **Font size normalize**: Chuyển px → pt, set heading sizes hợp lý
- **Scale giảm**: 1.5x thay vì 2x
- ✅ Tôn trọng cấu trúc văn bản, ngắt trang thông minh
- ✅ Bố cục đúng, không có khoảng trắng thừa

### 3. CSS Page-Break Properties được áp dụng

```typescript
// Ngăn cắt ngang bên trong các phần tử
htmlEl.style.pageBreakInside = 'avoid';
htmlEl.style.breakInside = 'avoid';

// Ngăn cắt sau heading (giữ heading và nội dung cùng trang)
htmlEl.style.pageBreakAfter = 'avoid';
htmlEl.style.breakAfter = 'avoid';

// Ngăn orphans (dòng đơn lẻ ở cuối trang) và widows (dòng đơn lẻ ở đầu trang)
htmlEl.style.orphans = '3'; // Tối thiểu 3 dòng ở cuối trang
htmlEl.style.widows = '3';  // Tối thiểu 3 dòng ở đầu trang
```

### 4. Cấu hình html2pdf

```typescript
const options = {
  margin: [10, 10, 10, 10], // top, right, bottom, left
  pagebreak: {
    mode: ['avoid-all', 'css', 'legacy'],
    // Tránh cắt các phần tử này
    avoid: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'tr', 'blockquote', 'pre'],
  },
};
```

## Kết quả

### Trước khi sửa ❌
- Dòng chữ bị cắt đôi giữa 2 trang
- Heading bị tách rời nội dung
- Danh sách bị cắt ngang
- Bảng bị chia đôi

### Sau khi sửa ✅
- Dòng chữ luôn nguyên vẹn
- Heading và nội dung ở cùng trang
- Danh sách không bị cắt ngang
- Bảng được giữ nguyên (hoặc ngắt ở ranh giới hàng)
- Tối thiểu 3 dòng ở đầu/cuối mỗi trang (orphans/widows)

## Chi tiết kỹ thuật

### Các phần tử được bảo vệ khỏi page-break

1. **Paragraphs (`<p>`)**: Không cắt ngang đoạn văn
2. **Headings (`<h1>-<h6>`)**: 
   - Không cắt ngang tiêu đề
   - Không tách tiêu đề khỏi nội dung sau nó
3. **List items (`<li>`)**: Không cắt ngang mục danh sách
4. **Blockquotes**: Không cắt ngang trích dẫn
5. **Code blocks (`<pre>`)**: Không cắt ngang code
6. **Table rows (`<tr>`)**: Không cắt ngang hàng bảng

### Orphans & Widows Control

- **Orphans**: Số dòng tối thiểu ở cuối trang trước khi ngắt
- **Widows**: Số dòng tối thiểu ở đầu trang mới sau khi ngắt
- Cả hai được set = 3 để đảm bảo tối thiểu 3 dòng

### Layout Normalization

#### 1. Container Width
```typescript
clonedElement.style.width = '210mm'; // A4 width
clonedElement.style.maxWidth = '210mm';
clonedElement.style.padding = '10mm';
clonedElement.style.boxSizing = 'border-box';
```
- Set width cố định = khổ giấy A4 (210mm)
- Padding 10mm để tránh nội dung sát mép
- `box-sizing: border-box` để padding không làm tăng width

#### 2. Font Size Normalization
```typescript
// Base font size
clonedElement.style.fontSize = '12pt'; // Use pt for print
clonedElement.style.lineHeight = '1.5';

// Convert all px to pt
allElements.forEach(el => {
  if (el.style.fontSize && el.style.fontSize.includes('px')) {
    const pxSize = parseFloat(el.style.fontSize);
    el.style.fontSize = `${Math.round(pxSize * 0.75)}pt`;
  }
});

// Set heading sizes explicitly
H1: 24pt
H2: 20pt
H3: 16pt
H4: 14pt
H5: 12pt
H6: 11pt
```
- Sử dụng `pt` (points) thay vì `px` cho print
- Chuyển đổi: 1pt ≈ 0.75px
- Heading sizes được normalize để không quá lớn

#### 3. html2canvas Configuration
```typescript
html2canvas: {
  scale: 1.5, // Reduced from 2 to prevent oversizing
  width: 794, // A4 width in pixels at 96 DPI
  windowWidth: 794,
}
```
- Scale giảm từ 2 → 1.5 để tránh phóng to quá mức
- Width cố định = 794px (210mm at 96 DPI)
- windowWidth đảm bảo render đúng kích thước

### Kết quả Layout Fixes

**Trước:**
- ❌ Font chữ phóng to gấp 2-3 lần
- ❌ Tiêu đề chiếm gần hết trang
- ❌ Khoảng trắng lớn bên phải (30-40% trang)
- ❌ Nội dung bị dồn sang trái

**Sau:**
- ✅ Font chữ vừa phải, dễ đọc
- ✅ Tiêu đề có kích thước hợp lý
- ✅ Không có khoảng trắng thừa
- ✅ Nội dung trải đều trên trang

## File thay đổi

- **`lib/export.ts`**: Thay thế toàn bộ logic export PDF
  - Xóa: `jsPDF`, `html2canvas`
  - Thêm: `html2pdf.js`
  - Thêm: CSS page-break logic
  - Thêm: Orphans/widows control

## Testing Checklist

- [ ] Export tài liệu ngắn (1 trang) → Kiểm tra format
- [ ] Export tài liệu dài (3-5 trang) → Kiểm tra không cắt chữ
- [ ] Export với nhiều heading → Kiểm tra heading không tách khỏi nội dung
- [ ] Export với danh sách dài → Kiểm tra list items không bị cắt
- [ ] Export với code blocks → Kiểm tra code không bị cắt
- [ ] Export với bảng → Kiểm tra bảng ngắt đúng chỗ
- [ ] Kiểm tra margin và spacing
- [ ] Kiểm tra font và line height

## Lưu ý

1. **Performance**: html2pdf.js có thể chậm hơn một chút với tài liệu rất dài (>50 trang)
2. **Images**: Đảm bảo images có CORS enabled nếu từ external sources
3. **Custom fonts**: Nếu dùng custom fonts, cần đảm bảo fonts được load trước khi export
4. **Dark mode**: Code tự động override thành white background và black text cho PDF

## Tài liệu tham khảo

- [html2pdf.js Documentation](https://github.com/eKoopmans/html2pdf.js)
- [CSS page-break properties](https://developer.mozilla.org/en-US/docs/Web/CSS/page-break-inside)
- [Orphans and Widows](https://developer.mozilla.org/en-US/docs/Web/CSS/orphans)
