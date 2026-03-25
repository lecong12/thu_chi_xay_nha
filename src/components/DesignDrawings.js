import React, { useState, useEffect } from 'react';
import { FiUpload, FiTrash2, FiEye, FiDownload, FiLoader, FiMap, FiFileText } from 'react-icons/fi';
import { fetchTableData, addRowToSheet, deleteRowFromSheet } from '../utils/sheetsAPI';
import './DesignDrawings.css';

const CLOUD_NAME = (process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "").replace(/['"]/g, '').trim();
const UPLOAD_PRESET = (process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "").replace(/['"]/g, '').trim();

function DesignDrawings({ showToast }) {
  const [activeCategory, setActiveCategory] = useState('kientruc');
  const [drawings, setDrawings] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;

  useEffect(() => {
    const loadDrawings = async () => {
      setLoading(true);
      try {
        const res = await fetchTableData("BanVe", APP_ID);
        if (res.success) setDrawings(res.data || []);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    loadDrawings();
  }, [APP_ID]);

  // --- HÀM MỞ FILE CHUẨN: Bóc tách URL từ Object AppSheet ---
  const handleViewFile = (rawData) => {
    if (!rawData) {
      showToast("Không tìm thấy link bản vẽ.", "error");
      return;
    }

    let finalUrl = "";
    const strData = rawData.toString();

    // Kiểm tra định dạng {Url: ..., LinkText: ...}
    if (strData.includes("Url:")) {
      const match = strData.match(/Url:\s*([^,}\s"']+)/);
      if (match && match[1]) {
        finalUrl = match[1];
      }
    } else {
      finalUrl = strData.replace(/['"{}]/g, "").trim();
    }

    if (finalUrl) {
      // Ép giao thức tuyệt đối để tránh domain nội bộ
      if (!finalUrl.startsWith('http')) {
        finalUrl = 'https://' + finalUrl.replace(/^\/+/, '');
      }
      
      const newWin = window.open(finalUrl, '_blank', 'noopener,noreferrer');
      if (newWin) newWin.focus();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf") {
      showToast("Chỉ chấp nhận file PDF.", "warning");
      return;
    }
    try {
      setUploading(true);
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`, { method: "POST", body: data });
      const fileData = await res.json();
      if (fileData.secure_url) {
        const rowData = {
          id: `BV_${Date.now()}`,
          name: file.name,
          url: fileData.secure_url,
          date: new Date().toLocaleDateString('vi-VN'),
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
          category: activeCategory
        };
        const sheetRes = await addRowToSheet("BanVe", rowData, APP_ID);
        if (sheetRes.success) {
          setDrawings(prev => [rowData, ...prev]);
          showToast("Đã tải lên bản vẽ thành công!", "success");
        }
      }
    } catch (error) { showToast("Lỗi: " + error.message, "error"); } finally { setUploading(false); }
  };

  return (
    <div className="drawings-container">
      <h2 className="page-title"><FiMap /> Hồ sơ Bản vẽ</h2>
      
      <div className="category-tabs">
        {['kientruc', 'ketcau', 'diennuoc', 'noithat'].map(id => (
          <button key={id} className={`tab-btn ${activeCategory === id ? 'active' : ''}`} onClick={() => setActiveCategory(id)}>
            {id === 'kientruc' ? 'Kiến trúc' : id === 'ketcau' ? 'Kết cấu' : id === 'diennuoc' ? 'Điện nước' : 'Nội thất'}
          </button>
        ))}
      </div>

      <div className="upload-box">
        <label className={`upload-btn ${uploading ? 'disabled' : ''}`}>
          {uploading ? <FiLoader className="spin" /> : <FiUpload />}
          <span>Tải lên bản vẽ</span>
          <input type="file" accept="application/pdf" onChange={handleFileUpload} hidden disabled={uploading} />
        </label>
      </div>

      <div className="drawings-grid">
        {loading ? (
          <div className="loading-state">Đang tải bản vẽ...</div>
        ) : (
          drawings.filter(d => d.category === activeCategory).map(d => (
            <div key={d.id || d._RowNumber} className="drawing-card">
              <div className="drawing-icon"><FiFileText size={32} color="#3b82f6" /></div>
              <div className="drawing-info">
                <div className="drawing-name">{d.name}</div>
                <div className="drawing-meta">{d.date} • {d.size}</div>
              </div>
              <div className="drawing-actions">
                <button className="icon-btn view" onClick={() => handleViewFile(d.url)} title="Xem"><FiEye /></button>
                <button className="icon-btn download" onClick={() => handleViewFile(d.url)} title="Tải về"><FiDownload /></button>
                <button className="icon-btn delete" onClick={() => {}} title="Xóa"><FiTrash2 /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default DesignDrawings;