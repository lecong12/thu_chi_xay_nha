import React, { useState } from 'react';
import { Camera, Check, X, Loader2 } from 'lucide-react';

const ProgressTracker = ({ stages = [], onUpdateStatus, onUploadImage }) => {
  const [uploadingStage, setUploadingStage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const handleFileChange = (e, stageId) => {
    const file = e.target.files[0];
    if (file) {
      setUploadingStage(stageId);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const cancelUpload = () => {
    setUploadingStage(null);
    setPreviewImage(null);
  };

  return (
    <div className="stages-grid">
      {stages.map((stage) => (
        <div key={stage.id} className="stage-card">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="stage-name-text">{stage.name}</span>
          </div>
          
          <div className="stage-date-text">
            Dự kiến: {stage.startDate || 'Chưa xác định'}
          </div>

          <select 
            className="status-select-box"
            value={stage.status}
            onChange={(e) => onUpdateStatus(stage.id, e.target.value)}
          >
            <option value="pending">Chờ thực hiện</option>
            <option value="in_progress">Đang thi công</option>
            <option value="completed">Đã hoàn thành</option>
          </select>

          <div className="image-upload-zone">
            {uploadingStage === stage.id && previewImage ? (
              <>
                <img src={previewImage} alt="Preview" className="img-preview" />
                <div className="upload-actions">
                  <button className="btn-confirm" onClick={() => onUploadImage(stage.id, previewImage)}>
                    <Check size={16} /> Xác nhận
                  </button>
                  <button className="btn-cancel" onClick={cancelUpload}>
                    <X size={16} /> Hủy
                  </button>
                </div>
              </>
            ) : stage.imageUrl ? (
              <>
                <img src={stage.imageUrl} alt={stage.name} className="img-done" />
                <label className="edit-image-label">
                  Sửa ảnh
                  <input 
                    type="file" 
                    hidden 
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, stage.id)} 
                  />
                </label>
              </>
            ) : (
              <label className="upload-placeholder-box">
                <Camera size={24} />
                <span>Tải ảnh thực tế</span>
                <input 
                  type="file" 
                  hidden 
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, stage.id)} 
                />
              </label>
            )}
            
            {stage.isUploading && (
              <div className="upload-placeholder-box" style={{ position: 'absolute', top: 0, background: 'rgba(255,255,255,0.7)' }}>
                <Loader2 className="spin" size={24} />
                <span>Đang tải lên...</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProgressTracker;
