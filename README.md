# thu_chi_xay_nha

Ứng dụng web quản lý thu chi cho dự án xây nhà.

## Tính năng

- 📊 Dashboard thống kê tổng quan
- 🔍 Bộ lọc dữ liệu đa tiêu chí
- 📋 Danh sách giao dịch chi tiết
- 📱 Giao diện responsive (Desktop & Mobile)
- 🔐 Bảo mật với mật mã đăng nhập
- 📈 Biểu đồ trực quan (Pie chart, Bar chart)
- ☁️ Tích hợp Google Sheets

## Công nghệ

- React.js
- Recharts (Biểu đồ)
- PapaParse (CSV parser)
- React Icons

## Cài đặt

```bash
npm install
npm start
```

Ứng dụng sẽ chạy tại http://localhost:3000

## Cấu hình

- **Mật mã đăng nhập**: `081212`
- **Google Sheets ID**: ID của Google Sheet được cấu hình trong một tệp `.env` ở thư mục gốc của dự án.

  Tạo một tệp có tên `.env` và thêm vào nội dung sau (thay thế bằng ID của bạn):
  ```
  REACT_APP_SHEET_ID=YOUR_GOOGLE_SHEET_ID_HERE
  ```
