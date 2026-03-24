import React, { useState, useEffect } from 'react';
import { FiUpload, FiTrash2, FiEye, FiDownload, FiLoader, FiMap, FiX } from 'react-icons/fi';
import './DesignDrawings.css';

// Cấu hình Cloudinary
const CLOUD_NAME = (process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "").replace(/['"]/g, '');
const UPLOAD_PRESET = (process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "").replace(/['"]/g, '');

const DRAWING_CATEGORIES = [
  { id: 'kientruc', label: 'Bản vẽ Kiến trúc' },
  { id: 'ketcau', label: 'Bản vẽ Kết cấu' },
  { id: 'diennuoc', label: 'Bản vẽ Điện nước (ME)' },
  { id: 'noithat', label: 'Bản vẽ Nội thất' }
];

function DesignDrawings() {
  const [activeCategory, setActiveCategory] = useState('kientruc');
  const [drawings, setDrawings] = useState({});
  const [uploading, setUploading] = useState(false);
  const [viewingPdf, setViewingPdf] = useState(null); // State để lưu file đang xem

  // Tải dữ liệu từ LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem("designDrawings");
    if (saved) {
      try {
        setDrawings(JSON.parse(saved));
      } catch (e) {
        console.error("Lỗi đọc dữ liệu bản vẽ:", e);
      }
    }
  }, []);

  const saveDrawings = (newDrawings) => {
    setDrawings(newDrawings);
    localStorage.setItem("designDrawings", JSON.stringify(newDrawings));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Vui lòng chỉ chọn file bản vẽ định dạng PDF.");
      return;
    }

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      alert("Thiếu cấu hình Cloudinary.");
      return;
    }

    try {
      setUploading(true);
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", UPLOAD_PRESET);
      data.append("folder", "File PDF"); // Ép buộc lưu vào thư mục File PDF
      data.append("resource_type", "raw"); // Ép buộc loại raw cho PDF

      // Thêm Timeout để tránh treo (Sửa lỗi: Khai báo controller trước khi dùng)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 giây

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`, {
        method: "POST",
        body: data,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const fileData = await res.json();
      if (fileData.secure_url) {
        const newDrawing = {
          id: Date.now(),
          name: file.name,
          url: fileData.secure_url,
          date: new Date().toLocaleDateString('vi-VN'),
          size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
        };

        const currentList = drawings[activeCategory] || [];
        const updatedDrawings = {
          ...drawings,
          [activeCategory]: [newDrawing, ...currentList]
        };
        saveDrawings(updatedDrawings);
      } else {
        throw new Error(fileData.error?.message || "Lỗi upload");
      }
    } catch (error) {
      let msg = "Lỗi upload: " + error.message;
      if (error.name === 'AbortError') {
        msg = "Upload thất bại: Quá thời gian chờ (Timeout). Vui lòng kiểm tra mạng và thử lại.";
      }
      alert(msg);
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Xóa bản vẽ này?")) {
      const currentList = drawings[activeCategory] || [];
      const updatedList = currentList.filter(d => d.id !== id);
      saveDrawings({ ...drawings, [activeCategory]: updatedList });
    }
  };

  const currentList = drawings[activeCategory] || [];

  return (
    <div className="drawings-container">
      <h2 className="page-title"><FiMap /> Hồ sơ & Bản vẽ Thiết kế</h2>
      
      <div className="category-tabs">
        {DRAWING_CATEGORIES.map(cat => (
          <button key={cat.id} className={`tab-btn ${activeCategory === cat.id ? 'active' : ''}`} onClick={() => setActiveCategory(cat.id)}>{cat.label}</button>
        ))}
      </div>

      <div className="upload-box">
        <label className={`upload-btn ${uploading ? 'disabled' : ''}`}>
          {uploading ? <FiLoader className="spin" /> : <FiUpload />}
          <span>{uploading ? "Đang tải lên..." : "Tải lên Bản vẽ (PDF)"}</span>
          <input type="file" accept="application/pdf" onChange={handleFileUpload} disabled={uploading} hidden />
        </label>
      </div>

      <div className="drawings-grid">
        {currentList.length === 0 && <div className="no-data-text">Chưa có bản vẽ nào trong mục này.</div>}
        {currentList.map(drawing => (
          <div key={drawing.id} className="drawing-card">
            <div className="drawing-icon"><FiMap size={32} /></div>
            <div className="drawing-info">
              <div className="drawing-name" title={drawing.name}>{drawing.name}</div>
              <div className="drawing-meta">{drawing.date} • {drawing.size}</div>
            </div>
            <div className="drawing-actions">
              <button className="icon-btn view" onClick={() => setViewingPdf(drawing)} title="Xem ngay"><FiEye /></button>
              <a href={drawing.url} target="_blank" rel="noreferrer" className="icon-btn download" title="Tải về"><FiDownload /></a>
              <button className="icon-btn delete" onClick={() => handleDelete(drawing.id)} title="Xóa"><FiTrash2 /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Trình đọc PDF (Modal) */}
      {viewingPdf && (
        <div className="pdf-viewer-overlay" onClick={() => setViewingPdf(null)}>
          <div className="pdf-viewer-container" onClick={e => e.stopPropagation()}>
            <div className="pdf-header">
              <h3>{viewingPdf.name}</h3>
              <button className="close-pdf-btn" onClick={() => setViewingPdf(null)}><FiX size={24} /></button>
            </div>
            <div className="pdf-body">
              <object data={viewingPdf.url} type="application/pdf" width="100%" height="100%">
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#4b5563', backgroundColor: '#f9fafb' }}>
                  <p style={{ marginBottom: '1rem' }}>Trình duyệt không hỗ trợ xem PDF trực tiếp.</p>
                  <a 
                    href={viewingPdf.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: '500' }}
                  >
                    <FiDownload /> Tải về hoặc mở trong tab mới
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