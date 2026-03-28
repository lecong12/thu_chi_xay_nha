import React, { useState, useRef, useEffect } from 'react';
import { FiCamera, FiLoader, FiSave, FiImage, FiPhoneCall, FiFileText, FiCheckCircle } from 'react-icons/fi';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { addRowToSheet, fetchTableData } from '../utils/sheetsAPI';
import './BusinessScanner.css';

// Cấu hình từ môi trường
const CLOUD_NAME = (process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "").replace(/['"]/g, '');
const UPLOAD_PRESET = (process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "").replace(/['"]/g, '');
const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;

// SỬ DỤNG KEY ANH ĐÃ CUNG CẤP
const GEMINI_KEY = process.env.REACT_APP_GEMINI_API_KEY || "AIzaSyD..."; 

function BusinessScanner({ showToast, onScanSuccess }) {
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanMode, setScanMode] = useState('BILL'); // Mặc định hóa đơn cho thợ Kim Long
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

  // HÀM XỬ LÝ AI TRỰC TIẾP (KHÔNG QUA BACKEND)
  const processWithGemini = async (base64Data) => {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = scanMode === 'BILL' 
        ? "Bạn là kế toán chuyên nghiệp. Hãy đọc ảnh hóa đơn này. Tìm: 1. Tên cửa hàng (don_vi); 2. Tổng cộng tiền thanh toán (so_tien - chỉ lấy số); 3. Nội dung mua hàng (noi_dung); 4. Ngày (ngay). Trả về định dạng JSON: { 'don_vi': '...', 'so_tien': 0, 'noi_dung': '...', 'ngay': '...' }"
        : "Bạn là chuyên gia marketing. Hãy đọc Card/Bảng hiệu này. Tìm: 1. Tên doanh nghiệp (ten); 2. Số điện thoại (sdt). Trả về JSON: { 'ten': '...', 'sdt': '...' }";

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
      ]);

      const response = await result.response;
      const text = response.text();
      const jsonMatch = text.match(/\{.*\}/s);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (error) {
      console.error("Lỗi Gemini:", error);
      showToast("Lỗi kết nối Gemini AI", "error");
      return null;
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(URL.createObjectURL(file));
    setUploading(true);
    setScanning(true);
    showToast("Đang tải ảnh và AI đang phân tích...", "info");

    try {
      // 1. Chuyển sang Base64 cho AI đọc
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1];
        
        // 2. Gọi Gemini trực tiếp từ trình duyệt
        const aiResult = await processWithGemini(base64Data);

        // 3. Upload lên Cloudinary để lấy link lưu AppSheet
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);
        const resCloud = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
        const cloudData = await resCloud.json();

        if (aiResult) {
          const processed = {
            tenDoanhNghiep: aiResult.don_vi || aiResult.ten || "Đơn vị mới",
            soDienThoai: aiResult.sdt || "",
            hinhAnh: cloudData.secure_url,
            soTien: aiResult.so_tien || 0,
            noiDung: aiResult.noi_dung || "Vật tư xây dựng",
            ngay: aiResult.ngay || new Date().toLocaleDateString('vi-VN')
          };
          setScannedData(processed);

          // Nếu là hóa đơn, tự động đổ về App.js để mở Modal Giao dịch
          if (scanMode === 'BILL' && onScanSuccess) {
            onScanSuccess({ ...aiResult, image_url: cloudData.secure_url }, 'BILL');
          }
          showToast("AI đã trích xuất thành công!", "success");
        }
        setScanning(false);
        setUploading(false);
      };
    } catch (err) {
      showToast("Lỗi xử lý ảnh", "error");
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
    } catch (e) { showToast("Lỗi lưu dữ liệu", "error"); } finally { setSaving(false); }
  };

  return (
    <div className="scanner-container">
      <div className="scanner-card">
        <div className="scanner-header">
          <h3><FiCamera /> Trợ lý AI Công trình</h3>
          <div className="scan-mode-selector">
            <button className={scanMode === 'BILL' ? 'active' : ''} onClick={() => setScanMode('BILL')}><FiFileText /> Hóa đơn</button>
            <button className={scanMode === 'CARD' ? 'active' : ''} onClick={() => setScanMode('CARD')}><FiSearch /> Card</button>
          </div>
        </div>

        <div className="scanner-body">
          <div className={`scan-preview-zone ${image ? 'has-img' : ''}`} onClick={() => !uploading && fileInputRef.current.click()}>
            {scanning ? (
              <div className="scan-overlay"><FiLoader className="spin" /> <span>AI đang trích xuất...</span></div>
            ) : image ? (
              <img src={image} alt="preview" className="img-preview" />
            ) : (
              <div className="scan-placeholder">
                <FiImage size={35} />
                <span>Chạm để quét {scanMode === 'BILL' ? 'Hóa đơn' : 'Danh thiếp'}</span>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} hidden accept="image/*" />
          </div>

          <div className="scan-result-form">
            <div className="field">
              <label>Đơn vị/Cửa hàng</label>
              <input type="text" value={scannedData.tenDoanhNghiep} placeholder="..." onChange={e => setScannedData({...scannedData, tenDoanhNghiep: e.target.value})} />
            </div>
            <div className="field">
              <label>{scanMode === 'BILL' ? "Số tiền (VNĐ)" : "Số điện thoại"}</label>
              <input type="text" value={scanMode === 'BILL' ? Number(scannedData.soTien).toLocaleString() : scannedData.soDienThoai} onChange={e => setScannedData({...scannedData, [scanMode === 'BILL' ? 'soTien' : 'soDienThoai']: e.target.value})} />
            </div>
            
            {scanMode === 'CARD' && (
              <button className="btn-save" onClick={handleSaveContact} disabled={saving || !scannedData.hinhAnh}>
                {saving ? <FiLoader className="spin" /> : <FiSave />} Lưu Danh bạ
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const FiSearch = () => <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="1em" width="1em"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;

export default BusinessScanner;
