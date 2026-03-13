import React, { useState, useEffect } from "react";
import { FiX, FiSave } from "react-icons/fi";
import "./EditModal.css";

const CONSTRUCTION_STAGES = [
  "1. Chuẩn bị (GPXD, Thiết kế)",
  "2. Phần Móng & Ngầm",
  "3. Phần Thân (Thô)",
  "4. Điện - Nước (ME)",
  "5. Trát, Ốp lát",
  "6. Sơn bả & Thạch cao",
  "7. Hoàn thiện & Nội thất",
  "8. Sân vườn & Cổng",
  "9. Chi phí khác"
];

const UPDATER_OPTIONS = ["Ba", "Mẹ"];

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
        nguoiCapNhat: item.nguoiCapNhat || UPDATER_OPTIONS[0],
        loaiThuChi: item.loaiThuChi || "Chi",
        noiDung: item.noiDung || "",
        doiTuongThuChi: item.doiTuongThuChi || CONSTRUCTION_STAGES[0],
        // Format số tiền khi load dữ liệu (VD: 1000000 => 1.000.000)
        soTien: item.soTien ? new Intl.NumberFormat('vi-VN').format(item.soTien) : "",
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

    // Nếu là khoản Thu, không áp dụng Giai đoạn thi công
    if (finalData.loaiThuChi === 'Thu') {
      finalData.doiTuongThuChi = '';
    }
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
              <label>Loại</label>
              <select
                name="loaiThuChi"
                value={formData.loaiThuChi}
                onChange={handleChange}
                required
              >
                <option value="Chi">Chi (Chi phí)</option>
                <option value="Thu">Thu (Nguồn tiền)</option>
              </select>
            </div>
            {formData.loaiThuChi === 'Chi' && (
              <div className="form-group">
                <label>Giai đoạn thi công</label>
                <select
                  name="doiTuongThuChi"
                  value={formData.doiTuongThuChi}
                  onChange={handleChange}
                  required
                >
                  <option value="">Chọn giai đoạn</option>
                  {CONSTRUCTION_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group full-width">
              <label>{formData.loaiThuChi === 'Thu' ? 'Nguồn tiền' : 'Hạng mục chi tiết (Vật tư/Nhân công)'}</label>
              <input
                type="text"
                name="noiDung"
                value={formData.noiDung}
                onChange={handleChange}
                required
                placeholder={
                  formData.loaiThuChi === 'Thu' ? 'VD: Vốn tự có, Vay ngân hàng...' : 'VD: Xi măng, Cát, Công thợ...'
                }
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
