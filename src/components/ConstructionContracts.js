import React, { useState, useEffect } from 'react';
import { FiUpload, FiTrash2, FiFileText, FiDownload, FiLoader, FiBriefcase, FiEye, FiX } from 'react-icons/fi';
import { fetchTableData, addRowToSheet, deleteRowFromSheet } from '../utils/sheetsAPI';
import './ConstructionContracts.css';

// Lấy cấu hình từ môi trường
const CLOUD_NAME = (process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "").replace(/['"]/g, '');
const UPLOAD_PRESET = (process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "").replace(/['"]/g, '');

const CATEGORIES = [
  { id: 'tho', label: 'Hợp đồng Xây lắp thô' },
  { id: 'hoanthien', label: 'Hợp đồng Thi công hoàn thiện' },
  { id: 'noithat', label: 'Hợp đồng Thi công nội thất' }
];

function ConstructionContracts() {
  const [activeCategory, setActiveCategory] = useState('tho');
  const [contracts, setContracts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [viewingPdf, setViewingPdf] = useState(null);
  const [loading, setLoading] = useState(true);
  const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;

  // Tải dữ liệu từ AppSheet
  const loadContracts = async () => {
    setLoading(true);
    try {
      const res = await fetchTableData("HopDong", APP_ID);
      if (res.success) {
        setContracts(res.data || []);
      }
    } catch (error) {
      console.error("Lỗi tải hợp đồng:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Vui lòng chỉ chọn file PDF.");
      return;
    }

    try {
      setUploading(true);
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", UPLOAD_PRESET);
      data.append("resource_type", "raw"); // Đảm bảo đẩy vào kho 'raw' để trình duyệt đọc được

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`, {
        method: "POST",
        body: data,
      });
      
      const fileData = await res.json();
      
      if (fileData.secure_url) {
        // Chuẩn bị dữ liệu ghi xuống Google Sheets (AppSheet)
        const rowData = {
            id: `CT_${Date.now()}`, // Key của dòng
            Tên: file.name,
            url: fileData.secure_url, // Cột 'url' theo yêu cầu
            Ngày: new Date().toLocaleDateString('vi-VN'),
            "Kích thước": (file.size / 1024 / 1024).toFixed(2) + ' MB',
            category: activeCategory // Cột 'category' theo yêu cầu
        };
        
        const sheetRes = await addRowToSheet("HopDong", rowData, APP_ID);
        
        if (sheetRes.success) {
          // Cập nhật giao diện ngay
          setContracts(prev => [rowData, ...prev]);
        }
      }
    } catch (error) {
      alert("Lỗi upload: " + error.message);
    } finally {
      setUploading(false);
      e.target.value = null; 
    }
  };

  const handleDelete = async (id, rowNumber) => {
    if (window.confirm("Bạn có chắc muốn xóa hợp đồng này?")) {
      const res = await deleteRowFromSheet("HopDong", id, rowNumber, APP_ID);
      if (res.success) {
        setContracts(contracts.filter(c => (c.id !== id && c._RowNumber !== rowNumber)));
      }
    }
  };

  // Lọc danh sách theo Tab đang chọn
  const currentList = contracts.filter(c => c.category === activeCategory);

  return (
    <div className="contracts-container">
      <h2 className="page-title"><FiBriefcase /> Quản lý Hợp đồng Xây dựng</h2>
      
      {/* Tabs phân loại */}
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
        {/* Vùng Upload */}
        <div className="upload-box">
          <label className={`upload-btn ${uploading ? 'disabled' : ''}`}>
            {uploading ? <FiLoader className="spin" /> : <FiUpload />}
            <span>{uploading ? "Đang xử lý..." : `Tải PDF cho ${CATEGORIES.find(c => c.id === activeCategory)?.label}`}</span>
            <input type="file" accept="application/pdf" onChange={handleFileUpload} disabled={uploading} hidden />
          </label>
        </div>

        {loading ? (
            <div className="loading-text">Đang đồng bộ dữ liệu...</div>
        ) : (
        <div className="contracts-list">
          {currentList.length === 0 && <div className="no-contracts">Chưa có hợp đồng nào.</div>}
          
          {currentList.map(contract => (
            <div key={contract.id || contract._RowNumber} className="contract-item">
              <div className="contract-icon"><FiFileText size={24} /></div>
              <div className="contract-info">
                <span className="contract-name">{contract.name}</span>
                <span className="contract-meta">{contract.date} &bull; {contract.size}</span>
              </div>
              <div className="contract-actions">
                <button className="action-icon view" onClick={() => setViewingPdf(contract)} title="Xem ngay">
                  <FiEye />
                </button>
                <a href={contract.url} target="_blank" rel="noreferrer" className="action-icon download" title="Tải về">
                  <FiDownload />
                </a>
                <button className="action-icon delete" onClick={() => handleDelete(contract.id, contract._RowNumber)} title="Xóa">
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Modal Xem PDF - Tối ưu cho Cloudinary Raw */}
      {viewingPdf && (
        <div className="pdf-viewer-overlay" onClick={() => setViewingPdf(null)}>
          <div className="pdf-viewer-container" onClick={e => e.stopPropagation()}>
            <div className="pdf-header">
              <h3>{viewingPdf.name}</h3>
              <button className="close-pdf-btn" onClick={() => setViewingPdf(null)}><FiX size={24} /></button>
            </div>
            <div className="pdf-body">
              {/* Dùng object để nhúng PDF, có nút tải về nếu lỗi */}
              <object 
                data={viewingPdf.url} 
                type="application/pdf" 
                width="100%" 
                height="100%"
              >
                <div className="pdf-fallback">
                   <FiFileText size={50} color="#94a3b8" />
                   <p>Không thể hiển thị PDF trực tiếp trong khung này.</p>
                   <a href={viewingPdf.url} target="_blank" rel="noreferrer" className="btn-open-new">
                     Mở tệp trong tab mới <FiDownload />
                   </a>
                </div>
              </object>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConstructionContracts;
