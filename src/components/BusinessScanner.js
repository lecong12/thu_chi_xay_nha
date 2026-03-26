import React, { useState, useRef } from 'react';
import { FiCamera, FiLoader, FiSave, FiX, FiImage, FiSearch, FiFileText } from 'react-icons/fi';
import Tesseract from 'tesseract.js';
import { addRowToSheet } from '../utils/sheetsAPI';
import './BusinessScanner.css';

// Cấu hình lấy từ môi trường
const CLOUD_NAME = (process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "").replace(/['"]/g, '');
const UPLOAD_PRESET = (process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "").replace(/['"]/g, '');
const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;

function BusinessScanner({ showToast }) {
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [scannedData, setScannedData] = useState({
    ngay: new Date().toISOString().split('T')[0],
    noiDung: "",
    soTien: "",
    doiTuongThuChi: "Khác",
    hinhAnh: ""
  });

  // Helper: Làm sạch link Cloudinary từ chuỗi rác
  const getCleanUrl = (rawUrl) => {
    if (!rawUrl) return "";
    const match = String(rawUrl).match(/(https:\/\/res\.cloudinary\.com\/[^\s"'}]+)/);
    return match ? match[0].replace(/%22/g, '').replace(/["'}]/g, '') : rawUrl;
  };

  // Xử lý chọn file và upload
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const isPdf = file.type === "application/pdf";
      const resourceType = isPdf ? "raw" : "image";
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
        method: "POST",
        body: formData
      });

      const fileData = await res.json();
      if (fileData.secure_url) {
        const cleanUrl = getCleanUrl(fileData.secure_url);
        setImage(cleanUrl);
        setScannedData(prev => ({ ...prev, hinhAnh: cleanUrl }));
        showToast("Tải ảnh chứng từ thành công!", "success");
        
        // Nếu là ảnh thì tự động kích hoạt OCR
        if (!isPdf) handleOCR(cleanUrl);
      }
    } catch (error) {
      showToast("Lỗi upload: " + error.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // Xử lý quét văn bản (OCR)
  const handleOCR = async (url) => {
    if (!url) return;
    setScanning(true);
    showToast("Đang phân tích hình ảnh...", "info");
    
    try {
      const { data: { text } } = await Tesseract.recognize(url, 'vie');
      const extracted = { ...scannedData };

      // 1. Tìm số tiền (Số lớn nhất thường là tổng tiền)
      const numbers = text.match(/\d{1,3}(?:[.,]\d{3})*(?:,\d+)?/g);
      if (numbers) {
        const amounts = numbers.map(n => parseFloat(n.replace(/[.,]/g, ''))).filter(n => n > 1000 && n < 100000000);
        if (amounts.length > 0) extracted.soTien = Math.max(...amounts).toString();
      }

      // 2. Tìm ngày tháng
      const dateMatch = text.match(/(\d{1,2})[\s\/\-\.]+(\d{1,2})[\s\/\-\.]+(\d{4})/);
      if (dateMatch) {
        extracted.ngay = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
      }

      // 3. Gợi ý nội dung (Dòng đầu tiên có độ dài vừa phải)
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 10);
      if (lines.length > 0) extracted.noiDung = lines[0];

      setScannedData(extracted);
      showToast("Đã nhận diện thông tin hóa đơn!", "success");
    } catch (error) {
      console.error("OCR Error:", error);
      showToast("Không thể tự động đọc văn bản.", "warning");
    } finally {
      setScanning(false);
    }
  };

  // Lưu vào AppSheet
  const handleSave = async () => {
    if (!scannedData.soTien || !scannedData.noiDung) {
      showToast("Vui lòng nhập đủ Số tiền và Nội dung.", "warning");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        "id": `GD_${Date.now()}`,
        "Ngày": scannedData.ngay,
        "Hạng mục": scannedData.doiTuongThuChi,
        "Nội dung": scannedData.noiDung,
        "Số tiền": scannedData.soTien,
        "Chứng từ": scannedData.hinhAnh
      };

      const res = await addRowToSheet("GiaoDich", payload, APP_ID);
      if (res.success) {
        showToast("Đã thêm giao dịch mới!", "success");
        // Reset form
        setImage(null);
        setScannedData({ 
          ngay: new Date().toISOString().split('T')[0], 
          noiDung: "", soTien: "", doiTuongThuChi: "Khác", hinhAnh: "" 
        });
      }
    } catch (error) {
      showToast("Lỗi lưu AppSheet: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="scanner-container">
      <div className="scanner-card">
        <div className="scanner-header">
          <h3><FiCamera /> Quét Card & Hóa đơn</h3>
          <p>Tải ảnh lên để tự động nhập liệu chi tiêu</p>
        </div>

        <div className="scanner-body">
          {/* Khu vực xem trước / Upload */}
          <div className="scan-preview-zone" onClick={() => !uploading && fileInputRef.current.click()}>
            {uploading ? (
              <div className="scan-overlay"><FiLoader className="spin" /> <span>Đang tải lên...</span></div>
            ) : image ? (
              <img src={image} alt="Preview" className="img-preview" />
            ) : (
              <div className="scan-placeholder">
                <FiImage size={40} />
                <span>Chạm để chụp hoặc chọn ảnh</span>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} hidden accept="image/*,application/pdf" />
          </div>

          {/* Form kết quả quét */}
          <div className="scan-result-form">
            <div className="scan-input-group">
              <label>Ngày giao dịch</label>
              <input type="date" value={scannedData.ngay} onChange={e => setScannedData({...scannedData, ngay: e.target.value})} />
            </div>
            
            <div className="scan-input-group">
              <label>Số tiền (VNĐ)</label>
              <div className="input-icon-wrapper">
                <input type="number" value={scannedData.soTien} placeholder="Nhập số tiền..." onChange={e => setScannedData({...scannedData, soTien: e.target.value})} />
                {scanning && <FiLoader className="spin icon-inside" />}
              </div>
            </div>

            <div className="scan-input-group">
              <label>Nội dung chi tiết</label>
              <textarea rows="2" value={scannedData.noiDung} placeholder="Ví dụ: Mua 10 bao xi măng..." onChange={e => setScannedData({...scannedData, noiDung: e.target.value})} />
            </div>

            <div className="scan-actions">
              <button className="btn-secondary" onClick={() => handleOCR(image)} disabled={!image || scanning}>
                <FiSearch /> {scanning ? "Đang quét..." : "Quét lại ảnh"}
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving || !image}>
                {saving ? <FiLoader className="spin" /> : <FiSave />} Lưu vào Sổ thu chi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusinessScanner;
