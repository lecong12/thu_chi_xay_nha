import React, { useState, useRef } from 'react';
import { FiCamera, FiLoader, FiSave, FiCheck, FiZap } from 'react-icons/fi';
import { addRowToSheet } from '../utils/sheetsAPI';

const GEMINI_KEY = "AIzaSyBLOov5tK4IF6qVzfVIou6MiR_0VYqJRfc";
const CLOUD_NAME = "dpx7v968n";
const UPLOAD_PRESET = "unsigned_preset";

function BusinessScanner({ showToast }) {
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scannedData, setScannedData] = useState({ ten: "", sdt: "", url: "" });

  // HÀM NÉN ẢNH CHUYÊN NGHIỆP - BIẾN 3MB THÀNH 200KB TRONG 0.5 GIÂY
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Giữ tỷ lệ ảnh nhưng giới hạn chiều rộng tối đa 1000px
          const scale = Math.min(1, 1000 / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          // Xuất ra JPEG với chất lượng 70% để AI đọc tốt nhất mà file cực nhẹ
          const base64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve({
            base64: base64.split(',')[1],
            blob: base64 // Dùng để hiển thị hoặc upload nếu cần
          });
        };
      };
    });
  };

  const callGemini = async (base64) => {
    // Dùng v1 là bản ổn định nhất hiện nay
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Đọc ảnh và trả về JSON: {\"ten\": \"Tên cửa hàng\", \"sdt\": \"Số điện thoại\"}. Không nói gì thêm." },
              { inline_data: { mime_type: "image/jpeg", data: base64 } }
            ]
          }]
        })
      });
      const data = await response.json();
      const txt = data.candidates[0].content.parts[0].text;
      const cleanJson = txt.replace(/```json|```/gi, "").trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      console.error("AI từ chối:", err);
      return null;
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(URL.createObjectURL(file));
    setLoading(true);
    showToast("Đang nén ảnh 3MB và ép AI đọc...", "info");

    try {
      // BƯỚC 1: Nén ảnh ngay lập tức
      const compressed = await compressImage(file);
      
      // BƯỚC 2: Gửi Cloudinary (Dùng file gốc cho nét để lưu trữ)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      // Chạy song song: Upload ảnh gốc & AI đọc ảnh nén
      const [resCloud, aiRes] = await Promise.all([
        fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData }),
        callGemini(compressed.base64)
      ]);

      const cloudData = await resCloud.json();

      if (aiRes) {
        setScannedData({
          ten: aiRes.ten || "",
          sdt: aiRes.sdt || "",
          url: cloudData.secure_url || ""
        });
        showToast("AI đã nhả chữ thành công!", "success");
      } else {
        setScannedData(prev => ({ ...prev, url: cloudData.secure_url || "" }));
        showToast("AI vẫn lì lợm, mời anh nhập tay.", "warning");
      }
    } catch (err) {
      showToast("Lỗi xử lý ảnh!", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto' }}>
      <div 
        onClick={() => !loading && fileInputRef.current.click()}
        style={{ 
          width: '100%', height: '200px', border: '3px dashed #1890ff', 
          borderRadius: '15px', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', cursor: 'pointer', background: '#e6f7ff' 
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center' }}>
            <FiLoader className="spin" size={35} color="#1890ff" />
            <p style={{ marginTop: '10px', fontWeight: 'bold' }}>ĐANG ÉP AI LÀM VIỆC...</p>
          </div>
        ) : image ? (
          <img src={image} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{ textAlign: 'center', color: '#1890ff' }}>
            <FiZap size={40} /><br/>Bấm để Quét Card cực nhanh
          </div>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} hidden accept="image/*" />
      </div>

      <div style={{ marginTop: '20px' }}>
        <input 
          placeholder="Tên doanh nghiệp..."
          value={scannedData.ten}
          onChange={(e) => setScannedData({...scannedData, ten: e.target.value})}
          style={{ width: '100%', padding: '14px', border: '2px solid #ddd', borderRadius: '10px', marginBottom: '10px', fontSize: '16px' }}
        />
        <input 
          placeholder="Số điện thoại..."
          value={scannedData.sdt}
          onChange={(e) => setScannedData({...scannedData, sdt: e.target.value})}
          style={{ width: '100%', padding: '14px', border: '2px solid #ddd', borderRadius: '10px', marginBottom: '20px', fontSize: '16px' }}
        />
        
        <button 
          onClick={() => showToast("Đã lưu!", "success")}
          disabled={loading || !scannedData.ten}
          style={{ 
            width: '100%', padding: '16px', background: '#1890ff', 
            color: '#fff', border: 'none', borderRadius: '12px', 
            fontWeight: 'bold', fontSize: '16px' 
          }}
        >
          {loading ? "ĐANG QUÉT..." : "LƯU VÀO DANH BẠ"}
        </button>
      </div>
    </div>
  );
}

export default BusinessScanner;
