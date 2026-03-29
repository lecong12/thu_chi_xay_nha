import React, { useState, useRef } from 'react';
import { FiCamera, FiLoader, FiSave, FiImage, FiPhone } from 'react-icons/fi';
import { addRowToSheet } from '../utils/sheetsAPI';

const CLOUD_NAME = (process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "").replace(/['"]/g, '');
const UPLOAD_PRESET = (process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "").replace(/['"]/g, '');
const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;
const GEMINI_KEY = "AIzaSyBLOov5tK4IF6qVzfVIou6MiR_0VYqJRfc"; 

function BusinessScanner({ showToast, onScanSuccess }) {
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);

  const [scannedData, setScannedData] = useState({
    tenDoanhNghiep: "",
    soDienThoai: "",
    hinhAnh: ""
  });

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(URL.createObjectURL(file));
    setScanning(true);
    showToast("AI đang tìm tên và số điện thoại...", "info");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1];
        
        // Sử dụng Proxy để tránh treo/xoay tròn trên Vercel
        const proxyUrl = "https://corsproxy.io/?"; 
        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

        const prompt = "Đọc ảnh Card/Bảng hiệu này. Tìm: 1. Tên doanh nghiệp (ten); 2. Số điện thoại (sdt). Trả về JSON: { 'ten': '...', 'sdt': '...' }. Chỉ trả về JSON.";

        const response = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: base64Data } }] }]
          })
        });

        const data = await response.json();
        
        // Upload ảnh lên Cloudinary để lưu link vào Danh bạ
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);
        const resCloud = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
        const cloudData = await resCloud.json();

        if (data.candidates && data.candidates[0].content.parts[0].text) {
          const text = data.candidates[0].content.parts[0].text;
          const jsonMatch = text.match(/\{.*\}/s);
          const aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

          if (aiResult) {
            setScannedData({
              tenDoanhNghiep: aiResult.ten || "",
              soDienThoai: aiResult.sdt || "",
              hinhAnh: cloudData.secure_url
            });
            showToast("Đã quét xong!", "success");
          }
        }
        setScanning(false);
      };
    } catch (err) {
      showToast("Lỗi kết nối AI", "error");
      setScanning(false);
    }
  };

  const handleSaveContact = async () => {
    if (!scannedData.tenDoanhNghiep) return showToast("Vui lòng điền tên!", "warning");
    setSaving(true);
    try {
      const payload = {
        "ID": `DB_${Date.now()}`,
        "AnhCard": scannedData.hinhAnh,
        "TenDoanhNghiep": scannedData.tenDoanhNghiep,
        "SoDienThoai": scannedData.soDienThoai,
        "NgayQuet": new Date().toLocaleString('vi-VN'),
      };
      const res = await addRowToSheet("DanhBa", payload, APP_ID);
      if (res.success) {
        showToast("Đã lưu vào danh bạ!", "success");
        setScannedData({ tenDoanhNghiep: "", soDienThoai: "", hinhAnh: "" });
        setImage(null);
      }
    } catch (e) { showToast("Lỗi lưu dữ liệu", "error"); } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '15px', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
      <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FiCamera color="#007bff" /> Quét Danh thiếp / Bảng hiệu
      </h3>

      {/* KHUNG CHỤP ẢNH */}
      <div 
        onClick={() => !scanning && fileInputRef.current.click()}
        style={{ width: '100%', height: '160px', border: '2px dashed #007bff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', background: '#f0f7ff' }}
      >
        {scanning ? (
          <div style={{ textAlign: 'center', color: '#007bff' }}><FiLoader className="spin" size={25} /><br/>AI đang đọc...</div>
        ) : image ? (
          <img src={image} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ textAlign: 'center', color: '#666' }}><FiImage size={30} /><br/><span style={{ fontSize: '13px' }}>Chạm để chụp hoặc chọn ảnh</span></div>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} hidden accept="image/*" />
      </div>

      {/* FORM NHẬP LIỆU (CHO PHÉP SỬA TAY) */}
      <div style={{ marginTop: '15px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '12px', color: '#888', fontWeight: 'bold' }}>Tên doanh nghiệp</label>
          <input 
            type="text" 
            value={scannedData.tenDoanhNghiep} 
            onChange={(e) => setScannedData({...scannedData, tenDoanhNghiep: e.target.value})}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', marginTop: '4px', fontSize: '14px' }}
            placeholder="AI sẽ tự điền..."
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '12px', color: '#888', fontWeight: 'bold' }}>Số điện thoại</label>
          <input 
            type="text" 
            value={scannedData.soDienThoai} 
            onChange={(e) => setScannedData({...scannedData, soDienThoai: e.target.value})}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', marginTop: '4px', fontSize: '14px' }}
            placeholder="AI sẽ tự điền..."
          />
        </div>

        <button 
          onClick={handleSaveContact} 
          disabled={saving || !scannedData.tenDoanhNghiep}
          style={{ width: '100%', padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          {saving ? <FiLoader className="spin" /> : <FiSave />} Lưu vào Danh bạ
        </button>
      </div>
    </div>
  );
}

export default BusinessScanner;
