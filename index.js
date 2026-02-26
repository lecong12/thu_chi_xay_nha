const express = require('express');
const { google } = require('googleapis');
const app = express();

// Cho phép nhận JSON từ client
app.use(express.json());

// Cấu hình xác thực Google Sheets
// LƯU Ý: Các biến môi trường này phải được cài đặt trên Vercel
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    // Xử lý lỗi xuống dòng trong Private Key khi lưu trên Vercel
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Route kiểm tra server sống hay chết
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running!' });
});

// Route lấy dữ liệu từ Sheet
app.get('/api/data', async (req, res) => {
  try {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    // Thay 'ThuChi' bằng tên Tab (Sheet) thực tế của bạn
    const range = 'ThuChi!A:E'; 

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    res.json({ data: response.data.values });
  } catch (error) {
    console.error('Lỗi Google Sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Xuất app để Vercel biến nó thành Serverless Function
module.exports = app;