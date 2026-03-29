import React, { useState, useRef } from 'react';
import { FiCamera, FiLoader, FiSave, FiImage } from 'react-icons/fi';

// KEY API TRỰC TIẾP ĐỂ KIỂM TRA
const GEMINI_KEY = "AIzaSyBLOov5tK4IF6qVzfVIou6MiR_0VYqJRfc";

function BusinessScanner({ showToast }) {
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState({ ten: "", sdt: "" });

  const processScanning = async (base64) => {
    console.log("--- BẮT ĐẦU GỌI API GEMINI ---");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Đọc ảnh này và trả về JSON gồm 'ten' (tên cửa hàng) và 'sdt' (số điện thoại). Chỉ trả về JSON rỗng {} nếu không thấy." },
              { inline_data: { mime_type: "image/jpeg", data: base64 } }
            ]
          }]
        })
      });

      const data = await response.json();
      console.log("KẾT QUẢ TỪ GOOGLE:", data);

      if (data.candidates && data.candidates[0].content.parts[0].text) {
        const text = data.candidates[0].content.parts[0].text;
        const jsonMatch = text.match(/\{.*\}/s);
        const res = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        if (res) {
          setScannedData({ 
            ten: res.ten || "Không tìm thấy tên", 
            sdt: res.sdt || "Không tìm thấy SĐT" 
          });
          showToast("AI đã phân tích xong!", "success");
        }
      }
    } catch (error) {
      console.error("LỖI KHI GỌI API:", error);
      showToast("Lỗi kết nối API Google", "error");
    } finally {
      setScanning(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log("ĐÃ CHỌN FILE:", file.name);
    setImage(URL.createObjectURL(file));
    setScanning(true);

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result.split(',')[1];
      console.log("ĐÃ CHUYỂN ẢNH SANG BASE64 - CHUẨN BỊ GỬI...");
      processScanning(base64Data);
    };
    reader.onerror = (error) => {
      console.error("LỖI ĐỌC FILE:", error);
      setScanning(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '450px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <div 
        onClick={() => fileInputRef.current.click()}
        style={{ 
          width: '100%', height: '200px', border: '2px dashed #007bff', 
          borderRadius: '15px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          background: '#f0f7ff', overflow: 'hidden' 
        }}
      >
        {scanning ? (
          <div style={{ textAlign: 'center', color: '#007bff' }}>
            <FiLoader className="spin" size={40} />
            <p>ĐANG XỬ LÝ API...</p>
          </div>
        ) : image ? (
          <img src={image} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{ textAlign: 'center', color: '#555' }}>
            <FiCamera size={40} />
            <p>CHỤP ẢNH / CHỌN FILE</p>
          </div>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          hidden 
          accept="image/*"
          capture="environment" 
        />
      </div>

      <div style={{ marginTop: '20px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', color: '#666' }}>TÊN DOANH NGHIỆP</label>
          <input 
            type="text" 
            value={scannedData.ten}
            onChange={(e) => setScannedData({...scannedData, ten: e.target.value})}
            style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', marginTop: '5px', fontSize: '16px' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', color: '#666' }}>SỐ ĐIỆN THOẠI</label>
          <input 
            type="text" 
            value={scannedData.sdt}
            onChange={(e) => setScannedData({...scannedData, sdt: e.target.value})}
            style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', marginTop: '5px', fontSize: '16px' }}
          />
        </div>

        <button 
          style={{ 
            width: '100%', padding: '15px', background: '#28a745', color: '#fff', 
            border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px' 
          }}
          onClick={() => showToast("Đã lưu thành công!", "success")}
        >
          <FiSave /> LƯU DANH BẠ
        </button>
      </div>
    </div>
  );
}

export default BusinessScanner;
