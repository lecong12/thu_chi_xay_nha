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

  const [extractedData, setExtractedData] = useState({ name: "", phone: "", address: "", url: "" });
  const [showForm, setShowForm] = useState(false);

  const loadData = async () => {
    try {
      const r = await fetch(`https://res.cloudinary.com/${CLOUD_NAME}/raw/upload/${LOG_ID}.txt?v=${Date.now()}`);
      if (r.ok) {
        const text = await r.text();
        const data = text.split('\n').filter(l => l.length > 10).map(line => JSON.parse(line));
        setHistory(data.reverse()); 
      }
    } catch (e) { console.log("Chưa có dữ liệu."); }
  };

  useEffect(() => { loadData(); }, []);

  const handleScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setMsg("Đang đọc thẻ và trích xuất...");

    try {
      // 1. Chạy OCR với chế độ ưu tiên tiếng Việt
      const { data: { text } } = await Tesseract.recognize(file, 'vie');
      console.log("Dữ liệu thô:", text); // Anh có thể F12 để xem máy đọc gì

      // 2. Xử lý logic lấy Tên Doanh Nghiệp (Lấy dòng đầu tiên có chữ hoặc dòng in hoa)
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
      let foundName = lines[0] || "";
      // Nếu dòng 1 quá ngắn, thử lấy dòng 2
      if (foundName.length < 5 && lines[1]) foundName = lines[1];

      // 3. Xử lý logic lấy Số điện thoại (Chấp nhận nhiều định dạng)
      const phoneRegex = /(0[3|5|7|8|9][0-9]{1,2}[.\s|-]*[0-9]{3}[.\s|-]*[0-9]{3,4})|(\+84[0-9]{9})/g;
      const phoneMatch = text.match(phoneRegex);
      const foundPhone = phoneMatch ? phoneMatch[0].replace(/[.\s|-]/g, "") : "";

      // 4. Tìm địa chỉ (Tìm dòng có từ khóa liên quan)
      const foundAddress = lines.find(l => 
        l.toLowerCase().includes("số") || 
        l.toLowerCase().includes("đường") || 
        l.toLowerCase().includes("tỉnh") || 
        l.toLowerCase().includes("quận") ||
        l.toLowerCase().includes("tp")
      ) || "";

      // 5. Tải ảnh lên lấy link
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: "POST", body: fd });
      const cloud = await res.json();

      // 6. CẬP NHẬT TRỰC TIẾP VÀO FORM
      setExtractedData({
        name: foundName.toUpperCase(), // Viết hoa cho chuyên nghiệp
        phone: foundPhone,
        address: foundAddress,
        url: cloud.secure_url
      });
      
      setShowForm(true);
      setMsg("");
    } catch (err) {
      setMsg("Lỗi: " + err.message);
    }
    setLoading(false);
  };

  const saveToCloud = async () => {
    setLoading(true);
    try {
      const newItem = { 
        n: extractedData.name, 
        p: extractedData.phone, 
        a: extractedData.address, 
        u: extractedData.url, 
        t: new Date().toLocaleString('vi-VN') 
      };
      
      const updatedLog = [...history].reverse().concat(newItem).map(h => JSON.stringify(h)).join('\n');
      const logFile = new File([updatedLog], `${LOG_ID}.txt`, { type: 'text/plain' });
      
      const logFd = new FormData();
      logFd.append("file", logFile);
      logFd.append("upload_preset", UPLOAD_PRESET);
      logFd.append("public_id", LOG_ID);
      logFd.append("resource_type", "raw");

      await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: "POST", body: logFd });
      
      setShowForm(false);
      loadData();
      alert("Đã lưu thành công hồ sơ: " + extractedData.name);
    } catch (e) { alert("Lỗi lưu trữ!"); }
    setLoading(false);
  };

  return (
    <div style={{ padding: '15px', fontFamily: 'Arial', maxWidth: '500px', margin: 'auto' }}>
      <h3 style={{ textAlign: 'center', color: '#007bff' }}>HỆ THỐNG TRÍCH XUẤT THẺ</h3>

      {!showForm ? (
        <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '15px', textAlign: 'center', border: '2px solid #007bff' }}>
          {loading ? <div><b>{msg}</b><p>Vui lòng đợi giây lát...</p></div> : (
            <label style={{ background: '#007bff', color: '#fff', padding: '15px 25px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-block' }}>
               📸 CHỤP CARD HOẶC BẢNG HIỆU
               <input type="file" accept="image/*" onChange={handleScan} style={{ display: 'none' }} />
            </label>
          )}
        </div>
      ) : (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '15px', border: '1px solid #ddd' }}>
          <h4 style={{ marginTop: 0, color: '#28a745' }}>DỮ LIỆU ĐÃ TRÍCH XUẤT</h4>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Tên doanh nghiệp / Chủ thẻ:</label>
            <input 
              style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
              value={extractedData.name} 
              onChange={e => setExtractedData({...extractedData, name: e.target.value})} 
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Số điện thoại:</label>
            <input 
              style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
              value={extractedData.phone} 
              onChange={e => setExtractedData({...extractedData, phone: e.target.value})} 
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Địa chỉ (nếu có):</label>
            <textarea 
              style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
              value={extractedData.address} 
              onChange={e => setExtractedData({...extractedData, address: e.target.value})} 
            />
          </div>

          <button onClick={saveToCloud} style={{ width: '100%', padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
             XÁC NHẬN VÀ LƯU HỒ SƠ
          </button>
          <button onClick={() => setShowForm(false)} style={{ width: '100%', marginTop: '10px', background: 'none', border: 'none', color: '#666' }}>Làm lại</button>
        </div>
      )}

      <div style={{ marginTop: '25px' }}>
        <b style={{ borderBottom: '2px solid #007bff' }}>NHẬT KÝ QUÉT THẺ</b>
        <div style={{ marginTop: '10px' }}>
          {history.map((item, i) => (
            <div key={i} style={{ padding: '12px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.n}</div>
                <div style={{ fontSize: '12px', color: '#007bff' }}>📞 {item.p}</div>
              </div>
              <button onClick={() => setViewUrl(item.u)} style={{ background: '#f8f9fa', border: '1px solid #ddd', padding: '5px 10px', borderRadius: '5px' }}>XEM</button>
            </div>
          ))}
        </div>
      </div>

      {viewUrl && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
          <button onClick={() => setViewUrl(null)} style={{ alignSelf: 'flex-end', margin: '15px', background: 'red', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '5px' }}>ĐÓNG</button>
          <img src={viewUrl} style={{ maxWidth: '100%', maxHeight: '80%', objectFit: 'contain' }} alt="origin" />
        </div>
      )}
    </div>
  );
}

export default App;
