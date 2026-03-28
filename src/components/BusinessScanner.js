import React, { useState, useRef, useEffect } from 'react';
import { FiCamera, FiLoader, FiSave, FiImage, FiPhoneCall, FiFileText } from 'react-icons/fi';
import { addRowToSheet, fetchTableData } from '../utils/sheetsAPI';
import './BusinessScanner.css';

// Cấu hình từ môi trường
const CLOUD_NAME = (process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "").replace(/['"]/g, '');
const UPLOAD_PRESET = (import React, { useState, useRef, useEffect } from 'react';
import { FiCamera, FiLoader, FiSave, FiImage, FiFileText, FiUser } from 'react-icons/fi';
import { addRowToSheet, fetchTableData } from '../utils/sheetsAPI';
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
  
  // NÚT GẠT CHẾ ĐỘ
  const [scanMode, setScanMode] = useState('BILL'); // 'BILL' là Hóa đơn, 'CARD' là Danh thiếp

  const [scannedData, setScannedData] = useState({
    tenDoanhNghiep: "",
    soDienThoai: "",
    soTien: 0,
    hinhAnh: ""
  });

  // HÀM ĐỔI CHẾ ĐỘ (FIX NÚT BẬT)
  const toggleMode = (mode) => {
    setScanMode(mode);
    setScannedData({ tenDoanhNghiep: "", soDienThoai: "", soTien: 0, hinhAnh: "" });
    setImage(null);
    showToast(`Đã chuyển sang quét ${mode === 'BILL' ? 'Hóa đơn' : 'Danh thiếp'}`, "info");
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(URL.createObjectURL(file));
    setScanning(true);
    showToast("AI đang đọc ảnh...", "info");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1];
        
        // VƯỢT RÀO CORS ĐỂ CHỐNG XOAY TRÒN
        const proxyUrl = "https://corsproxy.io/?"; 
        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

        const prompt = scanMode === 'BILL' 
          ? "Đọc hóa đơn này. Trả về JSON: { 'don_vi': 'Tên cửa hàng', 'so_tien': 100000 }. Chỉ trả về JSON."
          : "Đọc Card này. Trả về JSON: { 'ten': 'Tên đơn vị', 'sdt': 'Số điện thoại' }. Chỉ trả về JSON.";

        const response = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: base64Data } }] }]
          })
        });

        const data = await response.json();
        
        // Upload Cloudinary để lấy link ảnh
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
              tenDoanhNghiep: aiResult.don_vi || aiResult.ten || "",
              soDienThoai: aiResult.sdt || "",
              soTien: aiResult.so_tien || 0,
              hinhAnh: cloudData.secure_url
            });
            showToast("Đã xong! Anh có thể sửa lại thông tin.", "success");
            
            if (scanMode === 'BILL' && onScanSuccess) {
              onScanSuccess({ ...aiResult, image_url: cloudData.secure_url }, 'BILL');
            }
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
    if (!scannedData.tenDoanhNghiep) return showToast("Thiếu tên cửa hàng!", "warning");
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
        showToast("Đã lưu Danh bạ!", "success");
        setScannedData({ tenDoanhNghiep: "", soDienThoai: "", soTien: 0, hinhAnh: "" });
        setImage(null);
      }
    } catch (e) { showToast("Lỗi lưu!", "error"); } finally { setSaving(false); }
  };

  return (
    <div className="scanner-container">
      <div className="scanner-card">
        {/* PHẦN NÚT GẠT ĐÃ ĐƯỢC SỬA */}
        <div className="scan-mode-switcher">
          <button 
            type="button"
            className={scanMode === 'BILL' ? 'btn-mode active' : 'btn-mode'} 
            onClick={() => toggleMode('BILL')}
          >
            <FiFileText /> Hóa đơn
          </button>
          <button 
            type="button"
            className={scanMode === 'CARD' ? 'btn-mode active' : 'btn-mode'} 
            onClick={() => toggleMode('CARD')}
          >
            <FiUser /> Danh thiếp
          </button>
        </div>

        <div className="scanner-body">
          <div className="scan-preview-zone" onClick={() => !scanning && fileInputRef.current.click()}>
            {scanning ? (
              <div className="scan-overlay"><FiLoader className="spin" /> <span>Đang đọc...</span></div>
            ) : image ? (
              <img src={image} alt="preview" className="img-preview" />
            ) : (
              <div className="scan-placeholder"><FiImage size={35} /><span>Chụp ảnh {scanMode === 'BILL' ? 'hóa đơn' : 'card'}</span></div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} hidden accept="image/*" />
          </div>

          <div className="scan-result-form">
            <div className="input-group">
              <label>Tên Doanh nghiệp / Cửa hàng</label>
              <input 
                type="text" 
                value={scannedData.tenDoanhNghiep} 
                onChange={(e) => setScannedData({...scannedData, tenDoanhNghiep: e.target.value})} 
              />
            </div>
            
            {scanMode === 'BILL' ? (
              <div className="input-group">
                <label>Số tiền (VNĐ)</label>
                <input 
                  type="number" 
                  value={scannedData.soTien} 
                  onChange={(e) => setScannedData({...scannedData, soTien: e.target.value})} 
                />
              </div>
            ) : (
              <div className="input-group">
                <label>Số điện thoại</label>
                <input 
                  type="text" 
                  value={scannedData.soDienThoai} 
                  onChange={(e) => setScannedData({...scannedData, soDienThoai: e.target.value})} 
                />
              </div>
            )}

            {scanMode === 'CARD' && (
              <button className="btn-save-db" onClick={handleSaveContact} disabled={saving || !image}>
                {saving ? <FiLoader className="spin" /> : <FiSave />} Lưu vào Danh bạ
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusinessScanner;
.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "").replace(/['"]/g, '');
const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;
const GEMINI_KEY = "AIzaSyBLOov5tK4IF6qVzfVIou6MiR_0VYqJRfc"; 

function BusinessScanner({ showToast, onScanSuccess }) {
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanMode, setScanMode] = useState('BILL'); // 'BILL' hoặc 'CARD'
  const [recentContacts, setRecentContacts] = useState([]);

  // Dữ liệu quét được (Cho phép chỉnh sửa tay)
  const [scannedData, setScannedData] = useState({
    tenDoanhNghiep: "",
    soDienThoai: "",
    hinhAnh: "",
    soTien: 0,
    noiDung: "Vật tư xây dựng",
    ngay: new Date().toLocaleDateString('vi-VN')
  });

  useEffect(() => { loadRecentContacts(); }, []);

  const loadRecentContacts = async () => {
    try {
      const res = await fetchTableData("DanhBa", APP_ID);
      if (res.success && res.data) {
        setRecentContacts(res.data.slice().reverse().slice(0, 5));
      }
    } catch (e) { console.error(e); }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(URL.createObjectURL(file));
    setScanning(true);
    showToast("AI đang phân tích ảnh...", "info");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1];
        
        // Gọi Google Gemini trực tiếp (Dùng Proxy để chống xoay tròn/CORS)
        const proxyUrl = "https://corsproxy.io/?"; 
        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

        const prompt = scanMode === 'BILL' 
          ? "Bạn là kế toán. Hãy đọc hóa đơn này. Tìm: 1. Tên cửa hàng (don_vi); 2. Tổng cộng tiền (so_tien - chỉ lấy số); 3. Nội dung (noi_dung). Trả về JSON: { 'don_vi': '...', 'so_tien': 0, 'noi_dung': '...' }"
          : "Hãy đọc Card/Bảng hiệu này. Tìm: 1. Tên doanh nghiệp (ten); 2. Số điện thoại (sdt). Trả về JSON: { 'ten': '...', 'sdt': '...' }";

        const response = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: base64Data } }] }]
          })
        });

        const data = await response.json();
        
        // Upload ảnh lên Cloudinary song song
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
              ...scannedData,
              tenDoanhNghiep: aiResult.don_vi || aiResult.ten || "Đơn vị mới",
              soDienThoai: aiResult.sdt || "",
              soTien: aiResult.so_tien || 0,
              noiDung: aiResult.noi_dung || "Vật tư xây dựng",
              hinhAnh: cloudData.secure_url
            });
            showToast("Quét thành công! Anh có thể sửa lại nếu cần.", "success");
            
            if (scanMode === 'BILL' && onScanSuccess) {
              onScanSuccess({ ...aiResult, image_url: cloudData.secure_url }, 'BILL');
            }
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
        setScannedData({ tenDoanhNghiep: "", soDienThoai: "", hinhAnh: "", soTien: 0, noiDung: "" });
        setImage(null);
        loadRecentContacts();
      }
    } catch (e) { showToast("Lỗi lưu!", "error"); } finally { setSaving(false); }
  };

  return (
    <div className="scanner-container">
      <div className="scanner-card">
        <div className="scanner-header">
          <h3><FiCamera /> Máy quét AI Công trình</h3>
          <div className="scan-mode-tabs">
            {/* Sửa nút gạt: Đã thêm sự kiện onClick để thay đổi chế độ */}
            <button 
              className={scanMode === 'BILL' ? 'active' : ''} 
              onClick={() => { setScanMode('BILL'); setScannedData({...scannedData, tenDoanhNghiep: "", soTien: 0}); }}
            >
              Hóa đơn
            </button>
            <button 
              className={scanMode === 'CARD' ? 'active' : ''} 
              onClick={() => { setScanMode('CARD'); setScannedData({...scannedData, tenDoanhNghiep: "", soDienThoai: ""}); }}
            >
              Card
            </button>
          </div>
        </div>

        <div className="scanner-body">
          <div className="scan-preview-zone" onClick={() => !scanning && fileInputRef.current.click()}>
            {scanning ? (
              <div className="scan-overlay"><FiLoader className="spin" /> <span>AI đang đọc ảnh...</span></div>
            ) : image ? (
              <img src={image} alt="preview" className="img-preview" />
            ) : (
              <div className="scan-placeholder"><FiImage size={35} /><span>Bấm để chụp ảnh</span></div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} hidden accept="image/*" />
          </div>

          <div className="scan-result-form">
            <div className="field">
              <label>Tên Doanh nghiệp / Cửa hàng</label>
              <input 
                type="text" 
                value={scannedData.tenDoanhNghiep} 
                placeholder="Nhập tên..." 
                onChange={(e) => setScannedData({...scannedData, tenDoanhNghiep: e.target.value})} 
              />
            </div>
            
            <div className="field">
              <label>{scanMode === 'BILL' ? "Số tiền (VNĐ)" : "Số điện thoại"}</label>
              <input 
                type="text" 
                value={scanMode === 'BILL' ? scannedData.soTien : scannedData.soDienThoai} 
                placeholder={scanMode === 'BILL' ? "0" : "Nhập SĐT..."}
                onChange={(e) => setScannedData({...scannedData, [scanMode === 'BILL' ? 'soTien' : 'soDienThoai']: e.target.value})} 
              />
            </div>

            {scanMode === 'CARD' && (
              <button className="btn-save" onClick={handleSaveContact} disabled={saving || !image}>
                {saving ? <FiLoader className="spin" /> : <FiSave />} Lưu Danh bạ
              </button>
            )}
          </div>
        </div>

        <div className="recent-mini">
          <span>Gần đây:</span>
          {recentContacts.map((c, i) => (
            <div key={i} className="mini-item">{c.TenDoanhNghiep || c.ten}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

const FiSave = () => <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="1em" width="1em"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>;

export default BusinessScanner;
