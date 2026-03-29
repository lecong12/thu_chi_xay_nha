import React, { useState, useRef } from 'react';
import { FiCamera, FiLoader, FiZap } from 'react-icons/fi';

const GEMINI_KEY = "AIzaSyBLOov5tK4IF6qVzfVIou6MiR_0VYqJRfc";

function BusinessScanner({ showToast }) {
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scannedData, setScannedData] = useState({ ten: "", sdt: "" });
  const [debugLog, setDebugLog] = useState("");

  const callGemini = async (base64) => {
    // THAY ĐỔI CHIẾN THUẬT: Dùng model 1.0 Pro Vision - Con này cực kỳ ổn định
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${GEMINI_KEY}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Đọc ảnh và trả về JSON: {\"ten\": \"...\", \"sdt\": \"...\"}. Nếu không thấy SĐT thì để trống." },
              { inline_data: { mime_type: "image/jpeg", data: base64 } }
            ]
          }]
        })
      });

      const data = await response.json();
      
      if (data.error) {
        setDebugLog(`Lỗi Google (Pro Vision): ${data.error.message}`);
        return null;
      }

      const txt = data.candidates[0].content.parts[0].text;
      setDebugLog(`AI nhả chữ: ${txt}`);

      const tenMatch = txt.match(/"ten":\s*"([^"]+)"/);
      const sdtMatch = txt.match(/"sdt":\s*"([^"]+)"/);
      
      return {
        ten: tenMatch ? tenMatch[1] : "",
        sdt: sdtMatch ? sdtMatch[1] : ""
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
    setDebugLog("Đang nén ảnh 3MB...");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        // Nén ảnh xuống 800px để Pro Vision đọc tốt nhất
        const scale = 800 / img.width;
        canvas.width = 800;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
        setDebugLog("Đang bắt AI Pro Vision làm việc...");
        const res = await callGemini(base64);
        
        if (res) {
          setScannedData({ ten: res.ten, sdt: res.sdt });
          showToast("Xong rồi anh Công ơi!", "success");
        }
        setLoading(false);
      };
    };
  };

  return (
    <div style={{ padding: '15px', maxWidth: '400px', margin: 'auto' }}>
      <div 
        onClick={() => !loading && fileInputRef.current.click()}
        style={{ width: '100%', height: '200px', border: '3px dashed #007bff', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f7ff', cursor: 'pointer', overflow: 'hidden' }}
      >
        {loading ? <FiLoader className="spin" size={40} color="#007bff" /> : image ? <img src={image} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{textAlign:'center'}}><FiZap size={40}/><br/>Chụp Card</div>}
        <input type="file" ref={fileInputRef} onChange={handleFile} hidden accept="image/*" />
      </div>

      <div style={{ marginTop: '20px' }}>
        <input placeholder="Tên doanh nghiệp..." value={scannedData.ten} onChange={(e) => setScannedData({...scannedData, ten: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '10px', marginBottom: '10px' }} />
        <input placeholder="Số điện thoại..." value={scannedData.sdt} onChange={(e) => setScannedData({...scannedData, sdt: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '10px' }} />
      </div>

      <div style={{ marginTop: '20px', padding: '10px', background: '#000', color: '#0f0', borderRadius: '8px', fontSize: '11px', wordBreak: 'break-all' }}>
        <strong>DEBUG LOG:</strong><br/>
        {debugLog || "Sẵn sàng..."}
      </div>
    </div>
  );
}

export default BusinessScanner;
