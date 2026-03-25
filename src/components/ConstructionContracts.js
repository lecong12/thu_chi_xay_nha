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

  // --- HÀM SỬA DỨT ĐIỂM LỖI LINK ---
  const handleViewFile = (rawData) => {
    if (!rawData) {
      showToast("Không tìm thấy đường dẫn file.", "error");
      return;
    }

    let finalUrl = "";
    const strData = rawData.toString();

    // 1. Nếu dính định dạng Object của AppSheet: {Url: https://..., LinkText: ...}
    if (strData.includes("{Url:") || strData.includes("Url:")) {
      // Dùng Regex lấy nội dung sau Url: cho đến dấu phẩy hoặc dấu đóng ngoặc
      const match = strData.match(/Url:\s*([^,}\s"']+)/);
      if (match && match[1]) {
        finalUrl = match[1];
      }
    } 
    // 2. Nếu là chuỗi link bình thường
    else {
      finalUrl = strData.replace(/['"{}]/g, "").trim();
    }

    if (finalUrl) {
      // Đảm bảo có giao thức https:// (tránh bị chèn domain Vercel)
      if (!finalUrl.startsWith('http')) {
        finalUrl = 'https://' + finalUrl.replace(/^\/+/, '');
      }

      // Mở Tab mới hoàn toàn độc lập
      const newWindow = window.open(finalUrl, '_blank', 'noopener,noreferrer');
      if (newWindow) {
        newWindow.focus();
      } else {
        showToast("Trình duyệt đã chặn cửa sổ bật lên. Vui lòng cho phép để xem file.", "warning");
      }
    } else {
      showToast("Định dạng link không hợp lệ.", "error");
    }
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
          url: fileData.secure_url, // Cloudinary trả về link sạch
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

  const handleDelete = async (contract) => {
    if (!window.confirm(`Xóa hợp đồng: ${contract.name}?`)) return;
    // logic deleteRowFromSheet...
  };

  return (
    <div className="contracts-container">
      <h2 className="page-title"><FiBriefcase /> Quản lý Hợp đồng</h2>
      
      {/* Tabs Phân loại */}
      <div className="category-tabs">
        {['tho', 'hoanthien', 'noithat'].map(id => (
          <button key={id} className={`tab-btn ${activeCategory === id ? 'active' : ''}`} onClick={() => setActiveCategory(id)}>
            {id === 'tho' ? 'Xây lắp thô' : id === 'hoanthien' ? 'Hoàn thiện' : 'Nội thất'}
          </button>
        ))}
      </div>

      {/* Box Upload */}
      <div className="upload-box">
        <label className={`upload-btn ${uploading ? 'disabled' : ''}`}>
          {uploading ? <FiLoader className="spin" /> : <FiUpload />}
          <span>Tải PDF lên</span>
          <input type="file" accept="application/pdf" onChange={handleFileUpload} hidden disabled={uploading} />
        </label>
      </div>

      {/* Danh sách Hợp đồng */}
      <div className="contracts-list">
        {loading ? (
          <div className="loading-state"><FiLoader className="spin" /> Đang tải...</div>
        ) : (
          contracts.filter(c => c.category === activeCategory).map(c => (
            <div key={c.id || c._RowNumber} className="contract-item">
              <div className="contract-info">
                <span className="contract-name">{c.name}</span>
                <span className="contract-meta">{c.date} • {c.size}</span>
              </div>
              <div className="contract-actions">
                {/* Nút Xem & Tải về đều dùng hàm lọc link mới */}
                <button className="action-icon view" onClick={() => handleViewFile(c.url)} title="Xem trực tuyến">
                  <FiEye />
                </button>
                <button className="action-icon download" onClick={() => handleViewFile(c.url)} title="Tải file">
                  <FiDownload />
                </button>
                <button className="action-icon delete" onClick={() => handleDelete(c)} title="Xóa">
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ConstructionContracts;