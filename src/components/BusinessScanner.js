import React, { useState, useRef } from 'react';
import { FiCamera, FiLoader } from 'react-icons/fi';

// KEY MỚI CỦA ANH CÔNG - ĐÃ CÓ DẤU "" CHUẨN
const GEMINI_KEY = "AIzaSyDfyd86965EGsNgwhcNCuZQ1SZN3xzWty0"; 

function BusinessScanner({ showToast }) {
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scannedData, setScannedData] = useState({ ten: "", sdt: "" });
  const [debugLog, setDebugLog] = useState("");

  const callGemini = async (base64) => {
    // THAY ĐỔI QUAN TRỌNG: Dùng v1 và model gemini-1.5-flash (Bỏ chữ -latest đi)
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Đọc ảnh và trả về đúng định dạng: Tên: [tên], SĐT: [số]" },
              { inline_data: { mime_type: "image/jpeg", data: base64 } }
            ]
          }]
        })
      });

      const data = await response.json();
      
      // Nếu nó vẫn báo lỗi "Not found", tôi sẽ hiện thông báo cực mạnh ở đây
      if (data.error) {
        setDebugLog(`Lỗi Google (v1): ${data.error.message}`);
        return null;
      }

      if (data.candidates && data.candidates[0].content) {
        const txt = data.candidates[0].content.parts[0].text;
        setDebugLog(`AI ĐÃ CHỊU NHẢ CHỮ: ${txt}`);
        
        const tenMatch = txt.match(/Tên:\s*(.*)/i);
        const sdtMatch = txt.match(/SĐT:\s*([\d\s.-]+)/i);
        
        return {
          ten: tenMatch ? tenMatch[1].trim() : "Không rõ tên",
          sdt: sdtMatch ? sdtMatch[1].trim() : "Không rõ SĐT"
        };
      }
      return null;
    } catch (err) {
      setDebugLog(`Lỗi mạng: ${err.message}`);
      return null;
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(URL.createObjectURL(file));
    setLoading(true);
    setDebugLog("Đang nén ảnh và gửi đi...");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const scale = 800 / img.width;
        canvas.width = 800;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
        const res = await callGemini(base64);
        
        if (res) {
          setScannedData({ ten: res.ten, sdt: res.sdt });
          showToast("AI ĐÃ KHUẤT PHỤC!", "success");
        }
        setLoading(false);
      };
    };
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto' }}>
      <div 
        onClick={() => !loading && fileInputRef.current.click()}
        style={{ width: '100%', height: '180px', border: '3px dashed #1890ff', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e6f7ff', cursor: 'pointer' }}
      >
        {loading ? <FiLoader className="spin" size={40} color="#1890ff" /> : image ? <img src={image} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : "CHỤP CARD (KEY MỚI)"}
        <input type="file" ref={fileInputRef} onChange={handleFile} hidden accept="image/*" />
      </div>

      <div style={{ marginTop: '20px' }}>
        <input placeholder="Tên..." value={scannedData.ten} readOnly style={{ width: '100%', padding: '15px', border: '2px solid #ddd', borderRadius: '12px', marginBottom: '10px' }} />
        <input placeholder="SĐT..." value={scannedData.sdt} readOnly style={{ width: '100%', padding: '15px', border: '2px solid #ddd', borderRadius: '12px' }} />
      </div>

      <div style={{ marginTop: '30px', padding: '10px', background: '#000', color: '#0f0', borderRadius: '8px', fontSize: '11px', wordBreak: 'break-all' }}>
        <strong>BẢNG DEBUG:</strong><br/>
        {debugLog || "Sẵn sàng!"}
      </div>
    </div>
  );
}

export default BusinessScanner;
