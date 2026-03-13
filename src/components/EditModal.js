import React, { useState, useEffect } from "react";
import { FiX, FiSave, FiCamera, FiImage, FiUploadCloud, FiLoader } from "react-icons/fi";
import "./EditModal.css";

// Danh sách hạng mục ngân sách, đồng bộ với Sheet 'NganSach'
const BUDGET_CATEGORIES = [
  'Phần thô', 
  'Nhân công', 
  'Hoàn thiện', 
  'Điện nước', 
  'Nội thất', 
  'Phát sinh'
];

const UPDATER_OPTIONS = ["Ba", "Mẹ"];

// Cấu hình Cloudinary (Lấy từ biến môi trường)
const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

function EditModal({ item, onClose, onSave }) {
  const [formData, setFormData] = useState({
    ngay: "",
    nguoiCapNhat: "",
    noiDung: "",
    doiTuongThuChi: "",
    soTien: "",
    hinhAnh: "", // Thêm trường hình ảnh
    ghiChu: "",
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        ngay: item.ngay instanceof Date 
          ? item.ngay.toISOString().split('T')[0] 
          : new Date(item.ngay).toISOString().split('T')[0],
        nguoiCapNhat: item.nguoiCapNhat || UPDATER_OPTIONS[0],
        noiDung: item.noiDung || "",
        doiTuongThuChi: item.doiTuongThuChi || BUDGET_CATEGORIES[0],
        // Format số tiền khi load dữ liệu (VD: 1000000 => 1.000.000)
        soTien: item.soTien ? new Intl.NumberFormat('vi-VN').format(item.soTien) : "",
        hinhAnh: item.hinhAnh || "",
        ghiChu: item.ghiChu || "",
      });
    }
  }, [item]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "soTien") {
      // Xóa tất cả ký tự không phải số
      const rawValue = value.replace(/\D/g, "");
      // Thêm dấu chấm phân cách hàng nghìn
      const formattedValue = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      setFormData((prev) => ({ ...prev, [name]: formattedValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Xử lý upload ảnh lên Cloudinary
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      alert("Vui lòng cấu hình Cloudinary trong file .env trước!");
      return;
    }

    setUploading(true);
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", UPLOAD_PRESET);

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: data }
      );
      const fileData = await res.json();
      
      if (fileData.secure_url) {
        setFormData((prev) => ({ ...prev, hinhAnh: fileData.secure_url }));
      } else {
        alert("Lỗi upload ảnh: " + (fileData.error?.message || "Không rõ lỗi"));
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Lỗi kết nối khi upload ảnh");
    } finally {
      setUploading(false);
    }
  };

  // Giả lập tính năng OCR (Cần tích hợp thư viện Tesseract.js sau này)
  const handleOCR = () => {
    alert("Tính năng OCR (Quét hóa đơn) đang được phát triển. Vui lòng nhập tay hoặc upload ảnh.");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Xóa dấu chấm để lấy giá trị số thực (VD: 1.000.000 => 1000000)
    const rawSoTien = formData.soTien ? formData.soTien.toString().replace(/\./g, "") : "0";

    const finalData = {
      ...item,
      ...formData,
      ngay: new Date(formData.ngay),
      soTien: parseFloat(rawSoTien) || 0,
    };

    onSave(finalData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{item && item.id ? "Chỉnh sửa giao dịch" : "Thêm mới giao dịch"}</h2>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>
        
        {/* Khu vực Upload & Preview Ảnh */}
        <div className="image-upload-section">
          <div className="image-preview">
            {formData.hinhAnh ? (
              <div className="preview-container">
                <img src={formData.hinhAnh} alt="Chứng từ" />
                <button 
                  type="button" 
                  className="remove-image-btn"
                  onClick={() => setFormData(prev => ({...prev, hinhAnh: ""}))}
                >
                  <FiX />
                </button>
              </div>
            ) : (
              <div className="upload-placeholder" onClick={() => document.getElementById('file-upload').click()}>
                {uploading ? <FiLoader className="spin" /> : <FiCamera size={32} />}
                <span>{uploading ? "Đang tải lên..." : "Chụp hoặc chọn ảnh hóa đơn"}</span>
              </div>
            )}
          </div>
          <input 
            id="file-upload" 
            type="file" 
            accept="image/*" 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
        </div>

        <form onSubmit={handleSubmit} className="edit-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Ngày</label>
              <input
                type="date"
                name="ngay"
                value={formData.ngay}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Người cập nhật</label>
              <select
                name="nguoiCapNhat"
                value={formData.nguoiCapNhat}
                onChange={handleChange}
                required
              >
                {UPDATER_OPTIONS.map((updater) => (
                  <option key={updater} value={updater}>
                    {updater}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Hạng mục (Ngân sách)</label>
              <select
                name="doiTuongThuChi"
                value={formData.doiTuongThuChi}
                onChange={handleChange}
                required
              >
                <option value="">Chọn hạng mục</option>
                {BUDGET_CATEGORIES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group full-width">
              <label>Nội dung chi tiết (Vật tư/Nhân công)</label>
              <input
                type="text"
                name="noiDung"
                value={formData.noiDung}
                onChange={handleChange}
                required
                placeholder='VD: Xi măng, Cát, Công thợ...'
              />
            </div>
            <div className="form-group">
              <label>Số tiền</label>
              <input
                type="text"
                inputMode="numeric"
                name="soTien"
                value={formData.soTien}
                onChange={handleChange}
                required
                placeholder="0"
              />
            </div>
            <div className="form-group full-width">
              <label>Ghi chú</label>
              <textarea
                name="ghiChu"
                value={formData.ghiChu}
                onChange={handleChange}
                rows="3"
              />
            </div>
            {/* Hidden Input cho Link Ảnh */}
            <input type="hidden" name="hinhAnh" value={formData.hinhAnh} />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-ocr" onClick={handleOCR}>
              <FiImage /> Quét OCR
            </button>
            <div className="spacer"></div>
            <button type="button" className="btn-cancel" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn-save" disabled={uploading}>
              <FiSave /> Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditModal;
