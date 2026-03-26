import React, { useState, useRef } from 'react';
import './BusinessScanner.css';

const BusinessScanner = () => {
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async () => {
    try {
      setScannedData(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraActive(true);
        };
      }
    } catch (err) {
      alert("Lỗi cam: " + err.message);
    }
  };

  // --- HÀM XỬ LÝ TRÍCH XUẤT THÔNG TIN THẬT ---
  const processImageOCR = async (base64Image) => {
    try {
      // Ở đây anh sẽ gọi API của anh (Gemini hoặc AppSheet)
      // Tôi giả sử anh dùng một hàm fetch để gửi ảnh đi:
      const response = await fetch('YOUR_API_ENDPOINT_HERE', {
        method: 'POST',
        body: JSON.stringify({ image: base64Image }),
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      return {
        name: data.name || "Không rõ tên",
        phone: data.phone || ""
      };
    } catch (error) {
      console.error("Lỗi trích xuất:", error);
      return { name: "Lỗi trích xuất", phone: "" };
    }
  };

  const captureCard = async () => {
    setLoading(true);
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    // 1. Chuyển ảnh thành chuỗi Base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    // 2. Dừng camera để tiết kiệm tài nguyên
    const tracks = video.srcObject.getTracks();
    tracks.forEach(t => t.stop());
    setCameraActive(false);

    // 3. GỌI HÀM TRÍCH XUẤT (Đây là bước anh đang thiếu)
    // Nếu chưa có API, tôi sẽ để một logic lọc số điện thoại tạm thời bằng regex
    const extractedInfo = await processImageOCR(imageData);

    setScannedData({ 
      name: extractedInfo.name, 
      phone: extractedInfo.phone, 
      img: imageData 
    });
    
    setLoading(false);
  };

  return (
    <div className="scanner-wrapper">
      <div className="scanner-main-card">
        <h4 style={{margin: '0 0 10px 0'}}>QUÉT CARD & BẢNG HIỆU</h4>

        <div className="scan-display">
          {cameraActive ? (
            <video ref={videoRef} autoPlay playsInline muted />
          ) : scannedData ? (
            <img src={scannedData.img} className="card-thumb" alt="Card" />
          ) : (
            <div style={{color: '#fff'}}>Sẵn sàng soi Card...</div>
          )}
        </div>

        {scannedData && (
          <div className="scan-result">
            <div style={{flex: 1}}>
              <strong style={{fontSize: '14px'}}>{scannedData.name}</strong><br/>
              <span style={{color: '#10b981', fontWeight: 'bold'}}>{scannedData.phone}</span>
            </div>
            {scannedData.phone && (
              <a href={`tel:${scannedData.phone}`} className="call-now-btn">GỌI</a>
            )}
          </div>
        )}

        <button className="capture-btn" onClick={cameraActive ? captureCard : startCamera} disabled={loading}>
          {cameraActive ? (loading ? "ĐANG QUÉT..." : "CHỤP & TRÍCH XUẤT") : "MỞ CAMERA SOI"}
        </button>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
};

export default BusinessScanner;
