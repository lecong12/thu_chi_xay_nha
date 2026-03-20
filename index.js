const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config(); // Tải các biến môi trường từ file .env
const { fetchDataFromAppSheet } = require('./src/utils/sheetsAPI.js');

const { google } = require('googleapis');
const app = express();

// Cho phép nhận JSON từ client
app.use(express.json());

// Cấu hình CORS thủ công (Cho phép Frontend gọi API)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Trong thực tế nên để http://localhost:3000
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

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

// Route lấy dữ liệu từ AppSheet
app.get('/api/data', async (req, res) => {
  try {
<<<<<<< HEAD
    const spreadsheetId = process.env.SPREADSHEET_ID;
    // Thay 'ThuChi' bằng tên Tab (Sheet) thực tế của bạn
    const range = 'GiaoDich!A:E'; 
=======
    const appId = process.env.REACT_APP_APPSHEET_APP_ID;
>>>>>>> 466c2f097695c148ea182b13fcdbb46705b6a1a8

    if (!appId) {
      return res.status(500).json({ error: 'REACT_APP_APPSHEET_APP_ID is not configured.' });
    }

    const response = await fetchDataFromAppSheet(appId);

    if (!response.success) {
      return res.status(500).json({ error: response.message || 'Failed to fetch data from AppSheet' });
    }

     res.json({ data: response.data });

<<<<<<< HEAD
    res.json({ data: response.data.values || [] });
=======
>>>>>>> 466c2f097695c148ea182b13fcdbb46705b6a1a8
  } catch (error) {
    console.error('Lỗi Google Sheet:', error);
    res.status(500).json({ error: error.message });


  }
});

