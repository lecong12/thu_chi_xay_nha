.stages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  padding: 10px 0;
}

.stage-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stage-name-text { font-weight: 700; color: var(--text-main); margin-left: 8px; }
.stage-date-text { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

.status-select-box {
  width: 100%;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-app);
  color: var(--text-main);
  font-weight: 600;
}

.image-upload-zone { height: 160px; position: relative; }
.img-preview, .img-done { width: 100%; height: 160px; object-fit: cover; border-radius: 8px; }

.upload-actions {
  position: absolute; bottom: 8px; right: 8px; display: flex; gap: 6px;
}

.btn-confirm { background: #22c55e; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; display: flex; alignItems: center; gap: 4px; }
.btn-cancel { background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }

.upload-placeholder-box {
  height: 100%; border: 2px dashed var(--border-color); border-radius: 8px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  cursor: pointer; color: var(--text-muted); gap: 8px;
}

.edit-image-label {
  position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.6);
  color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; cursor: pointer;
}

.spin { animation: rotation 1s infinite linear; }
@keyframes rotation { from { transform: rotate(0deg); } to { transform: rotate(359deg); } }
