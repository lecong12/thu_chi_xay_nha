import React, { useState, useRef } from 'react';

const BusinessScanner = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // 1. Hàm mở Camera (Ưu tiên camera sau - Environment)
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Không thể mở Camera. Anh hãy kiểm tra quyền truy cập!");
      console.error(err);
    }
  };

  // 2. Hàm chụp ảnh và gửi đi quét (OCR)
  const captureAndScan = async () => {
    setLoading(true);
    
    // Tự động dừng xoay sau 20 giây nếu bị treo
    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        alert("Quá thời gian chờ. Anh hãy thử chụp lại nhé!");
      }
    }, 20000);

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);

      // Chuyển ảnh sang dạng Base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      // Gửi sang Cloudinary (để lấy link sạch)
      const cloudRes = await fetch("https://api.cloudinary.com/v1_1/dqc9u6v8v/image/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: imageData,
          upload_preset: "ml_default" // Preset của anh
        })
      });
      const cloudData = await cloudRes.json();
      const cleanUrl = cloudData.secure_url;

      // 3. Gửi link sạch sang Gemini/AppSheet để đọc hóa đơn
      // Chỗ này anh thay bằng API quét của anh nhé
      console.log("Link ảnh sạch để quét:", cleanUrl);
      
      // Giả lập kết quả thành công
      setResult("Đã đọc được hóa đơn!");
      clearTimeout(timer);
    } catch (error) {
      alert("Lỗi quét hóa đơn: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scanner-container">
      <h3>Quét Hóa Đơn / Chụp Tiến Độ</h3>
      <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '8px' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
        <button onClick={startCamera}>Mở Camera</button>
        <button onClick={captureAndScan} disabled={loading}>
          {loading ? "Đang quét..." : "Chụp & Quét"}
        </button>
      </div>

      {loading && <div className="spinner">Đang xử lý, anh đợi tí...</div>}
      {result && <div className="result-box">{result}</div>}
    </div>
  );
};

export default BusinessScanner;
