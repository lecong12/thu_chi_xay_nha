import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// QUAN TRỌNG: Đảm bảo bạn đã tạo file font này theo hướng dẫn ở Bước 2.
import { arimoNormal } from './Arimo-Regular-normal.js';

const exportToPDF = (data, title = "Báo cáo chi tiêu") => {
  try {
    // Kiểm tra xem font đã được import đúng chưa
    if (!arimoNormal) {
      alert("Lỗi: Không tìm thấy dữ liệu font. Vui lòng kiểm tra lại file Arimo-Regular-normal.js");
      return;
    }

    const doc = new jsPDF();

    // 1. Thêm font tiếng Việt vào file PDF
    doc.addFileToVFS('Arimo-Regular.ttf', arimoNormal);
    doc.addFont('Arimo-Regular.ttf', 'Arimo', 'normal');
    doc.setFont('Arimo');

    const tableColumn = ["STT", "Ngày", "Hạng mục", "Nội dung chi tiết", "Số tiền (VND)"];
    const tableRows = [];

    // 2. Chuẩn bị dữ liệu cho bảng
    data.forEach((item, index) => {
      const transactionData = [
        index + 1,
        new Date(item.ngay).toLocaleDateString("vi-VN"),
        item.doiTuongThuChi,
        item.noiDung,
        new Intl.NumberFormat('vi-VN').format(item.soTien),
      ];
      tableRows.push(transactionData);
    });

    // 3. Thêm tiêu đề cho tài liệu
    doc.setFontSize(18);
    doc.text(title, 14, 15);

    // 4. Sử dụng autoTable để vẽ bảng
    doc.autoTable(tableColumn, tableRows, {
      startY: 20,
      styles: { font: "Arimo", fontStyle: 'normal' },
      headStyles: { fillColor: [45, 142, 43], textColor: [255, 255, 255], fontStyle: 'bold' }
    });

    // 5. Lưu file PDF
    doc.save(`bao_cao_chi_tieu_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (error) {
    console.error("Lỗi khi tạo PDF:", error);
    alert("Đã xảy ra lỗi khi tạo file PDF. Vui lòng kiểm tra console để biết chi tiết.");
  }
};

export default exportToPDF;