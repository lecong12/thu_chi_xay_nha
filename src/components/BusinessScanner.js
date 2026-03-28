import React, { useState, useRef, useEffect } from 'react';
import { FiCamera, FiLoader, FiSave, FiImage, FiSearch, FiPhoneCall, FiFileText } from 'react-icons/fi';
import { addRowToSheet, fetchTableData } from '../utils/sheetsAPI';
import './BusinessScanner.css';

const CLOUD_NAME = (process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "").replace(/['"]/g, '');
const UPLOAD_PRESET = (process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "").replace(/['"]/g, '');
const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;

function BusinessScanner({ showToast, onScanSuccess }) {
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recentContacts, setRecentContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [scanMode, setScanMode] = useState('CARD'); // 'CARD' hoặc 'BILL'

  const [scannedData, setScannedData] = useState({
    tenDoanhNghiep: "",
    soDienThoai: "",
    hinhAnh: "",
    soTien: 0,
    noiDung: ""
  });

  useEffect(() => { loadRecentContacts(); }, []);

  const loadRecentContacts = async () => {
    try {
      setLoadingContacts(true);
      const res = await fetchTableData("DanhBa", APP_ID);
      if (res.success && res.data) {
        setRecentContacts(res.data.slice().reverse().slice(0, 10).map(item => ({
          id: item.ID || item.id,
          ten: item.TenDoanhNghiep || item.ten || "Không tên",
          sdt: item.SoDienThoai || item.sdt || "Không có số"
        })));
      }
    } catch (e) { console.error(e); } finally { setLoadingContacts(false); }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setImage(localUrl);
    setUploading(true);
    setScanning(true);
    showToast("Đang tải ảnh và phân tích AI...", "info");

    try {
      // 1. Upload lên Cloudinary trước để lấy link ảnh
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      const resCloud = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
      const cloudData = await resCloud.json();
      const imageUrl = cloudData.secure_url;

      // 2. GỌI GEMINI VỚI PROMPT SIÊU CẤP (Như mẫu Kim Long)
      const geminiRes = await fetch('/api/gemini-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageUrl, 
          type: scanMode === 'BILL' ? 'bill' : 'card' 
        })
      });
      const aiResult = await geminiRes.json();

      if (aiResult && !aiResult.error) {
        setScannedData({
          tenDoanhNghiep: aiResult.don_vi || aiResult.ten || "",
          soDienThoai: aiResult.sdt || aiResult.so_dien_thoai || "",
          hinhAnh: imageUrl,
          soTien: aiResult.so_tien || 0,
          noiDung: aiResult.noi_dung || "",
          ngay: aiResult.ngay || ""
        });
        
        // Nếu là hóa đơn, gửi dữ liệu về App.js để mở Modal Giao Dịch ngay
        if (scanMode === 'BILL' && onScanSuccess) {
          onScanSuccess({...aiResult, image_url: imageUrl}, 'BILL');
        }
        
        showToast("Gemini đã trích xuất xong!", "success");
      }
    } catch (err) {
      showToast("Lỗi xử lý AI: " + err.message, "error");
    } finally {
      setUploading(false);
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (saving || uploading) return;
    setSaving(true);
    try {
      const payload = {
        "ID": `DB_${Date.now()}`,
        "AnhCard": scannedData.hinhAnh,
        "TenDoanhNghiep": scannedData.tenDoanhNghiep,
        "SoDienThoai": scannedData.soDienThoai,
        "NgayQuet": new Date().toLocaleString('vi-VN'),
        "TrangThai": "Hoàn thành"
      };
      const res = await addRowToSheet("DanhBa", payload, APP_ID);
      if (res.success) {
        showToast("Đã lưu vào Danh bạ!", "success");
        setImage(null);
        setScannedData({ tenDoanhNghiep: "", soDienThoai: "", hinhAnh: "" });
        loadRecentContacts();
      }
    } catch (error) { showToast("Lỗi lưu: " + error.message, "error"); } finally { setSaving(false); }
  };

  return (
    <div className="scanner-container">
      <div className="scanner-card">
        <div className="scanner-header">
          <h3><FiCamera /> Máy quét Thông minh</h3>
          <div className="mode-selector">
            <button className={scanMode === 'CARD' ? 'active' : ''} onClick={() => setScanMode('CARD')}><FiSearch /> Quét Card</button>
            <button className={scanMode === 'BILL' ? 'active' : ''} onClick={() => setScanMode('BILL')}><FiFileText /> Quét Hóa đơn</button>
          </div>
        </div>

        <div className="scanner-body">
          <div className={`scan-preview-zone ${image ? 'has-img' : ''}`} onClick={() => !uploading && fileInputRef.current.click()}>
            {uploading || scanning ? (
              <div className="scan-overlay"><FiLoader className="spin" /> <span>AI đang đọc dữ liệu...</span></div>
            ) : image ? (
              <img src={image} alt="Preview" className="img-preview" />
            ) : (
              <div className="scan-placeholder">
                <FiImage size={40} />
                <span>Chụp ảnh Card hoặc Hóa đơn</span>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} hidden accept="image/*" />
          </div>

          <div className="scan-result-form">
            <div className="scan-input-group">
              <label>Đơn vị / Cửa hàng</label>
              <input type="text" value={scannedData.tenDoanhNghiep} placeholder="Tên đơn vị..." onChange={e => setScannedData({...scannedData, tenDoanhNghiep: e.target.value})} />
            </div>
            
            <div className="scan-input-group">
              <label>{scanMode === 'BILL' ? "Số tiền hóa đơn" : "Số điện thoại"}</label>
              <input 
                type="text" 
                value={scanMode === 'BILL' ? scannedData.soTien : scannedData.soDienThoai} 
                placeholder={scanMode === 'BILL' ? "Số tiền..." : "090..."}
                onChange={e => setScannedData({...scannedData, [scanMode === 'BILL' ? 'soTien' : 'soDienThoai']: e.target.value})} 
              />
            </div>

            <div className="scan-actions">
              {scanMode === 'CARD' ? (
                <button className="btn-primary" onClick={handleSave} disabled={saving || !scannedData.tenDoanhNghiep}>
                  <FiSave /> Lưu Danh bạ
                </button>
              ) : (
                <p style={{fontSize: '12px', color: '#666', textAlign: 'center'}}>Dữ liệu hóa đơn sẽ tự động chuyển sang bảng Thu Chi</p>
              )}
            </div>
          </div>
        </div>

        <div className="recent-contacts-section">
          <div className="section-divider"><span>Danh bạ lưu gần đây</span></div>
          {loadingContacts ? <FiLoader className="spin" /> : (
            <div className="contacts-mini-list">
              {recentContacts.map((contact, idx) => (
                <div key={idx} className="contact-mini-item">
                  <div className="contact-name">{contact.ten}</div>
                  <a href={`tel:${contact.sdt}`} className="mini-call-btn"><FiPhoneCall size={14} /></a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BusinessScanner;
