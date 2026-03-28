import React, { useState, useRef, useEffect } from 'react';
import { FiCamera, FiLoader, FiSave, FiImage, FiPhoneCall, FiFileText } from 'react-icons/fi';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { addRowToSheet, fetchTableData } from '../utils/sheetsAPI';
import './BusinessScanner.css';

// 1. LẤY CẤU HÌNH TỪ VERCEL / MÔI TRƯỜNG
const CLOUD_NAME = (process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "").replace(/['"]/g, '');
const UPLOAD_PRESET = (process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "").replace(/['"]/g, '');
const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;

// ĐẢM BẢO TÊN BIẾN TRÙNG VỚI VERCEL CỦA ANH
const GEMINI_KEY = process.env.REACT_APP_GEMINI_API_KEY; 

function BusinessScanner({ showToast, onScanSuccess }) {
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanMode, setScanMode] = useState('BILL'); 
  const [recentContacts, setRecentContacts] = useState([]);

  const [scannedData, setScannedData] = useState({
    tenDoanhNghiep: "", soDienThoai: "", hinhAnh: "", soTien: 0, noiDung: "", ngay: ""
  });

  useEffect(() => { loadRecentContacts(); }, []);

  const loadRecentContacts = async () => {
    try {
      const res = await fetchTableData("DanhBa", APP_ID);
      if (res.success && res.data) {
        setRecentContacts(res.data.slice().reverse().slice(0, 5));
      }
    } catch (e) { console.error("Lỗi danh bạ:", e); }
  };

  // HÀM GỌI GEMINI TRỰC TIẾP
  const processWithGemini = async (base64Data) => {
    if (!GEMINI_KEY) {
      showToast("Lỗi: Chưa tìm thấy API Key trên Vercel!", "error");
      return null;
    }

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      // Sử dụng bản Flash 1.5 để đọc ảnh nhanh nhất
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = scanMode === 'BILL' 
        ? "Bạn là kế toán. Hãy đọc hóa đơn này. Tìm: 1. Tên cửa hàng (don_vi); 2. Tổng cộng tiền (so_tien - chỉ lấy số); 3. Nội dung (noi_dung); 4. Ngày (ngay). Trả về JSON: { 'don_vi': '...', 'so_tien': 0, 'noi_dung': '...', 'ngay': '...' }"
        : "Bạn là Marketing. Hãy đọc Card này. Tìm: Tên cửa hàng (ten) và SĐT (sdt). Trả về JSON: { 'ten': '...', 'sdt': '...' }";

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
      ]);

      const response = await result.response;
      const text = response.text();
      // Loại bỏ các ký tự thừa để lấy đúng JSON
      const jsonMatch = text.match(/\{.*\}/s);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (error) {
      console.error("Lỗi chi tiết từ Gemini:", error);
      showToast("AI phản hồi lỗi: " + error.message, "error");
      return null;
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(URL.createObjectURL(file));
    setUploading(true);
    setScanning(true);
    showToast("Đang đọc dữ liệu...", "info");

    try {
      // 1. Chuyển ảnh sang Base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1];
        
        // 2. Gọi Gemini xử lý
        const aiResult = await processWithGemini(base64Data);

        // 3. Upload lên Cloudinary
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);
        const resCloud = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
        const cloudData = await resCloud.json();

        if (aiResult) {
          setScannedData({
            tenDoanhNghiep: aiResult.don_vi || aiResult.ten || "Đơn vị mới",
            soDienThoai: aiResult.sdt || "",
            hinhAnh: cloudData.secure_url,
            soTien: aiResult.so_tien || 0,
            noiDung: aiResult.noi_dung || "Nhập vật tư",
            ngay: aiResult.ngay || new Date().toLocaleDateString('vi-VN')
          });

          if (scanMode === 'BILL' && onScanSuccess) {
            onScanSuccess({ ...aiResult, image_url: cloudData.secure_url }, 'BILL');
          }
          showToast("Xong! AI đã trích xuất dữ liệu.", "success");
        }
        setScanning(false);
        setUploading(false);
      };
    } catch (err) {
      showToast("Lỗi: " + err.message, "error");
      setScanning(false);
      setUploading(false);
    }
  };

  const handleSaveContact = async () => {
    setSaving(true);
    try {
      const payload = {
        "ID": `DB_${Date.now()}`,
        "AnhCard": scannedData.hinhAnh,
        "TenDoanhNghiep": scannedData.tenDoanhNghiep,
        "SoDienThoai": scannedData.soDienThoai,
        "NgayQuet": new Date().toLocaleString('vi-VN'),
      };
      const res = await addRowToSheet("DanhBa", payload, APP_ID);
      if (res.success) {
        showToast("Đã lưu vào danh bạ!", "success");
        setImage(null);
        setScannedData({ tenDoanhNghiep: "", soDienThoai: "", hinhAnh: "", soTien: 0 });
        loadRecentContacts();
      }
    } catch (e) { showToast("Lỗi lưu AppSheet!", "error"); } finally { setSaving(false); }
  };

  return (
    <div className="scanner-container">
      <div className="scanner-card">
        <div className="scanner-header">
          <h3>Máy quét Thông minh</h3>
          <div className="scan-mode-tabs">
            <button className={scanMode === 'BILL' ? 'active' : ''} onClick={() => setScanMode('BILL')}>Hóa đơn</button>
            <button className={scanMode === 'CARD' ? 'active' : ''} onClick={() => setScanMode('CARD')}>Card</button>
          </div>
        </div>

        <div className="scanner-body">
          <div className={`scan-preview-zone ${image ? 'has-img' : ''}`} onClick={() => !uploading && fileInputRef.current.click()}>
            {scanning ? (
              <div className="scan-overlay"><FiLoader className="spin" /> <span>AI đang đọc...</span></div>
            ) : image ? (
              <img src={image} alt="preview" className="img-preview" />
            ) : (
              <div className="scan-placeholder"><FiImage size={30} /><span>Chụp ảnh hóa đơn/card</span></div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} hidden accept="image/*" />
          </div>

          <div className="scan-result-form">
            <input type="text" value={scannedData.tenDoanhNghiep} placeholder="Đang chờ AI..." readOnly />
            <input type="text" value={scanMode === 'BILL' ? Number(scannedData.soTien).toLocaleString() : scannedData.soDienThoai} readOnly />
            
            {scanMode === 'CARD' && (
              <button className="btn-save" onClick={handleSaveContact} disabled={saving || !image}>
                {saving ? <FiLoader className="spin" /> : <FiSave />} Lưu Danh bạ
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const FiSave = () => <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="1em" width="1em"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>;

export default BusinessScanner;
