import React, { useState, useEffect } from 'react';
import { FiUpload, FiTrash2, FiEye, FiDownload, FiLoader, FiMap, FiFileText } from 'react-icons/fi';
import { fetchTableData, addRowToSheet, deleteRowFromSheet } from '../utils/sheetsAPI';
import './DesignDrawings.css';

const CLOUD_NAME = (process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "").replace(/['"]/g, '');
const UPLOAD_PRESET = (process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "").replace(/['"]/g, '');

const DRAWING_CATEGORIES = [
  { id: 'kientruc', label: 'Bản vẽ Kiến trúc' },
  { id: 'ketcau', label: 'Bản vẽ Kết cấu' },
  { id: 'diennuoc', label: 'Bản vẽ Điện nước (ME)' },
  { id: 'noithat', label: 'Bản vẽ Nội thất' }
];

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
      } catch (error) {
        console.error("Lỗi tải bản vẽ:", error);
      } finally {
        setLoading(false);
      }
    };
    loadDrawings();
  }, [APP_ID]);

  // HÀM MỞ LINK SẠCH: Đảm bảo không bị bọc bởi domain trang web
  const openUrlClean = (rawUrl) => {
    if (!rawUrl) return;
    // Bóc tách sạch sẽ dấu ngoặc kép và khoảng trắng dư thừa
    const pureUrl = rawUrl.toString().replace(/['"]/g, "").trim();
    
    // Sử dụng window.open trực tiếp để trình duyệt nhận diện đây là External Link
    const newWindow = window.open(pureUrl, '_blank', 'noopener,noreferrer');
    if (newWindow) newWindow.focus();
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
      data.append("resource_type", "raw");

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`, {
        method: "POST",
        body: data
      });
      
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
          showToast("Tải bản vẽ lên thành công!", "success");
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
    if (window.confirm("Xóa bản vẽ này khỏi hệ thống?")) {
      const res = await deleteRowFromSheet("BanVe", id, APP_ID);
      if (res.success) {
        setDrawings(drawings.filter(d => d.id !== id && d._RowNumber !== id));
      }
    }
  };

  const currentList = drawings.filter(d => d.category === activeCategory);

  return (
    <div className="drawings-container">
      <h2 className="page-title"><FiMap /> Hồ sơ & Bản vẽ Thiết kế</h2>
      
      <div className="category-tabs">
        {DRAWING_CATEGORIES.map(cat => (
          <button 
            key={cat.id} 
            className={`tab-btn ${activeCategory === cat.id ? 'active' : ''}`} 
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="upload-box">
        <label className={`upload-btn ${uploading ? 'disabled' : ''}`}>
          {uploading ? <FiLoader className="spin" /> : <FiUpload />}
          <span>{uploading ? "Đang xử lý PDF..." : `Tải lên bản vẽ mới`}</span>
          <input type="file" accept="application/pdf" onChange={handleFileUpload} disabled={uploading} hidden />
        </label>
      </div>

      {loading ? (
        <div className="loading-text">Đang tải hồ sơ thiết kế...</div>
      ) : (
      <div className="drawings-grid">
        {currentList.length === 0 && <div className="no-data-text">Danh mục này hiện chưa có bản vẽ.</div>}
        {currentList.map(drawing => (
          <div key={drawing.id || drawing._RowNumber} className="drawing-card">
            <div className="drawing-icon"><FiFileText size={32} color="#3b82f6" /></div>
            <div className="drawing-info">
              <div className="drawing-name">{drawing.name}</div>
              <div className="drawing-meta">{drawing.date} • {drawing.size}</div>
            </div>
            <div className="drawing-actions">
              {/* SỬ DỤNG HÀM MỞ LINK SẠCH CHO CẢ XEM VÀ TẢI */}
              <button className="icon-btn view" onClick={() => openUrlClean(drawing.url)} title="Xem bản vẽ">
                <FiEye />
              </button>
              <button className="icon-btn download" onClick={() => openUrlClean(drawing.url)} title="Lưu về máy">
                <FiDownload />
              </button>
              <button className="icon-btn delete" onClick={() => handleDelete(drawing.id || drawing._RowNumber)} title="Xóa">
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

export default DesignDrawings;
