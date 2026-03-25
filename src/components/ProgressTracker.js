import React, { useState } from 'react';

const ProgressTracker = ({ stages = [], onUpdateStatus, onUploadImage, isUpdating }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [activeStageId, setActiveStageId] = useState(null);

  const handleFileSelect = (e, stageId) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setActiveStageId(stageId);
    }
  };

  const handleConfirmUpload = async (stageId) => {
    if (selectedFile) {
      await onUploadImage(stageId, selectedFile);
      // Reset sau khi upload thành công
      setSelectedFile(null);
      setPreviewUrl(null);
      setActiveStageId(null);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setActiveStageId(null);
  };

  return (
    <div className="stages-grid">
      {stages.map((stage) => (
        <div key={stage.id} className="stage-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stage-name-text">🏗️ {stage.name}</span>
            {stage.isDone && <span style={{ color: '#22c55e' }}>✅</span>}
          </div>
          
          <div className="stage-date-text">
            📅 {stage.date || 'Chưa cập nhật ngày'}
          </div>

          <select 
            className="status-select-box"
            value={stage.status || 'pending'}
            onChange={(e) => onUpdateStatus(stage.id, e.target.value)}
            disabled={isUpdating}
          >
            <option value="pending">Chờ thực hiện</option>
            <option value="in_progress">Đang thi công</option>
            <option value="completed">Đã hoàn thành</option>
          </select>

          <div className="image-upload-zone">
            {/* Chế độ xem trước khi chọn ảnh mới */}
            {activeStageId === stage.id && previewUrl ? (
              <>
                <img src={previewUrl} alt="Preview" className="img-preview" />
                <div className="upload-actions">
                  <button 
                    className="btn-confirm" 
                    onClick={() => handleConfirmUpload(stage.id)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? '...' : 'Xác nhận'}
                  </button>
                  <button className="btn-cancel" onClick={handleCancel}>Hủy</button>
                </div>
              </>
            ) : (
              /* Chế độ hiển thị ảnh đã có hoặc placeholder */
              <>
                {stage.imageUrl ? (
                  <>
                    <img src={stage.imageUrl} alt={stage.name} className="img-done" />
                    <label className="edit-image-label">
                      Thay ảnh
                      <input 
                        type="file" 
                        hidden 
                        accept="image/*"
                        onChange={(e) => handleFileSelect(e, stage.id)} 
                      />
                    </label>
                  </>
                ) : (
                  <label className="upload-placeholder-box">
                    <span style={{ fontSize: '24px' }}>📷</span>
                    <span>Thêm ảnh thực tế</span>
                    <input 
                      type="file" 
                      hidden 
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, stage.id)} 
                    />
                  </label>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProgressTracker;
