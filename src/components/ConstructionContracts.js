import React, { useState, useEffect } from 'react';
import { FiUpload, FiTrash2, FiDownload, FiLoader, FiBriefcase, FiEye } from 'react-icons/fi';
import { fetchTableData, addRowToSheet } from '../utils/sheetsAPI';
import './ConstructionContracts.css';

const CLOUD_NAME = (process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "").replace(/['"]/g, '').trim();
const UPLOAD_PRESET = (process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "").replace(/['"]/g, '').trim();

function ConstructionContracts({ showToast }) {
  const [activeCategory, setActiveCategory] = useState('tho');
  const [contracts, setContracts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;

  useEffect(() => {
    const loadContracts = async () => {
      setLoading(true);
      try {
        const res = await fetchTableData("HopDong", APP_ID);
        if (res.success) setContracts(res.data || []);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    loadContracts();
  }, [APP_ID]);

  // HÀM LỌC LINK SẠCH (DÙNG CHUNG)
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

  // 1. HÀM XEM FILE (Mở Tab mới)
  const handleViewFile = (rawData) => {
    const url = getCleanUrl(rawData);
    if (!url) return showToast("Không có link file", "error");
    const win = window.open(url, '_blank');
    if (win) win.focus();
    else showToast("Vui lòng cho phép trình duyệt mở Pop-up", "warning");
  };

  // 2. HÀM TẢI FILE (Ép trình duyệt tải về)
  const handleDownloadFile = (rawData) => {
    let url = getCleanUrl(rawData);
    if (!url) return showToast("Không có link tải", "error");
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
          id: `CT_${Date.now()}`,
          name: file.name,
          url: fileData.secure_url,
          date: new Date().toLocaleDateString('vi-VN'),
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
          category: activeCategory
        };
        const sheetRes = await addRowToSheet("HopDong", rowData, APP_ID);
        if (sheetRes.success) {
          setContracts(prev => [rowData, ...prev]);
          showToast("Tải lên thành công!", "success");
        }
      }
    } catch (error) { showToast("Lỗi: " + error.message, "error"); } finally { setUploading(false); }
  };

  return (
    <div className="contracts-container">
      <h2 className="page-title"><FiBriefcase /> Quản lý Hợp đồng</h2>
      <div className="category-tabs">
        {['tho', 'hoanthien', 'noithat'].map(id => (
          <button key={id} className={`tab-btn ${activeCategory === id ? 'active' : ''}`} onClick={() => setActiveCategory(id)}>
            {id === 'tho' ? 'Xây lắp thô' : id === 'hoanthien' ? 'Hoàn thiện' : 'Nội thất'}
          </button>
        ))}
      </div>
      <div className="upload-box">
        <label className={`upload-btn ${uploading ? 'disabled' : ''}`}>
          {uploading ? <FiLoader className="spin" /> : <FiUpload />}
          <span>Tải PDF lên</span>
          <input type="file" accept="application/pdf" onChange={handleFileUpload} hidden disabled={uploading} />
        </label>
      </div>
      <div className="contracts-list">
        {loading ? <div className="loading-state">Đang tải...</div> : 
          contracts.filter(c => c.category === activeCategory).map(c => (
          <div key={c.id || c._RowNumber} className="contract-item">
            <div className="contract-info">
              <span className="contract-name">{c.name}</span>
              <span className="contract-meta">{c.date} • {c.size}</span>
            </div>
            <div className="contract-actions">
              <button className="action-icon view" onClick={() => handleViewFile(c.url)} title="Xem"><FiEye /></button>
              <button className="action-icon download" onClick={() => handleDownloadFile(c.url)} title="Tải về"><FiDownload /></button>
              <button className="action-icon delete"><FiTrash2 /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default ConstructionContracts;