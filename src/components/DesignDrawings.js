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

  // HÀM MỞ FILE SẠCH: Đảm bảo không dính domain app
  const handleViewPdf = (rawUrl) => {
    if (!rawUrl) return;
    const cleanUrl = rawUrl.toString().replace(/['"]/g, "").trim();
    if (cleanUrl.startsWith('http')) {
      window.open(cleanUrl, '_blank', 'noopener,noreferrer');
    } else {
      showToast("Link không hợp lệ", "error");
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
          showToast("Đã tải lên bản vẽ!", "success");
        }
      }
    } catch (error) { showToast("Lỗi: " + error.message, "error"); } finally { setUploading(false); }
  };

  const currentList = drawings.filter(d => d.category === activeCategory);

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
          <span>Tải bản vẽ PDF</span>
          <input type="file" accept="application/pdf" onChange={handleFileUpload} hidden />
        </label>
      </div>
      <div className="drawings-grid">
        {currentList.map(d => (
          <div key={d.id || d._RowNumber} className="drawing-card">
            <div className="drawing-icon"><FiFileText size={32} color="#3b82f6" /></div>
            <div className="drawing-info">
              <div className="drawing-name">{d.name}</div>
              <div className="drawing-meta">{d.date} • {d.size}</div>
            </div>
            <div className="drawing-actions">
              <button className="icon-btn view" onClick={() => handleViewPdf(d.url)}><FiEye /></button>
              <button className="icon-btn download" onClick={() => handleViewPdf(d.url)}><FiDownload /></button>
              <button className="icon-btn delete" onClick={() => {/* Hàm xóa */}}><FiTrash2 /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default DesignDrawings;
