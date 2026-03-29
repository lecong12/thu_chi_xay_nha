import React, { useState, useRef } from 'react';
import { FiCamera, FiLoader, FiSave } from 'react-icons/fi';

// KEY CỦA ANH
const GEMINI_KEY = "AIzaSyBLOov5tK4IF6qVzfVIou6MiR_0VYqJRfc";

function BusinessScanner({ showToast }) {
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scannedData, setScannedData] = useState({ ten: "", sdt: "" });
  const [debugLog, setDebugLog] = useState("");

  const callGemini = async (base64) => {
    // THAY ĐỔI: Dùng model gemini-1.0-pro-vision (Đây là bản cực kỳ ổn định với hình ảnh)
    // Hoặc nếu anh muốn thử bản Flash mới nhất thì dùng: gemini-1.5-flash-latest
    const modelName = "gemini-1.5-flash-latest"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_KEY}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Đọc ảnh này và tìm Tên doanh nghiệp + Số điện thoại. Trả về JSON duy nhất dạng: {\"ten\": \"...\", \"sdt\": \"...\"}" },
              { inline_data: { mime_type: "image/jpeg", data: base64 } }
            ]
          }]
        })
      });

      const data = await response.json();
      
      if (data.error) {
        // NẾU LỖI TIẾP, THỬ SANG MODEL DỰ PHÒNG NGAY TRONG CODE
        setDebugLog(`Lỗi Google (${modelName}): ${data.error.message}`);
        return null;
      }

      const txt = data.candidates[0].content.parts[0].text;
      setDebugLog(`AI nhả chữ: ${txt}`);

      const tenMatch = txt.match(/"ten":\s*"([^"]+)"/);
      const sdtMatch = txt.match(/"sdt":\s*"([^"]+)"/);
      
      return {
        ten: tenMatch ? tenMatch[1] : "Không đọc được tên",
        sdt: sdtMatch ? sdtMatch[1] : "Không đọc được SĐT"
      };
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
    setDebugLog("Đang nén ảnh và gửi đi...");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        // Nén ảnh xuống cực nhỏ (600px) để chắc chắn không bị lỗi timeout
        const scale = 600 / img.width;
        canvas.width = 600;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
        const res = await callGemini(base64);
        
        if (res) {
          setScannedData({ ten: res.ten, sdt: res.sdt });
          showToast("Đã lấy được thông tin!", "success");
        }
        setLoading(false);
      };
    };
  };

  return (
    <div style={{ padding: '15px', maxWidth: '400px', margin: 'auto', background: '#fff', minHeight: '100vh' }}>
      <h3 style={{ textAlign: 'center', color: '#333' }}>QUÉT DANH THIẾP</h3>
      
      <div 
        onClick={() => !loading && fileInputRef.current.click()}
        style={{ width: '100%', height: '200px', border: '2px dashed #007bff', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fbff', cursor: 'pointer', overflow: 'hidden', marginBottom: '20px' }}
      >
        {loading ? <FiLoader className="spin" size={40} color="#007bff" /> : image ? <img src={image} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : "Chạm để quét ảnh"}
        <input type="file" ref={fileInputRef} onChange={handleFile} hidden accept="image/*" />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>TÊN DOANH NGHIỆP</label>
        <input 
          value={scannedData.ten} 
          onChange={(e) => setScannedData({...scannedData, ten: e.target.value})}
          style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '5px' }} 
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>SỐ ĐIỆN THOẠI</label>
        <input 
          value={scannedData.sdt} 
          onChange={(e) => setScannedData({...scannedData, sdt: e.target.value})}
          style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '5px' }} 
        />
      </div>

      <button style={{ width: '100%', padding: '15px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>
        LƯU VÀO APP SHEET
      </button>

      <div style={{ marginTop: '30px', padding: '10px', background: '#222', color: '#0f0', borderRadius: '8px', fontSize: '11px' }}>
        <strong>DEBUG LOG (Theo dõi lỗi):</strong><br/>
        {debugLog || "Sẵn sàng..."}
      </div>
    </div>
  );
}

export default BusinessScanner;
