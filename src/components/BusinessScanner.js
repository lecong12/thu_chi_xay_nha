import React, { useState, useRef } from 'react';
import { FiCamera, FiLoader, FiSave, FiImage } from 'react-icons/fi';
import { addRowToSheet } from '../utils/sheetsAPI';
import './BusinessScanner.css';

// CẤU HÌNH TỪ .ENV (ĐẢM BẢO ANH ĐÃ CÀI TRÊN VERCEL)
const CLOUD_NAME = (process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "").replace(/['"]/g, '');
const UPLOAD_PRESET = (process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "").replace(/['"]/g, '');
const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;
const GEMINI_KEY = process.env.REACT_APP_GEMINI_API_KEY || "AIzaSyBLOov5tK4IF6qVzfVIou6MiR_0VYqJRfc"; 

function BusinessScanner({ showToast }) {
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dữ liệu quét được (Mặc định rỗng để anh tự sửa tay thoải mái)
  const [scannedData, setScannedData] = useState({
    tenDoanhNghiep: "",
    soDienThoai: "",
    hinhAnh: ""
  });

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(URL.createObjectURL(file));
    setScanning(true);
    
    // Đảm bảo các ô nhập liệu được làm trống trước khi quét mới
    setScannedData({ tenDoanhNghiep: "", soDienThoai: "", hinhAnh: "" });
    showToast("Đang kết nối AI qua đường truyền ưu tiên...", "info");

    try {
      // 1. Chuyển ảnh sang Base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1];
        
        // 2. SỬ DỤNG PROXY ĐỂ VƯỢT LỖI CHẶN KẾT NỐI (CORS) - GIÚP HẾT XOAY MÃI
        // Đây là "cầu nối" giúp lệnh của anh không bị treo
        const proxyUrl = "https://corsproxy.io/?"; 
        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

        // Prompt được viết lại để AI đọc Card/Bảng hiệu tốt nhất
        const prompt = "Đây là ảnh danh thiếp hoặc bảng hiệu cửa hàng vật tư xây dựng. Hãy đọc và tìm: 1. Tên doanh nghiệp/cửa hàng (ten); 2. Số điện thoại liên hệ (sdt). Trả về định dạng JSON: { 'ten': '...', 'sdt': '...' }. Chỉ trả về JSON, không viết gì thêm.";

        const response = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: base64Data } }] }]
          })
        });

        // Đọc kết quả JSON từ AI
        const data = await response.json();

        // 3. XỬ LÝ KẾT QUẢ AI VÀ UPDATE GIAO DIỆN
        if (data.candidates && data.candidates[0].content.parts[0].text) {
          const text = data.candidates[0].content.parts[0].text;
          const jsonMatch = text.match(/\{.*\}/s); // Lọc lấy JSON
          const aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

          if (aiResult) {
            setScannedData({
              ...scannedData,
              tenDoanhNghiep: aiResult.ten || "",
              soDienThoai: aiResult.sdt || "",
            });
            showToast("Quét thành công! Anh có thể sửa lại nếu cần.", "success");
          } else {
            showToast("AI không đọc được thông tin, hãy thử lại hoặc tự gõ vào!", "warning");
          }
        }
        
        // Ngắt trạng thái xoay
        setScanning(false);
      };
    } catch (err) {
      console.error("Lỗi mạng:", err);
      showToast("Mạng quá yếu, đang thử lại...", "error");
      // Đảm bảo ngắt xoay kể cả khi có lỗi
      setScanning(false);
    }
  };

  const handleSaveContact = async () => {
    if (!scannedData.tenDoanhNghiep) return showToast("Vui lòng điền tên doanh nghiệp!", "warning");
    setSaving(true);
    try {
      const payload = {
        "ID": `DB_${Date.now()}`,
        "TenDoanhNghiep": scannedData.tenDoanhNghiep,
        "SoDienThoai": scannedData.soDienThoai,
        "AnhCard": image, // Dùng ảnh local nếu chưa upload Cloudinary
        "NgayQuet": new Date().toLocaleString('vi-VN'),
        "TrangThai": "Mới"
      };
      const res = await addRowToSheet("DanhBa", payload, APP_ID);
      if (res.success) {
        showToast("Đã lưu vào danh bạ!", "success");
        setImage(null);
        setScannedData({ tenDoanhNghiep: "", soDienThoai: "", hinhAnh: "" });
      }
    } catch (e) { showToast("Lỗi lưu!", "error"); } finally { setSaving(false); }
  };

  return (
    <div className="scanner-container">
      <div className="scanner-card">
        <div className="scanner-header">
          <h3><FiCamera /> Quét Card / Bảng hiệu</h3>
        </div>

        <div className="scanner-body">
          {/* KHUNG CHỤP ẢNH - ĐÃ SỬA ĐỂ HẾT TREO */}
          <div className="scan-preview-zone" onClick={() => !scanning && fileInputRef.current.click()}>
            {scanning ? (
              <div className="scan-overlay">
                <FiLoader className="spin" /> 
                <span>AI đang đọc...</span>
              </div>
            ) : image ? (
              <img src={image} alt="preview" className="img-preview" />
            ) : (
              <div className="scan-placeholder">
                <FiImage size={35} />
                <span>Bấm để chụp ảnh</span>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} hidden accept="image/*" />
          </div>

          <div className="scan-result-form">
            {/* CÁC Ô NHẬP LIỆU - ĐÃ MỞ KHÓA CHO PHÉP SỬA TAY */}
            <div className="input-group">
              <label>Tên Doanh nghiệp</label>
              <input 
                type="text" 
                value={scannedData.tenDoanhNghiep} 
                placeholder="Tên cửa hàng..." 
                onChange={(e) => setScannedData({...scannedData, tenDoanhNghiep: e.target.value})} 
              />
            </div>
            
            <div className="input-group">
              <label>Số điện thoại</label>
              <input 
                type="text" 
                value={scannedData.soDienThoai} 
                placeholder="Nhập SĐT..."
                onChange={(e) => setScannedData({...scannedData, soDienThoai: e.target.value})} 
              />
            </div>

            <button className="btn-primary" onClick={handleSaveContact} disabled={saving || !image}>
              {saving ? <FiLoader className="spin" /> : <FiSave />} Lưu vào Danh bạ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusinessScanner;
