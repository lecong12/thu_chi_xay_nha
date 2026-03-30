import React, { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';

function App() {
  const CLOUD_NAME = "doqmshx5y";
  const UPLOAD_PRESET = "ml_default";
  const LOG_ID = "nhat_ky_du_lieu"; 

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [viewUrl, setViewUrl] = useState(null);

  // 1. Tải danh sách đồng bộ từ Cloudinary
  const loadData = async () => {
    try {
      const timestamp = new Date().getTime();
      const r = await fetch(`https://res.cloudinary.com/${CLOUD_NAME}/raw/upload/${LOG_ID}.txt?v=${timestamp}`);
      
      if (r.ok) {
        const text = await r.text();
        const lines = text.split('\n').filter(l => l.trim().length > 10);
        const data = lines.map(line => {
          try { return JSON.parse(line); } catch(e) { return null; }
        }).filter(item => item !== null);
        
        setHistory(data.reverse()); 
      }
    } catch (e) {
      console.log("Đang chờ dữ liệu...");
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000); // Tự động làm mới mỗi 20 giây
    return () => clearInterval(interval);
  }, []);

  const handleFileSelect = async (file) => {
    if (!file) return;
    setLoading(true);
    setMsg("Đang xử lý tệp...");

    try {
      let cleanName = "Tai_lieu_" + Math.floor(Date.now() / 1000);

      // Nếu là ảnh thì mới chạy OCR để lấy tên
      if (file.type.startsWith('image/')) {
        setMsg("Đang đọc nội dung ảnh...");
        const { data: { text } } = await Tesseract.recognize(file, 'vie');
        const firstLine = text.split('\n').find(l => l.trim().length > 2);
        if (firstLine) {
          cleanName = firstLine.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]/g, "_")
            .substring(0, 25);
        }
      } else {
        // Nếu là PDF thì lấy tên gốc của file
        cleanName = file.name.split('.')[0].normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "_");
      }

      setMsg("Đang tải lên mây...");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);
      fd.append("public_id", `file_${cleanName}_${Date.now()}`);
      fd.append("resource_type", "auto"); 

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { 
        method: "POST", 
        body: fd 
      });
      const cloud = await res.json();

      if (res.ok) {
        setMsg("Đồng bộ danh sách...");
        const newItem = { n: cleanName, u: cloud.secure_url, t: new Date().toLocaleString('vi-VN') };
        const oldData = [...history].reverse();
        const updatedLog = [...oldData, newItem].map(h => JSON.stringify(h)).join('\n');
        
        const logFile = new File([updatedLog], `${LOG_ID}.txt`, { type: 'text/plain' });
        const logFd = new FormData();
        logFd.append("file", logFile);
        logFd.append("upload_preset", UPLOAD_PRESET);
        logFd.append("public_id", LOG_ID);
        logFd.append("resource_type", "raw");

        await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: "POST", body: logFd });
        
        setMsg("Thành công!");
        setTimeout(() => { setMsg(""); loadData(); }, 1000);
      }
    } catch (err) {
      setMsg("Lỗi: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '15px', fontFamily: 'sans-serif', maxWidth: '500px', margin: 'auto' }}>
      <h3 style={{ color: '#2c3e50', textAlign: 'center', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
        HỒ SƠ XÂY DỰNG - LÊ CÔNG
      </h3>
      
      <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '15px', textAlign: 'center', border: '2px dashed #3498db', marginBottom: '20px' }}>
        {loading ? (
          <div style={{ color: '#e67e22', fontWeight: 'bold' }}>{msg}</div>
        ) : (
          <div>
            <input 
              type="file" 
              accept="image/*,application/pdf" 
              onChange={e => handleFileSelect(e.target.files[0])} 
              id="file-input"
              style={{ display: 'none' }}
            />
            <label htmlFor="file-input" style={{ background: '#3498db', color: '#fff', padding: '15px 25px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'inline-block' }}>
               📁 CHỌN ẢNH HOẶC PDF
            </label>
            <p style={{ fontSize: '11px', color: '#7f8c8d', marginTop: '10px' }}>Anh có thể chụp mới hoặc chọn từ Album</p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <b style={{ color: '#34495e' }}>HỒ SƠ ĐÃ LÊN KỆ ({history.length})</b>
        <button onClick={loadData} style={{ border: 'none', background: 'none', color: '#3498db' }}>🔄 Làm mới</button>
      </div>

      <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
        {history.map((item, i) => (
          <div key={i} style={{ padding: '12px', borderBottom: '1px solid #ecf0f1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', marginBottom: '5px', borderRadius: '8px' }}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{item.n}</div>
              <div style={{ fontSize: '11px', color: '#95a5a6' }}>{item.t}</div>
            </div>
            <button 
              onClick={() => setViewUrl(item.u)} 
              style={{ background: '#2ecc71', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', marginLeft: '10px' }}
            >
              XEM
            </button>
          </div>
        ))}
      </div>

      {viewUrl && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 999, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px', textAlign: 'right' }}>
            <button onClick={() => setViewUrl(null)} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '5px', fontWeight: 'bold' }}>ĐÓNG</button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
             {viewUrl.toLowerCase().includes('.pdf') ? (
               <iframe src={viewUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="pdf-viewer" />
             ) : (
               <img src={viewUrl} style={{ maxWidth: '100%', maxHeight: '100%' }} alt="view" />
             )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
