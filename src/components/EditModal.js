import React, { useState, useEffect } from "react";
import { FiX, FiSave } from "react-icons/fi";
import "./EditModal.css";

function EditModal({ item, onClose, onSave }) {
  const [formData, setFormData] = useState({
    ngay: "",
    nguoiCapNhat: "",
    loaiThuChi: "",
    noiDung: "",
    doiTuongThuChi: "",
    soTien: "",
    ghiChu: "",
  });

  useEffect(() => {
    if (item) {
      setFormData({
        ngay: item.ngay instanceof Date 
          ? item.ngay.toISOString().split('T')[0] 
          : new Date(item.ngay).toISOString().split('T')[0],
        nguoiCapNhat: item.nguoiCapNhat || "",
        loaiThuChi: item.loaiThuChi || "",
        noiDung: item.noiDung || "",
        doiTuongThuChi: item.doiTuongThuChi || "",
        soTien: item.soTien || "",
        ghiChu: item.ghiChu || "",
      });
    }
  }, [item]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...item,
      ...formData,
      ngay: new Date(formData.ngay),
      soTien: parseFloat(formData.soTien),
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Chỉnh sửa giao dịch</h2>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
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
              <input
                type="text"
                name="nguoiCapNhat"
                value={formData.nguoiCapNhat}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Loại</label>
              <select
                name="loaiThuChi"
                value={formData.loaiThuChi}
                onChange={handleChange}
                required
              >
                <option value="">Chọn loại</option>
                <option value="Thu">Thu</option>
                <option value="Chi">Chi</option>
              </select>
            </div>
            <div className="form-group">
              <label>Đối tượng</label>
              <input
                type="text"
                name="doiTuongThuChi"
                value={formData.doiTuongThuChi}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group full-width">
              <label>Nội dung</label>
              <input
                type="text"
                name="noiDung"
                value={formData.noiDung}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Số tiền</label>
              <input
                type="number"
                name="soTien"
                value={formData.soTien}
                onChange={handleChange}
                required
                min="0"
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
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn-save">
              <FiSave /> Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditModal;
