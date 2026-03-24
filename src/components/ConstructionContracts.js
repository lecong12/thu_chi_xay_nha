import React, { useState, useEffect } from 'react';
import { FiUpload, FiTrash2, FiFileText, FiDownload, FiLoader, FiBriefcase } from 'react-icons/fi';
import './ConstructionContracts.css';

// Cấu hình Cloudinary
const CLOUD_NAME = (process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "").replace(/['"]/g, '');
const UPLOAD_PRESET = (process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "").replace(/['"]/g, '');

const CATEGORIES = [
  { id: 'tho', label: 'Hợp đồng Xây lắp thô' },
  { id: 'hoanthien', label: 'Hợp đồng Thi công hoàn thiện' },
  { id: 'noithat', label: 'Hợp đồng Thi công nội thất' }
];

function ConstructionContracts() {
  const [activeCategory, setActiveCategory] = useState('tho');
  const [contracts, setContracts] = useState({});
  const [uploading, setUploading] = useState(false);

  // Tải dữ liệu từ LocalStorage khi khởi động
  useEffect(() => {
    const saved = localStorage.getItem("constructionContracts");
    if (saved) {
      try {
        setContracts(JSON.parse(saved));
      } catch (e) {
        console.error("Lỗi đọc dữ liệu hợp đồng:", e);
      }
    }
  }, []);

  const saveContracts = (newContracts) => {
    setContracts(newContracts);
    localStorage.setItem("constructionContracts", JSON.stringify(newContracts));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Vui lòng chỉ chọn file PDF.");
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
      // Dùng 'auto' để Cloudinary tự nhận diện PDF
      data.append("resource_type", "auto"); 

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
        method: "POST",
        body: data
      });
      
      const fileData = await res.json();
      if (fileData.secure_url) {
        const newContract = {
          id: Date.now(),
          name: file.name,
          url: fileData.secure_url,
          date: new Date().toLocaleDateString('vi-VN'),
          size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
        };

        const currentList = contracts[activeCategory] || [];
        const updatedContracts = {
          ...contracts,
          [activeCategory]: [newContract, ...currentList]
        };
        saveContracts(updatedContracts);
      } else {
        throw new Error(fileData.error?.message || "Lỗi không xác định từ Cloudinary");
      }
    } catch (error) {
      console.error(error);
      alert("Lỗi upload: " + error.message);
    } finally {
      setUploading(false);
      e.target.value = null; // Reset input
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Bạn có chắc muốn xóa hợp đồng này?")) {
      const currentList = contracts[activeCategory] || [];
      const updatedList = currentList.filter(c => c.id !== id);
      saveContracts({ ...contracts, [activeCategory]: updatedList });
    }
  };

  const currentList = contracts[activeCategory] || [];

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
            <span>{uploading ? "Đang tải lên..." : "Tải lên Hợp đồng (PDF)"}</span>
            <input type="file" accept="application/pdf" onChange={handleFileUpload} disabled={uploading} hidden />
          </label>
        </div>

        <div className="contracts-list">
          {currentList.length === 0 && <div className="no-contracts">Chưa có hợp đồng nào trong mục này.</div>}
          {currentList.map(contract => (
            <div key={contract.id} className="contract-item">
              <div className="contract-icon">
                <FiFileText size={24} />
              </div>
              <div className="contract-info">
                <a href={contract.url} target="_blank" rel="noreferrer" className="contract-name">{contract.name}</a>
                <span className="contract-meta">{contract.date} &bull; {contract.size}</span>
              </div>
              <div className="contract-actions">
                <a href={contract.url} target="_blank" rel="noreferrer" className="action-icon download" title="Tải về">
                  <FiDownload />
                </a>
                <button className="action-icon delete" onClick={() => handleDelete(contract.id)} title="Xóa">
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ConstructionContracts;