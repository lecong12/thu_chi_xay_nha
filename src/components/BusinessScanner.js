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
  
  // Mặc định là quét CARD, anh có thể bấm nút để đổi sang quét BILL (Hóa đơn)
  const [scanMode, setScanMode] = useState('CARD'); 

  const [scannedData, setScannedData] = useState({
    tenDoanhNghiep: "",
    soDienThoai: "",
    hinhAnh: "",
    soTien: 0,
    noiDung: "",
    ngay: ""
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
    } catch (e) { console.error("Lỗi danh bạ:", e); } finally { setLoadingContacts(false); }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Hiển thị ảnh xem trước ngay
    const localUrl = URL.createObjectURL(file);
    setImage(localUrl);
    setUploading(true);
    setScanning(true);
    showToast("Đang tải ảnh và AI đang phân tích...", "info");

    try {
      // BƯỚC 1: UPLOAD LÊN CLOUDINARY
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      const resCloud = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST", body: formData
      });
      const cloudData = await resCloud.json();
      const imageUrl = cloudData.secure_url;

      // BƯỚC 2: GỬI LỆNH (PROMPT) SIÊU CẤP CHO GEMINI
      const promptInstruction = scanMode === 'BILL' 
        ? "Bạn là kế toán công trình. Hãy trích xuất từ hóa đơn này: 1. Số tiền TỔNG CỘNG cuối cùng (so_tien); 2. Nội dung mua hàng tóm tắt (noi_dung); 3. Tên cửa hàng/đơn vị bán (don_vi); 4. Ngày tháng (ngay). Trả về JSON duy nhất."
        : "Bạn là chuyên gia marketing. Hãy trích xuất từ Card/Bảng hiệu này: 1. Tên đơn vị/Cửa hàng lớn nhất (ten); 2. Số điện thoại liên hệ (sdt); 3. Địa chỉ (dia_chi). Trả về JSON duy nhất.";

      const resAI = await fetch('/api/gemini-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageUrl, 
          type: scanMode === 'BILL' ? 'bill' : 'card',
          prompt: promptInstruction // Ép Backend dùng lệnh mới của mình
        })
      });
      
      const aiData = await resAI.json();

      if (aiData && !aiData.error) {
        const result = {
          tenDoanhNghiep: aiData.don_vi || aiData.ten || "",
          soDienThoai: aiData.sdt || aiData.so_dien_thoai || "",
          hinhAnh: imageUrl,
          soTien: aiData.so_tien || 0,
          noiDung: aiData.noi_dung || "",
          ngay: aiData.ngay || ""
        };
        setScannedData(result);

        // NẾU LÀ HÓA ĐƠN: Gọi hàm ở App.js để tự mở Modal nhập tiền
        if (scanMode === 'BILL' && onScanSuccess) {
          onScanSuccess({...aiData, image_url: imageUrl}, 'BILL');
        }
        showToast("Gemini đã trích xuất thông minh!", "success");
      }
    } catch (err) {
      showToast("Lỗi xử lý: " + err.message, "error");
    } finally {
      setUploading(false);
      setScanning(false);
    }
  };

  const handleSaveContact = async () => {
    if (!scannedData.tenDoanhNghiep && !scannedData.soDienThoai) return;
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
        setScannedData({ tenDoanhNghiep: "", soDienThoai: "", hinhAnh: "", soTien: 0, noiDung: "" });
        loadRecentContacts();
      }
    } catch (error) { showToast("Lỗi lưu: " + error.message, "error"); } finally { setSaving(false); }
  };

  return (
    <div className="scanner-container">
      <div className="scanner-card">
        <div className="scanner-header">
          <h3><FiCamera /> Quét Thông minh (AI)</h3>
          <div className="scan-mode-toggle">
            <button className={scanMode === 'CARD' ? 'active' : ''} onClick={() => setScanMode('CARD')}>
              <FiSearch /> Danh thiếp
            </button>
            <button className={scanMode === 'BILL' ? 'active' : ''} onClick={() => setScanMode('BILL')}>
              <FiFileText /> Hóa đơn
            </button>
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
                <FiImage size={35} />
                <span>Chụp hoặc Chọn ảnh ({scanMode === 'CARD' ? 'Card' : 'Hóa đơn'})</span>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} hidden accept="image/*" />
          </div>

          <div className="scan-result-form">
            <div className="scan-input-group">
              <label>Tên Đơn vị / Cửa hàng</label>
              <input type="text" value={scannedData.tenDoanhNghiep} placeholder="Đang chờ AI..." onChange={e => setScannedData({...scannedData, tenDoanhNghiep: e.target.value})} />
            </div>
            
            <div className="scan-input-group">
              <label>{scanMode === 'CARD' ? "Số điện thoại" : "Số tiền trích xuất"}</label>
              <input 
                type="text" 
                value={scanMode === 'CARD' ? scannedData.soDienThoai : scannedData.soTien} 
                onChange={e => setScannedData({...scannedData, [scanMode === 'CARD' ? 'soDienThoai' : 'soTien']: e.target.value})} 
              />
            </div>

            <div className="scan-actions">
              {scanMode === 'CARD' ? (
                <button className="btn-primary" onClick={handleSaveContact} disabled={saving || !scannedData.hinhAnh}>
                  {saving ? <FiLoader className="spin" /> : <FiSave />} Lưu Danh bạ
                </button>
              ) : (
                <p className="scan-hint">Thông tin hóa đơn đã được chuyển sang bảng Giao dịch.</p>
              )}
            </div>
          </div>
        </div>

        {scannedData.soDienThoai && scanMode === 'CARD' && (
          <a href={`tel:${scannedData.soDienThoai}`} className="btn-call-now">
            <FiPhoneCall /> Gọi ngay: {scannedData.soDienThoai}
          </a>
        )}

        <div className="recent-contacts-section">
          <div className="section-divider"><span>10 Liên hệ mới nhất</span></div>
          {loadingContacts ? <FiLoader className="spin" /> : (
            <div className="contacts-mini-list">
              {recentContacts.map((c, i) => (
                <div key={i} className="contact-mini-item">
                  <div className="info"><b>{c.ten}</b> - {c.sdt}</div>
                  <a href={`tel:${c.sdt}`} className="call-icon"><FiPhoneCall size={14} /></a>
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
