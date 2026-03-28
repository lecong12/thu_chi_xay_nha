import React, { useState, useRef } from 'react';
import { FiCamera, FiLoader, FiSave, FiImage, FiFileText, FiUser } from 'react-icons/fi';
import { addRowToSheet } from '../utils/sheetsAPI';
import './BusinessScanner.css';

const CLOUD_NAME = (process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "").replace(/['"]/g, '');
const UPLOAD_PRESET = (process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "").replace(/['"]/g, '');
const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;
const GEMINI_KEY = "AIzaSyBLOov5tK4IF6qVzfVIou6MiR_0VYqJRfc"; 

function BusinessScanner({ showToast, onScanSuccess }) {
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanMode, setScanMode] = useState('BILL'); 
  const [scannedData, setScannedData] = useState({ tenDoanhNghiep: "", soDienThoai: "", soTien: "", hinhAnh: "" });

  // HÀM NÉN ẢNH (QUAN TRỌNG: GIÚP HẾT XOAY VÔ TẬN)
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scale = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.6).split(',')[1]);
        };
      };
    });
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(URL.createObjectURL(file));
    setScanning(true);
    showToast("Đang xử lý ảnh nhẹ để gửi AI...", "info");

    try {
      const base64Data = await compressImage(file);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // Ngắt sau 12 giây nếu treo

      const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
      const prompt = scanMode === 'BILL' 
        ? "Đọc hóa đơn. Trả về JSON: { 'don_vi': 'Tên cửa hàng', 'so_tien': 100000 }. Chỉ trả về JSON."
        : "Đọc Card. Trả về JSON: { 'ten': 'Tên đơn vị', 'sdt': 'SĐT' }. Chỉ trả về JSON.";

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: base64Data } }] }]
        })
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (data.candidates && data.candidates[0].content.parts[0].text) {
        const text = data.candidates[0].content.parts[0].text;
        const jsonMatch = text.match(/\{.*\}/s);
        const aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

        if (aiResult) {
          setScannedData({
            tenDoanhNghiep: aiResult.don_vi || aiResult.ten || "",
            soDienThoai: aiResult.sdt || "",
            soTien: aiResult.so_tien || "",
            hinhAnh: "" // Sẽ cập nhật sau khi upload Cloudinary
          });
          showToast("AI đã đọc xong!", "success");
        }
      }
    } catch (err) {
      showToast(err.name === 'AbortError' ? "Mạng yếu, vui lòng thử lại!" : "Lỗi kết nối AI", "error");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="scanner-container" style={{ padding: '15px' }}>
      <div className="mode-tabs" style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
        <button onClick={() => setScanMode('BILL')} style={{ flex: 1, padding: '10px', background: scanMode === 'BILL' ? '#007bff' : '#ddd', color: '#fff', border: 'none', borderRadius: '5px' }}>Hóa đơn</button>
        <button onClick={() => setScanMode('CARD')} style={{ flex: 1, padding: '10px', background: scanMode === 'CARD' ? '#007bff' : '#ddd', color: '#fff', border: 'none', borderRadius: '5px' }}>Danh thiếp</button>
      </div>

      <div className="preview-area" onClick={() => !scanning && fileInputRef.current.click()} style={{ border: '2px dashed #aaa', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderRadius: '10px', overflow: 'hidden' }}>
        {scanning ? (
          <div style={{ textAlign: 'center' }}><FiLoader className="spin" size={30} /><br/>Đang đọc...</div>
        ) : image ? (
          <img src={image} alt="scan" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ textAlign: 'center' }}><FiImage size={30} /><br/>Chạm để chụp</div>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} hidden accept="image/*" />
      </div>

      <div className="form-result" style={{ marginTop: '15px' }}>
        <label>Tên Doanh nghiệp</label>
        <input type="text" value={scannedData.tenDoanhNghiep} onChange={(e) => setScannedData({...scannedData, tenDoanhNghiep: e.target.value})} style={{ width: '100%', padding: '12px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />
        
        <label>{scanMode === 'BILL' ? 'Số tiền' : 'Số điện thoại'}</label>
        <input type="text" value={scanMode === 'BILL' ? scannedData.soTien : scannedData.soDienThoai} onChange={(e) => setScannedData({...scannedData, [scanMode === 'BILL' ? 'soTien' : 'soDienThoai']: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '5px' }} />
      </div>
    </div>
  );
}

export default BusinessScanner;
