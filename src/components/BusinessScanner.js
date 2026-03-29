import React, { useState, useRef } from 'react';
import { FiCamera, FiLoader, FiSave, FiCheck, FiRefreshCw } from 'react-icons/fi';
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
    // SỬ DỤNG MODEL LATEST VÀ URL V1 CHUẨN NHẤT HIỆN TẠI
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Hãy đọc ảnh này và cho tôi biết: 1. Tên doanh nghiệp/cửa hàng là gì? 2. Số điện thoại là gì? Trả về kết quả ngắn gọn theo dạng JSON: {'ten': '...', 'sdt': '...'}. Nếu không thấy, hãy cố gắng đoán từ bảng hiệu hoặc phong bì." },
              { inline_data: { mime_type: "image/jpeg", data: base64 } }
            ]
          }]
        })
      });

      const data = await response.json();
      
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        const rawText = data.candidates[0].content.parts[0].text;
        // Loại bỏ ký tự lạ nếu có
        const cleanJson = rawText.replace(/```json|```/gi, "").trim();
        return JSON.parse(cleanJson);
      }
      return null;
    } catch (err) {
      console.error("Lỗi AI rồi anh Công ơi:", err);
      return null;
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(URL.createObjectURL(file));
    setLoading(true);
    setScannedData({ ten: "", sdt: "", url: "" });
    showToast("Đang 'ép' AI làm việc...", "info");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);

        // Chạy song song cả 2 cho nhanh
        const [resCloud, aiRes] = await Promise.all([
          fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData }),
          callGemini(base64)
        ]);

        const cloudData = await resCloud.json();

        if (aiRes) {
          setScannedData({
            ten: aiRes.ten || "",
            sdt: aiRes.sdt || "",
            url: cloudData.secure_url || ""
          });
          showToast("Xong rồi anh nhé!", "success");
        } else {
          setScannedData(prev => ({ ...prev, url: cloudData.secure_url || "" }));
          showToast("AI vẫn chưa đọc được, anh nhập tay tạm nhé!", "warning");
        }
      } catch (err) {
        showToast("Lỗi kết nối rồi!", "error");
      } finally {
        setLoading(false);
      }
    };
  };

  const handleSave = async () => {
    if (!scannedData.ten) return showToast("Phải có tên mới lưu được anh ạ!", "warning");
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
        showToast("Lưu danh bạ ngon lành!", "success");
        setImage(null);
        setScannedData({ ten: "", sdt: "", url: "" });
      }
    } catch (e) {
      showToast("Lỗi lưu rồi anh!", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '15px', maxWidth: '400px', margin: 'auto' }}>
      <div 
        onClick={() => !loading && fileInputRef.current.click()}
        style={{ 
          width: '100%', height: '200px', border: '2px dashed #007bff', 
          borderRadius: '15px', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', cursor: 'pointer', background: '#f8fbff',
          boxShadow: 'inset 0 0 10px rgba(0,123,255,0.05)'
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center' }}>
            <FiRefreshCw className="spin" size={35} color="#007bff" />
            <p style={{ marginTop: '10px', fontSize: '12px' }}>Đang vắt kiệt AI...</p>
          </div>
        ) : image ? (
          <img src={image} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{ textAlign: 'center', color: '#666' }}>
            <FiCamera size={40} />
            <p style={{ marginTop: '10px', fontWeight: '500' }}>Bấm chụp Card/Bảng hiệu</p>
          </div>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} hidden accept="image/*" />
      </div>

      <div style={{ marginTop: '20px' }}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', color: '#555', fontWeight: 'bold' }}>TÊN CỬA HÀNG / DOANH NGHIỆP</label>
          <input 
            value={scannedData.ten}
            onChange={(e) => setScannedData({...scannedData, ten: e.target.value})}
            style={{ width: '100%', padding: '14px', border: '1px solid #ddd', borderRadius: '10px', marginTop: '6px', fontSize: '15px' }}
            placeholder="AI sẽ điền..."
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', color: '#555', fontWeight: 'bold' }}>SỐ ĐIỆN THOẠI</label>
          <input 
            value={scannedData.sdt}
            onChange={(e) => setScannedData({...scannedData, sdt: e.target.value})}
            style={{ width: '100%', padding: '14px', border: '1px solid #ddd', borderRadius: '10px', marginTop: '6px', fontSize: '15px' }}
            placeholder="AI sẽ tìm..."
          />
        </div>
        
        {scannedData.url && <p style={{ fontSize: '12px', color: '#28a745', marginBottom: '15px' }}><FiCheck /> Ảnh đã lên Cloudinary</p>}

        <button 
          onClick={handleSave}
          disabled={loading || !scannedData.ten}
          style={{ 
            width: '100%', padding: '16px', background: '#28a745', 
            color: '#fff', border: 'none', borderRadius: '12px', 
            fontWeight: 'bold', fontSize: '16px', transition: '0.3s'
          }}
        >
          {loading ? "ĐANG LÀM VIỆC..." : "LƯU VÀO DANH BẠ"}
        </button>
      </div>
    </div>
  );
}

export default BusinessScanner;
