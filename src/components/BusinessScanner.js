import React, { useState, useRef } from 'react';
import { FiCamera, FiLoader, FiSave, FiCheck } from 'react-icons/fi';
import { addRowToSheet } from '../utils/sheetsAPI';

const CLOUD_NAME = (process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "dpx7v968n").replace(/['"]/g, '');
const UPLOAD_PRESET = (process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "unsigned_preset").replace(/['"]/g, '');
const GEMINI_KEY = "AIzaSyBLOov5tK4IF6qVzfVIou6MiR_0VYqJRfc";
const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;

function BusinessScanner({ showToast }) {
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scannedData, setScannedData] = useState({ ten: "", sdt: "", url: "" });

  const callGemini = async (base64) => {
    // SỬA LẠI URL VÀ MODEL CHUẨN (v1 thay vì v1beta để ổn định hơn)
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Đọc ảnh và trả về JSON: {\"ten\": \"...\", \"sdt\": \"...\"}. Chỉ trả về JSON." },
              { inline_data: { mime_type: "image/jpeg", data: base64 } }
            ]
          }]
        })
      });

      const data = await response.json();
      
      // Kiểm tra lỗi từ Google
      if (data.error) {
        console.error("Lỗi Google:", data.error.message);
        return null;
      }

      const rawText = data.candidates[0].content.parts[0].text;
      const cleanJson = rawText.replace(/```json|```/gi, "").trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      console.error("Lỗi kết nối AI:", err);
      return null;
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(URL.createObjectURL(file));
    setLoading(true);
    setScannedData({ ten: "", sdt: "", url: "" });
    showToast("Đang phân tích ảnh...", "info");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);

        // Chạy song song
        const [resCloud, aiRes] = await Promise.all([
          fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData }),
          callGemini(base64)
        ]);

        const cloudData = await resCloud.json();

        setScannedData({
          ten: aiRes?.ten || "",
          sdt: aiRes?.sdt || "",
          url: cloudData.secure_url || ""
        });

        if (aiRes) {
          showToast("Đã lấy thông tin thành công!", "success");
        } else {
          showToast("AI không đọc được, mời anh nhập tay.", "warning");
        }
      } catch (err) {
        showToast("Lỗi hệ thống!", "error");
      } finally {
        setLoading(false);
      }
    };
  };

  const handleSave = async () => {
    if (!scannedData.ten) return showToast("Nhập tên doanh nghiệp!", "warning");
    setLoading(true);
    try {
      const payload = {
        "ID": `DB_${Date.now()}`,
        "TenDoanhNghiep": scannedData.ten,
        "SoDienThoai": scannedData.sdt,
        "AnhCard": scannedData.url,
        "NgayQuet": new Date().toLocaleString('vi-VN')
      };
      const res = await addRowToSheet("DanhBa", payload, APP_ID);
      if (res.success) {
        showToast("Đã lưu danh bạ!", "success");
        setImage(null);
        setScannedData({ ten: "", sdt: "", url: "" });
      }
    } catch (e) {
      showToast("Lỗi lưu dữ liệu!", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '15px', maxWidth: '400px', margin: 'auto' }}>
      <div 
        onClick={() => !loading && fileInputRef.current.click()}
        style={{ width: '100%', height: '180px', border: '2px dashed #007bff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fbff', overflow: 'hidden' }}
      >
        {loading ? (
          <div style={{ textAlign: 'center' }}><FiLoader className="spin" size={30} color="#007bff" /></div>
        ) : image ? (
          <img src={image} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{ textAlign: 'center', color: '#666' }}>Bấm chụp Card/Bảng hiệu</div>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} hidden accept="image/*" />
      </div>

      <div style={{ marginTop: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold' }}>TÊN CỬA HÀNG</label>
          <input 
            value={scannedData.ten}
            onChange={(e) => setScannedData({...scannedData, ten: e.target.value})}
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '5px' }}
            placeholder="Tên cửa hàng..."
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold' }}>SỐ ĐIỆN THOẠI</label>
          <input 
            value={scannedData.sdt}
            onChange={(e) => setScannedData({...scannedData, sdt: e.target.value})}
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '5px' }}
            placeholder="Số điện thoại..."
          />
        </div>
        
        {scannedData.url && <p style={{ fontSize: '12px', color: '#28a745' }}><FiCheck /> Ảnh đã tải lên máy chủ</p>}

        <button 
          onClick={handleSave}
          disabled={loading || !scannedData.ten}
          style={{ width: '100%', padding: '15px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', marginTop: '10px' }}
        >
          {loading ? "ĐANG XỬ LÝ..." : "LƯU DANH BẠ"}
        </button>
      </div>
    </div>
  );
}

export default BusinessScanner;
