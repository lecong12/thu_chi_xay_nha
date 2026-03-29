import React, { useState, useRef } from 'react';
import { FiCamera, FiLoader, FiSave, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { addRowToSheet } from '../utils/sheetsAPI';

const CLOUD_NAME = (process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "dpx7v968n").replace(/['"]/g, '');
const UPLOAD_PRESET = (process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "unsigned_preset").replace(/['"]/g, '');
const GEMINI_KEY = "AIzaSyBLOov5tK4IF6qVzfVIou6MiR_0VYqJRfc";
const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;

function BusinessScanner({ showToast }) {
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Khởi tạo state với giá trị rỗng rõ ràng
  const [scannedData, setScannedData] = useState({ ten: "", sdt: "", url: "" });

  const callGemini = async (base64) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Đọc ảnh này. Trả về JSON: {\"ten\": \"Tên cửa hàng\", \"sdt\": \"Số điện thoại\"}. Chỉ trả về duy nhất JSON." },
              { inline_data: { mime_type: "image/jpeg", data: base64 } }
            ]
          }]
        })
      });
      const data = await response.json();
      const rawText = data.candidates[0].content.parts[0].text;
      
      // XỬ LÝ CHUỖI JSON (Cắt bỏ các ký tự thừa nếu AI trả về Markdown)
      const cleanJson = rawText.replace(/```json|```/gi, "").trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      console.error("Lỗi phân tích AI:", err);
      return null;
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(URL.createObjectURL(file));
    setLoading(true);
    showToast("Đang xử lý...", "info");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      
      try {
        // Gửi Cloudinary
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);

        const [resCloud, aiRes] = await Promise.all([
          fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData }),
          callGemini(base64)
        ]);

        const cloudData = await resCloud.json();

        // CẬP NHẬT DỮ LIỆU - ĐẢM BẢO KHÔNG BỊ TRỐNG
        setScannedData({
          ten: aiRes?.ten || "",
          sdt: aiRes?.sdt || "",
          url: cloudData.secure_url || ""
        });

        if (aiRes) {
          showToast("Đã trích xuất thông tin!", "success");
        } else {
          showToast("AI không đọc được chữ, anh hãy tự nhập.", "warning");
        }
      } catch (err) {
        showToast("Lỗi kết nối!", "error");
      } finally {
        setLoading(false);
      }
    };
  };

  const handleSave = async () => {
    if (!scannedData.ten) return showToast("Vui lòng nhập tên!", "warning");
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
        showToast("Đã lưu vào danh bạ!", "success");
        setImage(null);
        setScannedData({ ten: "", sdt: "", url: "" });
      }
    } catch (e) {
      showToast("Lỗi lưu AppSheet", "error");
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
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold' }}>SỐ ĐIỆN THOẠI</label>
          <input 
            value={scannedData.sdt}
            onChange={(e) => setScannedData({...scannedData, sdt: e.target.value})}
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '5px' }}
          />
        </div>
        
        <button 
          onClick={handleSave}
          disabled={loading || !scannedData.ten}
          style={{ width: '100%', padding: '15px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}
        >
          {loading ? "ĐANG LƯU..." : "LƯU DANH BẠ"}
        </button>
      </div>
    </div>
  );
}

export default BusinessScanner;
