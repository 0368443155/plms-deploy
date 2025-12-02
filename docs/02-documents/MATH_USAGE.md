# 📐 Hướng dẫn sử dụng Math Equations

## Cách sử dụng

### 1. Inline Math (Công thức trong dòng)
Type: `$x^2 + y^2 = z^2$`

Sẽ render thành: x² + y² = z²

### 2. Display Math (Công thức riêng dòng)
Type: `$$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$`

Sẽ render thành công thức toán học lớn, căn giữa.

### 3. Sử dụng Code Block với language "math"
1. Type `/code` để tạo code block
2. Chọn language là "math"
3. Nhập LaTeX code: `\frac{a}{b} = \sum_{i=1}^{n} x_i`

## Ví dụ LaTeX

### Phân số
```
\frac{numerator}{denominator}
```

### Tổng và tích phân
```
\sum_{i=1}^{n} x_i
\int_0^\infty f(x) dx
```

### Ma trận
```
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
```

### Căn bậc hai
```
\sqrt{x^2 + y^2}
```

## Lưu ý

- Math equations được render bằng KaTeX
- Hỗ trợ đầy đủ LaTeX syntax
- Có thể sử dụng trong cả inline và display mode

