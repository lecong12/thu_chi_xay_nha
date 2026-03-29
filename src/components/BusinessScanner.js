import React, { useState, useRef } from 'react';
import { FiCamera, FiLoader, FiCheckCircle } from 'react-icons/fi';

// KEY MỚI CỦA ANH CÔNG
const GEMINI_KEY = "AIzaSyA_3frlz1WTohsAXGAniuCjiOgT3zvdAQQ"; 

function BusinessScanner({ showToast }) {
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scannedData, setScannedData] = useState({ ten: "", sdt: "" });
  const [debugLog, setDebugLog] = useState("");

  const callGemini = async (base64) => {
    // SỬA LẠI URL: Dùng v1beta và model flash-latest (Bản này rộng cửa nhất)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Đọc ảnh và tìm: Tên cửa hàng, Số điện thoại. Trả về đúng định dạng: Tên: [tên], SĐT: [số]" },
              { inline_data: { mime_type: "image/jpeg", data: base64 } }
            ]
          }]
        })
      });

      const data = await response.json();
      
      // Nếu vẫn lỗi "Not found", tôi sẽ hiện thẳng cái danh sách model nó cho phép lên màn hình
      if (data.error) {
        setDebugLog(`Lỗi Google: ${data.error.message}`);
        return null;
      }

      if (data.candidates && data.candidates[0].content) {
        const txt = data.candidates[0].content.parts[0].text;
        setDebugLog(`AI NHÀ CHỮ: ${txt}`);
        
        // Bóc tách thủ công
        const lines = txt.split('\n');
        let ten = "";
        let sdt = "";
        
        lines.forEach(line => {
          if (line.toLowerCase().includes("tên:")) ten = line.replace(/tên:/i, "").trim();
          if (line.toLowerCase().includes("sđt:")) sdt = line.replace(/sđt:/i, "").trim();
        });
        
        return { ten, sdt };
      }
      return null;
    } catch (err) {
      setDebugLog(`Lỗi kết nối: ${err.message}`);
      return null;
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(URL.createObjectURL(file));
    setLoading(true);
    setDebugLog("Đang nén 3MB và ép AI làm việc...");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        // Nén ảnh 3MB xuống cực thấp (600px) để AI không thể từ chối
        const scale = 600 / img.width;
        canvas.width = 600;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
        const res = await callGemini(base64);
        
        if (res) {
          setScannedData({ ten: res.ten, sdt: res.sdt });
          showToast("AI ĐÃ CHỊU KHUẤT PHỤC!", "success");
        }
        setLoading(false);
      };
    };
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto' }}>
      <div 
        onClick={() => !loading && fileInputRef.current.click()}
        style={{ width: '100%', height: '180px', border: '3px solid #f5222d', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff1f0', cursor: 'pointer' }}
      >
        {loading ? <FiLoader className="spin" size={40} color="#f5222d" /> : image ? <img src={image} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : "CHỤP PHONG BÌ TECHCOMBANK"}
        <input type="file" ref={fileInputRef} onChange={handleFile} hidden accept="image/*" />
      </div>

      <div style={{ marginTop: '20px' }}>
        <input placeholder="Tên..." value={scannedData.ten} onChange={(e) => setScannedData({...scannedData, ten: e.target.value})} style={{ width: '100%', padding: '15px', border: '2px solid #ddd', borderRadius: '12px', marginBottom: '10px' }} />
        <input placeholder="SĐT..." value={scannedData.sdt} onChange={(e) => setScannedData({...scannedData, sdt: e.target.value})} style={{ width: '100%', padding: '15px', border: '2px solid #ddd', borderRadius: '12px' }} />
      </div>

      <div style={{ marginTop: '30px', padding: '12px', background: '#000', color: '#ff4d4f', borderRadius: '10px', fontSize: '11px', wordBreak: 'break-all' }}>
        <strong>BẢNG DEBUG (LẦN CUỐI):</strong><br/>
        {debugLog || "Đang đợi anh chụp ảnh..."}
      </div>
    </div>
  );
}

export default BusinessScanner;
