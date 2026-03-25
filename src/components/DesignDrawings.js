import React, { useState, useEffect } from 'react';
import { FiUpload, FiTrash2, FiEye, FiDownload, FiLoader, FiMap, FiX, FiFileText } from 'react-icons/fi';
import { fetchTableData, addRowToSheet, deleteRowFromSheet } from '../utils/sheetsAPI';
import './DesignDrawings.css';

// Lấy cấu hình từ biến môi trường
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
  const [viewingPdf, setViewingPdf] = useState(null);
  const [loading, setLoading] = useState(true);
  const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;

  useEffect(() => {
    const loadDrawings = async () => {
      setLoading(true);
      try {
        const res = await fetchTableData("BanVe", APP_ID);
        if (res.success) {
          setDrawings(res.data || []);
        }
      } catch (error) {
        console.error("Lỗi tải bản vẽ:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDrawings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      showToast("Vui lòng chỉ chọn file bản vẽ định dạng PDF.", "warning");
      return;
    }

    try {
      setUploading(true);
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", UPLOAD_PRESET);
      data.append("resource_type", "raw"); // Đảm bảo PDF vào kho raw

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`, {
        method: "POST",
        body: data
      });
      
      const fileData = await res.json();
      
      if (fileData.secure_url) {
        const rowData = {
            id: `BV_${Date.now()}`, // Key của dòng
            name: file.name,
            url: fileData.secure_url, // Cột 'url' theo yêu cầu
            data: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            category: activeCategory // Cột 'category' theo yêu cầu
        };
        
        const sheetRes = await addRowToSheet("BanVe", rowData, APP_ID);       
        if (sheetRes.success) {
          setDrawings(prev => [rowData, ...prev]);       
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
    if (window.confirm("Bạn có chắc chắn muốn xóa bản vẽ này?")) {
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
          <span>{uploading ? "Đang xử lý..." : `Tải lên cho ${DRAWING_CATEGORIES.find(c => c.id === activeCategory)?.label}`}</span>
          <input type="file" accept="application/pdf" onChange={handleFileUpload} disabled={uploading} hidden />
        </label>
      </div>

      {loading ? (
        <div className="loading-text">Đang đồng bộ dữ liệu bản vẽ...</div>
      ) : (
      <div className="drawings-grid">
        {currentList.length === 0 && <div className="no-data-text">Chưa có bản vẽ nào trong mục này.</div>}
        {currentList.map(drawing => (
          <div key={drawing.id || drawing._RowNumber} className="drawing-card">
            <div className="drawing-icon"><FiMap size={32} /></div>
            <div className="drawing-info">
              <div className="drawing-name" title={drawing.name}>{drawing.name}</div>
              <div className="drawing-meta">{drawing.data} • {drawing.size}
            <div className="drawing-actions">
              <button className="icon-btn view" onClick={() => setViewingPdf(drawing)} title="Xem ngay"><FiEye /></button>
              <a href={drawing.url} target="_blank" rel="noreferrer" className="icon-btn download" title="Tải về"><FiDownload /></a>
              <button className="icon-btn delete" onClick={() => handleDelete(drawing.id || drawing._RowNumber)} title="Xóa"><FiTrash2 /></button>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Modal Trình xem PDF */}
      {viewingPdf && (
        <div className="pdf-viewer-overlay" onClick={() => setViewingPdf(null)}>
          <div className="pdf-viewer-container" onClick={e => e.stopPropagation()}>
            <div className="pdf-header">
              <h3>{viewingPdf.name}</h3>
              <button className="close-pdf-btn" onClick={() => setViewingPdf(null)}><FiX size={24} /></button>
            </div>
            <div className="pdf-body">
              <object 
                data={viewingPdf.url} 
                type="application/pdf" 
                width="100%" 
                height="100%"
              >
                <div className="pdf-fallback-content">
                  <FiFileText size={48} color="#cbd5e1" />
                  <p>Không thể hiển thị bản vẽ trực tiếp.</p>
                  <a 
                    href={viewingPdf.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn-open-fallback"
                  >
                    Mở bản vẽ trong tab mới <FiDownload />
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

export default DesignDrawings;
