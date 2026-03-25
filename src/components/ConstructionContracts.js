import React, { useState, useEffect } from 'react';
import { FiUpload, FiTrash2, FiFileText, FiDownload, FiLoader, FiBriefcase, FiEye } from 'react-icons/fi';
import { fetchTableData, addRowToSheet, deleteRowFromSheet } from '../utils/sheetsAPI';
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

  // LOGIC MỞ FILE: Loại bỏ hoàn toàn nhúng (embed), mở trực tiếp link sạch
  const handleOpenPdf = (rawUrl) => {
    if (!rawUrl) return;
    // Làm sạch link tuyệt đối
    const cleanUrl = rawUrl.toString().replace(/['"]/g, "").trim();
    // Mở tab mới độc lập, không liên quan đến domain hiện tại
    const newWindow = window.open(cleanUrl, '_blank', 'noopener,noreferrer');
    if (newWindow) newWindow.focus();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf") {
      showToast("Vui lòng chọn file PDF.", "warning");
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

  const handleDelete = async (id) => {
    if (window.confirm("Xóa hợp đồng này?")) {
      const res = await deleteRowFromSheet("HopDong", id, APP_ID);
      if (res.success) setContracts(contracts.filter(c => (c.id || c._RowNumber) !== id));
    }
  };

  return (
    <div className="contracts-container">
      <h2 className="page-title"><FiBriefcase /> Quản lý Hợp đồng</h2>
      <div className="category-tabs">
        {['tho', 'hoanthien', 'noithat'].map(id => (
          <button key={id} className={`tab-btn ${activeCategory === id ? 'active' : ''}`} onClick={() => setActiveCategory(id)}>
            {id === 'tho' ? 'Hợp đồng Thô' : id === 'hoanthien' ? 'Hoàn thiện' : 'Nội thất'}
          </button>
        ))}
      </div>
      <div className="upload-box">
        <label className={`upload-btn ${uploading ? 'disabled' : ''}`}>
          {uploading ? <FiLoader className="spin" /> : <FiUpload />}
          <span>Tải PDF lên Cloudinary</span>
          <input type="file" accept="application/pdf" onChange={handleFileUpload} hidden />
        </label>
      </div>
      <div className="contracts-list">
        {contracts.filter(c => c.category === activeCategory).map(c => (
          <div key={c.id || c._RowNumber} className="contract-item">
            <div className="contract-info">
              <span className="contract-name">{c.name}</span>
              <span className="contract-meta">{c.date} • {c.size}</span>
            </div>
            <div className="contract-actions">
              {/* SỬ DỤNG onClick ĐỂ GỌI HÀM MỞ LINK SẠCH */}
              <button className="action-icon view" onClick={() => handleOpenPdf(c.url)} title="Xem PDF"><FiEye /></button>
              <button className="action-icon download" onClick={() => handleOpenPdf(c.url)} title="Tải về"><FiDownload /></button>
              <button className="action-icon delete" onClick={() => handleDelete(c.id || c._RowNumber)}><FiTrash2 /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default ConstructionContracts;
