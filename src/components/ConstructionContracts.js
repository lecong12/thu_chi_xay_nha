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
        console.error("Lỗi tải hợp đồng:", error);
      } finally {
        setLoading(false);
      }
    };
    loadContracts();
  }, [APP_ID]);

  // HÀM MỞ FILE SẠCH: Ép trình duyệt mở tab mới với URL nguyên bản
  const openCleanLink = (rawUrl) => {
    if (!rawUrl) return;
    // Bóc sạch mọi dấu ngoặc kép và khoảng trắng
    const pureUrl = rawUrl.toString().replace(/['"]/g, "").trim();
    
    // Mở bằng Window API để thoát khỏi sự kiểm soát của React Router (tránh bị bọc link)
    const win = window.open(pureUrl, '_blank', 'noopener,noreferrer');
    if (win) win.focus();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      showToast("Vui lòng chỉ chọn file PDF.", "warning");
      return;
    }

    try {
      setUploading(true);
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`, {
        method: "POST",
        body: data,
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
          showToast("Upload thành công!", "success");
        }
      }
    } catch (error) {
      showToast("Lỗi upload: " + error.message, "error");
    } finally {
      setUploading(false);
      e.target.value = null; 
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc muốn xóa hợp đồng này?")) {
      const res = await deleteRowFromSheet("HopDong", id, APP_ID);
      if (res.success) {
        setContracts(contracts.filter(c => c.id !== id && c._RowNumber !== id));
      }
    }
  };

  const currentList = contracts.filter(c => c.category === activeCategory);

  return (
    <div className="contracts-container">
      <h2 className="page-title"><FiBriefcase /> Quản lý Hợp đồng Xây dựng</h2>
      
      <div className="category-tabs">
        {CATEGORIES.map(cat => (
          <button 
            key={cat.id} 
            className={`tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="contracts-content">
        <div className="upload-box">
          <label className={`upload-btn ${uploading ? 'disabled' : ''}`}>
            {uploading ? <FiLoader className="spin" /> : <FiUpload />}
            <span>{uploading ? "Đang tải..." : `Tải lên PDF`}</span>
            <input type="file" accept="application/pdf" onChange={handleFileUpload} disabled={uploading} hidden />
          </label>
        </div>

        {loading ? (
            <div className="loading-text">Đang tải dữ liệu...</div>
        ) : (
        <div className="contracts-list">
          {currentList.length === 0 && <div className="no-contracts">Chưa có hợp đồng nào.</div>}
          
          {currentList.map(contract => (
            <div key={contract.id || contract._RowNumber} className="contract-item">
              <div className="contract-icon"><FiFileText size={24} /></div>
              <div className="contract-info">
                <span className="contract-name">{contract.name}</span>
                <span className="contract-meta">{contract.date} • {contract.size}</span>
              </div>
              <div className="contract-actions">
                {/* THAY THẾ MODAL BẰNG VIỆC MỞ TRỰC TIẾP TAB MỚI */}
                <button 
                   className="action-icon view" 
                   onClick={() => openCleanLink(contract.url)} 
                   title="Xem ngay"
                >
                  <FiEye />
                </button>
                <button 
                   className="action-icon download" 
                   onClick={() => openCleanLink(contract.url)} 
                   title="Tải về"
                >
                  <FiDownload />
                </button>
                <button className="action-icon delete" onClick={() => handleDelete(contract.id || contract._RowNumber)} title="Xóa">
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}

export default ConstructionContracts;