// Hàm xử lý ghi đè và khởi tạo lại các Sheet
const setupAndOverwriteSheet = async (spreadsheetId) => {
  try {
    console.log(`[LOG]: Bắt đầu ghi đè cấu trúc cho Sheet: ${spreadsheetId}`);

    // 1. Lấy thông tin các sheet hiện có
    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = sheetInfo.data.sheets.map(s => s.properties.title);

    // 2. Xử lý Sheet GiaoDich (đổi tên hoặc tạo mới)
    // Check if 'data_thu_chi' exists and rename it to 'GiaoDich'
    let giaoDichSheet = existingSheets.includes('data_thu_chi') ? 'data_thu_chi' : (existingSheets.includes('GiaoDich') ? 'GiaoDich' : null);
    if (giaoDichSheet === 'data_thu_chi') {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{ updateSheetProperties: { properties: { title: 'GiaoDich' }, fields: 'title', sheetId: sheetInfo.data.sheets.find(s => s.properties.title === 'data_thu_chi').properties.sheetId } }]
        }
      });
      console.log("[LOG]: Đã đổi tên 'data_thu_chi' thành 'GiaoDich'");
    } else if (!giaoDichSheet) {
      // If neither 'data_thu_chi' nor 'GiaoDich' exists, create 'GiaoDich'
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests: [{ addSheet: { properties: { title: 'GiaoDich' } } }] }
      });
      // Update existingSheets to reflect the newly created sheet
      const updatedSheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
      existingSheets.push('GiaoDich'); // Add to our local tracking
      console.log("[LOG]: Đã tạo sheet 'GiaoDich'");
    }

    // 3. Tạo hoặc làm sạch các sheet NganSach, TienDo, TongQuan (nếu đã có)
    const requiredSheets = ['NganSach', 'TienDo', 'TongQuan'];
    for (const title of requiredSheets) {
      if (existingSheets.includes(title)) {
        const sheetId = sheetInfo.data.sheets.find(s => s.properties.title === title).properties.sheetId;
        await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${title}!A:Z` });
        console.log(`[LOG]: Đã làm sạch sheet '${title}'`);
      } else {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: { requests: [{ addSheet: { properties: { title } } }] }
        });
        console.log(`[LOG]: Đã tạo sheet '${title}'`);
      }
    }

    // 4. Prepare data and formulas to update
    const dataForUpdate = [
      // GiaoDich headers
      { range: 'GiaoDich!A1', values: [['Ngày', 'Hạng mục', 'Nội dung', 'Số tiền', 'Minh chứng', 'Ghi chú']] },
      // NganSach headers and formulas
      { range: 'NganSach!A1', values: [['Hạng mục', 'Dự kiến (VNĐ)', 'Thực tế chi', 'Còn lại', 'Tình trạng']] },
      {
        range: 'NganSach!A2',
        values: [
          ['Phần thô', 0, '=SUMIF(GiaoDich!B:B, A2, GiaoDich!D:D)', '=B2-C2', '=IF(C2>B2, "⚠️ Vượt", "✅ OK")'],
          ['Nhân công', 0, '=SUMIF(GiaoDich!B:B, A3, GiaoDich!D:D)', '=B3-C3', '=IF(C3>B3, "⚠️ Vượt", "✅ OK")'],
          ['Hoàn thiện', 0, '=SUMIF(GiaoDich!B:B, A4, GiaoDich!D:D)', '=B4-C4', '=IF(C4>B4, "⚠️ Vượt", "✅ OK")'],
          ['Điện nước', 0, '=SUMIF(GiaoDich!B:B, A5, GiaoDich!D:D)', '=B5-C5', '=IF(C5>B5, "⚠️ Vượt", "✅ OK")'],
          ['Nội thất', 0, '=SUMIF(GiaoDich!B:B, A6, GiaoDich!D:D)', '=B6-C6', '=IF(C6>B6, "⚠️ Vượt", "✅ OK")'],
          ['Phát sinh', 0, '=SUMIF(GiaoDich!B:B, A7, GiaoDich!D:D)', '=B7-C7', '=IF(C7>B7, "⚠️ Vượt", "✅ OK")'],
        ],
      },
      // TienDo headers
      { range: 'TienDo!A1', values: [['Giai đoạn', 'Ngày bắt đầu', 'Ngày kết thúc', 'Trạng thái', 'Ảnh nghiệm thu']] },
      // TongQuan headers and formulas
      {
        range: 'TongQuan!A1',
        values: [
          ['CHỈ SỐ TỔNG QUAN', 'GIÁ TRỊ'],
          ['TỔNG NGÂN SÁCH', '=SUM(NganSach!B:B)'],
          ['TỔNG ĐÃ CHI', '=SUM(GiaoDich!D:D)'],
          ['TIẾT KIỆM / VƯỢT', '=B2-B3'],
        ],
      },
    ];

    // 5. Update data and formulas in sheets
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: 'USER_ENTERED', // Important: to make Google Sheets interpret formulas
        data: dataForUpdate,
      },
    });
    console.log("[LOG]: Hoàn tất cấu hình Sheet. Hệ thống đã sẵn sàng.");
  } catch (error) {
    console.error("Lỗi khi ghi đè và cấu hình Google Sheet:", error);
    throw error; // Ném lỗi để route xử lý
  }
};

//  Route để tự động cấu hình các sheet
app.post('/api/setup-sheets', async (req, res) => {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) {
    return res.status(500).json({ error: 'SPREADSHEET_ID is not configured on the server.' });
  }

  console.log("Bắt đầu cấu hình hệ thống Sheet chuyên dụng...");

  try {
    await setupAndOverwriteSheet(spreadsheetId);
    res.status(200).json({ message: 'Ghi đè và cấu hình Sheet thành công! Vui lòng làm mới AppSheet và ứng dụng.' });
  } catch (error) {
    console.error("Lỗi tổng khi cấu hình:", error);
    res.status(500).json({ error: 'Lỗi cấu hình: ' + error.message });
  }
});
// Route để thêm dữ liệu mới vào Sheet
app.post('/api/data', async (req, res) => {
  try {
    const spreadsheetId = process.env.SPREADSHEET_ID;
<<<<<<< HEAD
    const range = 'GiaoDich!A:E'; // Tên sheet và dải ô để ghi
=======
    const range = 'GiaoDich!A:F'; // Tên sheet và dải ô để ghi
>>>>>>> 466c2f097695c148ea182b13fcdbb46705b6a1a8

    // Dữ liệu gửi từ client, ví dụ: { values: ["2024-05-20", "Vật tư", "Xi măng", 500000, "Đợt 1"] }
     const { values } = req.body;

    if (!values || !Array.isArray(values)) {
      return res.status(400).json({ error: 'Dữ liệu "values" không hợp lệ, phải là một mảng.' });
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED', // Giúp Google Sheets tự định dạng (ngày, số)
       resource: { values: [values] }, // Dữ liệu phải là một mảng 2 chiều
    });

    res.status(201).json({ message: 'Thêm dữ liệu thành công!' });
  } catch (error) {
    console.error('Lỗi khi ghi vào Google Sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

<<<<<<< HEAD
// Chạy server nếu ở môi trường local (không phải Serverless)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Backend Server is running on port ${PORT}`);
  });
}
=======
// --- CẤU HÌNH PHỤC VỤ FRONTEND (REACT) ---
// Express sẽ phục vụ các file tĩnh trong thư mục 'build' (được tạo ra khi chạy 'npm run build')
app.use(express.static(path.join(__dirname, 'build')));

// Mọi request không khớp với API sẽ trả về file index.html của React (để React Router xử lý)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});
>>>>>>> 466c2f097695c148ea182b13fcdbb46705b6a1a8

// Xuất app để Vercel biến nó thành Serverless Function
module.exports = app;

// Khởi động server nếu chạy trực tiếp (Localhost)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
  });
}