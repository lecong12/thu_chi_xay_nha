# Quản Lý Thu Chi Xây Nhà

Ứng dụng web React giúp theo dõi thu chi dự án xây nhà, tích hợp AppSheet/Google Sheets.

## Tính năng chính
- 📊 Dashboard thống kê & Biểu đồ trực quan.
- 📋 Quản lý giao dịch (Thêm/Sửa/Xóa).
- 📱 Giao diện Responsive & Bảo mật đăng nhập.

## Cài đặt & Chạy
```bash
npm install && npm start
```

Ứng dụng sẽ chạy tại http://localhost:3000

## Cấu hình và Triển khai

- **Mật mã to đăng nhậpnnnn**: `081212`

### 1. Chạy Local (Trên máy tính)
Tạo một file có tên `.env` trong thư mục gốc và điền các giá trị sau. Ứng dụng sẽ tự động đọc file này khi bạn chạy `npm start`.
```dotenv
REACT_APP_SHEET_ID=xxxxxxxxxxxxxxxxxxxx # ID của file Google Sheet (dùng để đọc dữ liệu ban đầu)
REACT_APP_APPSHEET_APP_ID=thuchixaynha-3204729 # ID của ứng dụng AppSheet
REACT_APP_APPSHEET_ACCESS_KEY=xxxxxxxxxxxx # Key truy cập API từ AppSheet
REACT_APP_APPSHEET_TABLE_NAME=data_thu_chi # Tên Bảng (Table) trong AppSheet
```

### 2. Deploy lên Cloud (Railway, Render)
Nền tảng đám mây sẽ **KHÔNG** sử dụng file `.env` của bạn. Thay vào đó, bạn phải khai báo các biến môi trường trên giao diện Dashboard của nền tảng (trong phần **Variables** hoặc **Environment**). Các giá trị này sẽ được "tiêm" vào ứng dụng lúc build......mô