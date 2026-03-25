import React, { useState, useEffect } from 'react';
import { FiUpload, FiTrash2, FiFileText, FiDownload, FiLoader, FiBriefcase, FiEye } from 'react-icons/fi';
import { fetchTableData, addRowToSheet, deleteRowFromSheet } from '../utils/sheetsAPI';
import './ConstructionContracts.css';

const CLOUD_NAME = (process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "").replace(/['"]/g, '');
const UPLOAD_PRESET = (process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "").replace(/['"]/g, '');

const CATEGORIES = [
  { id: 'tho', label: 'Hợp đồng Xây lắp thô' },
  { id: 'hoanthien', label: 'Hợp đồng Thi công hoàn thiện' },
  { id: 'noithat', label: 'Hợp đồng Thi công nội thất' }
];

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
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
      } finally {
        setLoading(false);
      }
    };
    loadContracts();
  }, [APP_ID]);

  // HÀM QUAN TRỌNG: Mở link sạch, không để trình duyệt chèn thêm domain
  const handleOpenLink = (rawUrl) => {
    if (!rawUrl) return;
    // Bóc sạch dấu ngoặc kép và khoảng trắng để lấy link nguyên bản https://...
    const pureUrl = rawUrl.toString().replace(/['"]/g, "").trim();
    
    // Mở bằng Window API để thoát ly hoàn toàn khỏi domain của App
    const win = window.open(pureUrl, '_blank', 'noopener,noreferrer');
    if (win) win.focus();
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

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`, {
        method: "POST",
        body: data
      });
      
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
    } catch (error) {
      showToast("Lỗi: " + error.message, "error");
    } finally {
      setUploading(false);
      e.target.value = null; 
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Xác nhận xóa hợp đồng này?")) {
      const res = await deleteRowFromSheet("HopDong", id, APP_ID);
      if (res.success) {
        setContracts(contracts.filter(c => c.id !== id && c._RowNumber !== id));
      }
    }
  };

  const currentList = contracts.filter(c => c.category === activeCategory);

  return (
    <div className="contracts-container">
      <h2 className="page-title"><FiBriefcase /> Quản lý Hợp đồng</h2>
      <div className="category-tabs">
        {CATEGORIES.map(cat => (
          <button key={cat.id} className={`tab-btn ${activeCategory === cat.id ? 'active' : ''}`} onClick={() => setActiveCategory(cat.id)}>
            {cat.label}
          </button>
        ))}
      </div>
      <div className="upload-box">
        <label className={`upload-btn ${uploading ? 'disabled' : ''}`}>
          {uploading ? <FiLoader className="spin" /> : <FiUpload />}
          <span>Tải lên bản PDF</span>
          <input type="file" accept="application/pdf" onChange={handleFileUpload} hidden />
        </label>
      </div>
      {loading ? <div className="loading">Đang tải...</div> : (
        <div className="contracts-list">
          {currentList.map(contract => (
            <div key={contract.id || contract._RowNumber} className="contract-item">
              <div className="contract-info">
                <span className="contract-name">{contract.name}</span>
                <span className="contract-meta">{contract.date} • {contract.size}</span>
              </div>
              <div className="contract-actions">
                {/* Dùng button và gọi hàm mở link sạch */}
                <button className="action-icon view" onClick={() => handleOpenLink(contract.url)}><FiEye /></button>
                <button className="action-icon download" onClick={() => handleOpenLink(contract.url)}><FiDownload /></button>
                <button className="action-icon delete" onClick={() => handleDelete(contract.id || contract._RowNumber)}><FiTrash2 /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export default ConstructionContracts;
