import React, { useState, useRef } from 'react';
import './BusinessScanner.css';

const BusinessScanner = () => {
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const callGeminiOCR = async (base64Image) => {
    const API_KEY = "AIzaSyBLOov5tK4IF6qVzfVIou6MiR_0VYqJRfc"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
    const prompt = {
      contents: [{
        parts: [
          { text: "Trích xuất Tên doanh nghiệp và Số điện thoại từ ảnh. Trả về JSON: {\"name\": \"...\", \"phone\": \"...\"}" },
          { inline_data: { mime_type: "image/jpeg", data: base64Image.split(',')[1] } }
        ]
      }]
    };
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prompt) });
      const data = await res.json();
      const cleanJson = data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (e) { return { name: "Lỗi AI", phone: "" }; }
  };

  const startCamera = async () => {
    setScannedData(null);
    setCameraActive(false);

    // Dừng tất cả các luồng cũ để giải phóng thiết bị
    if (window.localStream) {
        window.localStream.getTracks().forEach(track => track.stop());
    }

    // Danh sách các cấu hình thử nghiệm (từ gắt đến lỏng dần)
    const constraintsList = [
      { video: { facingMode: { exact: "environment" } } },
      { video: { facingMode: "environment" } },
      { video: true }
    ];

    let stream = null;

    for (const constraint of constraintsList) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraint);
        if (stream) break; // Nếu lấy được stream thì thoát vòng lặp
      } catch (e) {
        console.warn("Thử cấu hình tiếp theo do lỗi:", e.name);
      }
    }

    if (stream && videoRef.current) {
      window.localStream = stream; // Lưu lại để xóa sau này
      videoRef.current.srcObject = stream;
      
      // Đợi metadata load xong mới cho chạy
      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play()
          .then(() => setCameraActive(true))
          .catch(err => alert("Không thể phát video: " + err.message));
      };
    } else {
      alert("Trình duyệt không cho phép mở Camera hoặc thiết bị bận. Anh hãy tải lại trang (F5) nhé!");
    }
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !cameraActive) return;
    setLoading(true);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    // Dừng cam ngay
    if (window.localStream) {
        window.localStream.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);

    const result = await callGeminiOCR(imageData);
    setScannedData({ ...result, img: imageData });
    setLoading(false);
  };

  return (
    <div className="scanner-wrapper">
      <div className="scanner-main-card">
        <h4 style={{margin: '0 0 10px 0', color: '#1e293b'}}>QUÉT CARD & BẢNG HIỆU</h4>
        
        <div className="scan-display" style={{ background: '#000', position: 'relative' }}>
          {/* Luôn render thẻ video, điều khiển hiển thị bằng opacity để tránh lag */}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                display: cameraActive ? 'block' : 'none'
            }} 
          />
          
          {scannedData && !cameraActive && (
            <img src={scannedData.img} className="card-thumb" alt="Card" />
          )}

          {!cameraActive && !scannedData && (
            <div style={{color: '#94a3b8', textAlign: 'center', padding: '20px'}}>
               <i className="fas fa-video-slash fa-2x"></i>
               <p>Đang kết nối Cam Sau...</p>
            </div>
          )}
        </div>

        {scannedData && (
          <div className="scan-result">
            <div style={{flex: 1}}>
              <strong style={{fontSize: '15px'}}>{scannedData.name}</strong><br/>
              <span style={{color: '#10b981', fontWeight: 'bold', fontSize: '18px'}}>{scannedData.phone}</span>
            </div>
            {scannedData.phone && (
              <a href={`tel:${scannedData.phone.replace(/\s/g, '')}`} className="call-now-btn">GỌI</a>
            )}
          </div>
        )}

        <button 
          className="capture-btn" 
          onClick={cameraActive ? captureAndScan : startCamera} 
          disabled={loading}
          style={{marginTop: '10px'}}
        >
          {loading ? "ĐANG ĐỌC CHỮ..." : (cameraActive ? "BẤM CHỤP NGAY" : "MỞ CAMERA SAU")}
        </button>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
};

export default BusinessScanner;
