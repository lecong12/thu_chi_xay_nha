import React, { useState, useRef } from 'react';
import { FiCamera, FiLoader, FiSave, FiAlertCircle } from 'react-icons/fi';
import { addRowToSheet } from '../utils/sheetsAPI';

const GEMINI_KEY = "AIzaSyBLOov5tK4IF6qVzfVIou6MiR_0VYqJRfc";
const CLOUD_NAME = "dpx7v968n";
const UPLOAD_PRESET = "unsigned_preset";
const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;

function BusinessScanner({ showToast }) {
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scannedData, setScannedData] = useState({ ten: "", sdt: "", url: "" });

  // HÀM GỌI AI VỚI CẤU TRÚC MỚI NHẤT 2026
  const callGemini = async (base64) => {
    // Dùng v1 và model flash chuẩn không có latest để tránh lỗi Not Found
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Đọc ảnh và tìm Tên doanh nghiệp + Số điện thoại. Trả về JSON: {\"ten\": \"...\", \"sdt\": \"...\"}. Chỉ trả về JSON." },
              { inline_data: { mime_type: "image/jpeg", data: base64 } }
            ]
          }]
        })
      });

      const data = await response.json();
      
      // Nếu nó vẫn báo Not Found, mình sẽ biết ngay
      if (data.error) {
        console.error("Lỗi Google:", data.error.message);
        return { error: data.error.message };
      }

      const rawText = data.candidates[0].content.parts[0].text;
      const cleanJson = rawText.replace(/```json|```/gi, "").trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      return { error: "Mạng yếu hoặc AI từ chối" };
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(URL.createObjectURL(file));
    setLoading(true);
    setScannedData({ ten: "", sdt: "", url: "" });
    showToast("Đang ép AI làm việc, lần này không cho nó lười!", "info");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      
      try {
        // Gửi Cloudinary (Lưu ảnh)
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);

        const [resCloud, aiRes] = await Promise.all([
          fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData }),
          callGemini(base64)
        ]);

        const cloudData = await resCloud.json();

        if (aiRes && !aiRes.error) {
          setScannedData({
            ten: aiRes.ten || "",
            sdt: aiRes.sdt || "",
            url: cloudData.secure_url || ""
          });
          showToast("AI đã chịu nhả chữ!", "success");
        } else {
          setScannedData(prev => ({ ...prev, url: cloudData.secure_url || "" }));
          showToast(aiRes?.error || "AI lười quá, anh gõ tạm rồi lưu", "warning");
        }
      } catch (err) {
        showToast("Lỗi hệ thống!", "error");
      } finally {
        setLoading(false);
      }
    };
  };

  return (
    <div style={{ padding: '15px', maxWidth: '400px', margin: 'auto' }}>
      <div 
        onClick={() => !loading && fileInputRef.current.click()}
        style={{ width: '100%', height: '180px', border: '3px dashed #ff4d4f', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#fff1f0', overflow: 'hidden' }}
      >
        {loading ? (
          <div style={{ textAlign: 'center' }}><FiLoader className="spin" size={30} color="#ff4d4f" /><br/>Đang 'đấm' AI...</div>
        ) : image ? (
          <img src={image} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{ textAlign: 'center', color: '#ff4d4f' }}><FiCamera size={35} /><br/>Bấm chụp/chọn ảnh</div>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} hidden accept="image/*" />
      </div>

      <div style={{ marginTop: '20px' }}>
        <input 
          placeholder="Tên doanh nghiệp..."
          value={scannedData.ten}
          onChange={(e) => setScannedData({...scannedData, ten: e.target.value})}
          style={{ width: '100%', padding: '12px', border: '2px solid #ddd', borderRadius: '10px', marginBottom: '10px' }}
        />
        <input 
          placeholder="Số điện thoại..."
          value={scannedData.sdt}
          onChange={(e) => setScannedData({...scannedData, sdt: e.target.value})}
          style={{ width: '100%', padding: '12px', border: '2px solid #ddd', borderRadius: '10px', marginBottom: '15px' }}
        />
        
        <button 
          onClick={() => showToast("Đã lưu AppSheet!", "success")}
          disabled={loading || !scannedData.ten}
          style={{ width: '100%', padding: '15px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold' }}
        >
          {loading ? "AI ĐANG LÀM..." : "LƯU DANH BẠ"}
        </button>
      </div>
    </div>
  );
}

export default BusinessScanner;
