import React, { useState, useRef } from 'react';
import './BusinessScanner.css'; // Anh nhớ dán file CSS tôi vừa gửi ở trên vào đây

const BusinessScanner = () => {
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [scannedData, setScannedData] = useState(null); // Lưu: { name: '', phone: '', img: '' }
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // 1. Mở Camera (Ưu tiên camera sau để chụp bảng hiệu)
  const startCamera = async () => {
    try {
      setScannedData(null); 
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      alert("Không mở được Camera. Anh kiểm tra lại quyền trình duyệt nhé!");
    }
  };

  // 2. Chụp và Trích xuất thông tin (OCR)
  const captureAndProcess = async () => {
    setLoading(true);
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);

      // Chuyển ảnh sang Base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      // --- KHÚC NÀY LÀ LOGIC TRÍCH XUẤT CỦA ANH ---
      // Ví dụ: Gọi API Gemini hoặc AppSheet để lấy Name và Phone
      // Tạm thời tôi giả lập kết quả để anh thấy giao diện:
      const mockResult = {
        name: "Cửa hàng Vật liệu Xây dựng A",
        phone: "0901234567",
        img: imageData
      };

      setScannedData(mockResult);
      
      // Tắt camera sau khi đã có ảnh
      const tracks = video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      setCameraActive(false);

      // Ghi vào Sheet (Anh gọi hàm ghi Sheet của anh ở đây)
      console.log("Đã trích xuất và chuẩn bị ghi vào Sheet:", mockResult);

    } catch (error) {
      alert("Lỗi trích xuất: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scanner-wrapper">
      <div className="scanner-main-card">
        <h3>QUÉT CARD & BẢNG HIỆU</h3>

        {/* Khung hiển thị Camera hoặc Ảnh đã chụp */}
        <div className="scan-display">
          {cameraActive ? (
            <video ref={videoRef} autoPlay playsInline />
          ) : scannedData ? (
            <img src={scannedData.img} className="card-thumb" alt="Card" />
          ) : (
            <div style={{ color: '#94a3b8' }}>
              <p>Chưa có dữ liệu. Anh bấm Mở Camera nhé!</p>
            </div>
          )}
        </div>

        {/* Hiển thị kết quả trích xuất và nút Gọi */}
        {scannedData && (
          <div className="scan-result">
            <div style={{ flex: 1 }}>
              <p className="biz-name">{scannedData.name}</p>
              <p className="biz-phone">{scannedData.phone}</p>
            </div>
            {scannedData.phone && (
              <a href={`tel:${scannedData.phone}`} className="call-now-btn">
                <i className="fas fa-phone"></i> Gọi ngay
              </a>
            )}
          </div>
        )}

        {/* Nút bấm hành động */}
        <div style={{ marginTop: '15px' }}>
          {cameraActive ? (
            <button className={`capture-btn ${loading ? 'disabled' : ''}`} onClick={captureAndProcess} disabled={loading}>
              {loading ? <i className="fas fa-spinner spin"></i> : <i className="fas fa-dot-circle"></i>}
              {loading ? " Đang trích xuất..." : " Chụp & Lưu Sheet"}
            </button>
          ) : (
            <button className="capture-btn" onClick={startCamera}>
              <i className="fas fa-camera"></i> {scannedData ? "Chụp lại" : "Mở Camera"}
            </button>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
};

export default BusinessScanner;
