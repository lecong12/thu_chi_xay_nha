const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config(); // Tải các biến môi trường từ file .env

const { google } = require('googleapis');
const { GoogleGenerativeAI } = require("@google/generative-ai");
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

// Cấu hình Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// API trích xuất thông tin bằng AI
app.post('/api/gemini-extract', async (req, res) => {
  try {
    const { imageUrl, type } = req.body; // type: 'card' hoặc 'invoice'

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY chưa được cấu hình trên server.' });
    }

    if (!imageUrl) return res.status(400).json({ error: 'Thiếu link ảnh' });

    // Cấu hình Model với hướng dẫn hệ thống nghiêm ngặt
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });
    
    // Tải ảnh từ Cloudinary để gửi cho Gemini
    const imageResp = await fetch(imageUrl).then(response => response.arrayBuffer());
    
    // Tự động nhận diện mimeType từ URL để hỗ trợ đa dạng định dạng
    const urlLower = imageUrl.toLowerCase();
    let mimeType = "image/jpeg";
    if (urlLower.endsWith(".png")) mimeType = "image/png";
    else if (urlLower.endsWith(".pdf")) mimeType = "application/pdf";
    else if (urlLower.endsWith(".webp")) mimeType = "image/webp";
    else if (urlLower.endsWith(".heic")) mimeType = "image/heic";
    
    let prompt = "";
    if (type === 'card') {
      prompt = `Bạn là một chuyên gia OCR và phân tích dữ liệu chuyên nghiệp. Nhiệm vụ: Trích xuất thông tin doanh nghiệp từ ảnh danh thiếp hoặc biển hiệu.
      CÁC TRƯỜNG CẦN LẤY:
      1. "ten": Tên thương hiệu, cửa hàng hoặc công ty chính (thường là chữ to nhất).
      2. "sdt": Số điện thoại liên hệ. 
      3. "diaChi": Địa chỉ kinh doanh đầy đủ nếu có.
      4. "mst": Mã số thuế doanh nghiệp nếu có.

      QUY TẮC NGHIÊM NGẶT:
      - CHỈ lấy dãy số nếu nó đi kèm với các từ khóa: SĐT, Hotline, Tel, Mobile, Zalo, hoặc nằm cạnh icon điện thoại.
      - Định dạng: Trả về chuỗi chỉ gồm các chữ số (Ví dụ: 0908123456).
      - LOẠI TRỪ: Tuyệt đối không nhầm lẫn với Mã số thuế (thường 10 hoặc 13 số) hoặc Số tài khoản ngân hàng.
      - Nếu không thấy trường nào, trả về chuỗi rỗng "".
      - Trả về JSON: {"ten": "...", "sdt": "...", "diaChi": "...", "mst": "..."}`;
    } else {
      prompt = `Bạn là một kế toán kiểm tra chứng từ chuyên nghiệp. Hãy phân tích hóa đơn/biên lai này.
      CÁC TRƯỜNG CẦN LẤY:
      1. "ten": Tên đơn vị BÁN HÀNG (doanh nghiệp cung cấp vật tư).
      2. "sdt": Số điện thoại của đơn vị BÁN HÀNG.
      3. "ngay": Ngày giao dịch (định dạng YYYY-MM-DD).
      4. "soTien": Tổng số tiền thanh toán cuối cùng (Số nguyên, không lấy dấu phân cách).
      5. "noiDung": Tóm tắt danh sách vật tư chính.

      QUY TẮC TRÍCH XUẤT SĐT:
      - Tìm ở khu vực tiêu đề hóa đơn (thông tin người bán).
      - SĐT thường bắt đầu bằng số 0, có khoảng 10 chữ số.
      - Nếu có nhiều số, ưu tiên số di động hoặc Hotline cửa hàng.
      - Phải làm sạch: Xóa bỏ mọi dấu chấm, dấu gạch ngang, khoảng trắng. Chỉ để lại chữ số.

      YÊU CẦU:
      - KHÔNG lấy thông tin khách hàng (người mua), CHỈ lấy thông tin người bán.
      - Nếu thông tin mờ hoặc không có, để "". Trả về JSON: {"ten": "...", "sdt": "...", "ngay": "...", "soTien": 0, "noiDung": "..."}`;
    }

    const result = await model.generateContent([
      {
        inlineData: {
          data: Buffer.from(imageResp).toString("base64"),
          mimeType: mimeType
        }
      },
      prompt
    ]);

    const response = await result.response;
    const data = JSON.parse(response.text());
    res.json(data);
  } catch (error) {
    console.error('Gemini Error:', error);
    res.status(500).json({ error: 'AI không thể phân tích ảnh lúc này' });
  }
});

// Route kiểm tra server sống hay chết
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running!' });
});

// --- ROUTE API QUAN TRỌNG: Lấy dữ liệu cho Frontend ---
// Route này phục vụ request GET /api/data từ App.js
app.get('/api/data', async (req, res) => {
  try {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const range = 'GiaoDich!A:G'; // Cập nhật range A:G theo cấu trúc mới

    if (!spreadsheetId) {
      return res.status(500).json({ error: 'SPREADSHEET_ID chưa được cấu hình trên server.' });
    }

    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const values = response.data.values || [];
    res.header('Content-Type', 'application/json');
    res.json({ data: values });
  } catch (error) {
    console.error('Lỗi khi đọc Google Sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route để thêm dữ liệu mới vào Sheet
app.post('/api/data', async (req, res) => {
  try {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const range = 'GiaoDich!A:G'; // Cập nhật range A:G

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

    res.header('Content-Type', 'application/json');
    res.status(201).json({ message: 'Thêm dữ liệu thành công!' });
  } catch (error) {
    console.error('Lỗi khi ghi vào Google Sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- CẤU HÌNH PHỤC VỤ FRONTEND (REACT) ---
// Express sẽ phục vụ các file tĩnh trong thư mục 'build' (được tạo ra khi chạy 'npm run build')
app.use(express.static(path.join(__dirname, 'build')));

// Mọi request không khớp với API sẽ trả về file index.html của React (để React Router xử lý)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Xuất app để Vercel biến nó thành Serverless Function
module.exports = app;

// Khởi động server nếu chạy trực tiếp (Localhost)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
  });
}