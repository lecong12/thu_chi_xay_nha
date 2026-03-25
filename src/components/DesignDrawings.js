import React, { useState, useEffect } from 'react';
import { FiUpload, FiTrash2, FiEye, FiDownload, FiLoader, FiMap, FiFileText } from 'react-icons/fi';
import { fetchTableData, addRowToSheet } from '../utils/sheetsAPI';
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

  const getCleanUrl = (rawData) => {
    if (!rawData) return "";
    let finalUrl = "";
    const strData = rawData.toString();
    if (strData.includes("Url:")) {
      const match = strData.match(/Url:\s*([^,}\s"']+)/);
      finalUrl = match ? match[1] : "";
    } else {
      finalUrl = strData.replace(/['"{}]/g, "").trim();
    }
    if (finalUrl && !finalUrl.startsWith('http')) {
      finalUrl = 'https://' + finalUrl.replace(/^\/+/, '');
    }
    return finalUrl;
  };

  const handleViewFile = (rawData) => {
    const url = getCleanUrl(rawData);
    if (!url) return showToast("Không có link", "error");
    const win = window.open(url, '_blank');
    if (win) win.focus();
    else showToast("Vui lòng cho phép trình duyệt mở Pop-up", "warning");
  };

  const handleDownloadFile = (rawData) => {
    let url = getCleanUrl(rawData);
    if (!url) return showToast("Không có link", "error");
    if (url.includes("cloudinary.com")) {
      url = url.replace("/upload/", "/upload/fl_attachment/");
    }
    const link = document.body.appendChild(document.createElement('a'));
    link.href = url;
    link.download = "";
    link.target = "_blank";
    link.click();
    link.remove();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf") {
      showToast("Chỉ PDF.", "warning");
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
          showToast("Đã tải lên!", "success");
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
        {loading ? <div className="loading-state">Đang tải...</div> :
          drawings.filter(d => d.category === activeCategory).map(d => (
          <div key={d.id || d._RowNumber} className="drawing-card">
            <div className="drawing-icon"><FiFileText size={32} color="#3b82f6" /></div>
            <div className="drawing-info">
              <div className="drawing-name">{d.name}</div>
              <div className="drawing-meta">{d.date} • {d.size}</div>
            </div>
            <div className="drawing-actions">
              <button className="icon-btn view" onClick={() => handleViewFile(d.url)}><FiEye /></button>
              <button className="icon-btn download" onClick={() => handleDownloadFile(d.url)}><FiDownload /></button>
              <button className="icon-btn delete"><FiTrash2 /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default DesignDrawings;