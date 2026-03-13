import React, { useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiUser,
  FiInfo,
  FiEdit2,
  FiTrash2,
  FiDownload,
  FiImage,
} from "react-icons/fi";
import "./DataTable.css";

const formatCurrency = (value) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (date) => {
  if (!date || !(date instanceof Date)) return "-";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatStageName = (name) => {
  if (!name) return "-";
  // Cắt bỏ phần trong ngoặc và xóa số thứ tự đầu dòng (VD: "1. Chuẩn bị (GPXD)" -> "Chuẩn bị")
  return name.split("(")[0].trim().replace(/^\d+\.\s*/, "");
};

// Hàm xuất dữ liệu ra CSV (Excel-compatible)
const exportToCSV = (data, fileName) => {
  if (!data || !data.length) return;

  // Tiêu đề cột
  const headers = ["Ngày", "Loại", "Nội dung", "Giai đoạn/Nguồn", "Số tiền", "Người cập nhật", "Ghi chú", "Link Ảnh"];
  
  // Chuyển đổi dữ liệu
  const csvRows = data.map(item => {
    const date = item.ngay instanceof Date ? item.ngay.toLocaleDateString("vi-VN") : item.ngay;
    // Escape dấu phẩy và dấu ngoặc kép để tránh lỗi CSV
    const escape = (text) => text ? `"${text.toString().replace(/"/g, '""')}"` : "";
    
    return [
      escape(date),
      escape(item.loaiThuChi),
      escape(item.noiDung),
      escape(item.doiTuongThuChi),
      item.soTien,
      escape(item.nguoiCapNhat),
      escape(item.ghiChu),
      escape(item.hinhAnh || "")
    ].join(",");
  });

  // Thêm BOM (\uFEFF) để Excel hiển thị đúng tiếng Việt
  const csvContent = "\uFEFF" + [headers.join(","), ...csvRows].join("\n");
  
  // Tạo link tải về
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

function DataTable({ data, onEdit, onDelete }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setExpandedRow(null);
  };

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const pageTotalChi = currentData
    .filter((item) => item.loaiThuChi === "Chi")
    .reduce((sum, item) => sum + item.soTien, 0);

  const chiList = currentData; // Tất cả dữ liệu giờ là chi phí

  if (data.length === 0) {
    return (
      <div className="data-table-container">
        <div className="no-data-message">
          <FiInfo size={48} />
          <p>Không có dữ liệu phù hợp với bộ lọc</p>
        </div>
      </div>
    );
  }

  return (
    <div className="data-table-container">
      <div className="table-header">
        <h3 className="table-title">Danh sách giao dịch</h3>
        <button className="export-btn" onClick={() => exportToCSV(data, "so-tay-xay-nha")}>
          <FiDownload /> Xuất Excel
        </button>
      </div>

      {/* Bảng Chi Phí */}
      {chiList.length > 0 && (
        <div className="section-container">
          <div className="section-header">
            <h4 className="section-title chi-title">Bảng Chi Phí</h4>
            <span className="summary-item chi">
              Tổng Chi: {formatCurrency(pageTotalChi)}
            </span>
          </div>
          <div className="table-wrapper desktop-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Hạng mục</th>
                  <th>Giai đoạn</th>
                  <th>Số tiền</th>
                  <th>Người cập nhật</th>
                  <th>Chứng từ</th>
                  <th>Ghi chú</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {chiList.map((item) => (
                  <tr key={item.id} className="row-chi">
                    <td style={{whiteSpace: 'nowrap'}}>{formatDate(item.ngay)}</td>
                    <td className="content-cell">{item.noiDung || "-"}</td>
                    <td>{formatStageName(item.doiTuongThuChi)}</td>
                    <td className="amount-cell chi">
                      {formatCurrency(item.soTien)}
                    </td>
                    <td>{item.nguoiCapNhat || "-"}</td>
                    <td className="center-cell">
                      {item.hinhAnh ? (
                        <a href={item.hinhAnh} target="_blank" rel="noreferrer" className="view-image-link" title="Xem ảnh">
                          <FiImage />
                        </a>
                      ) : (
                        <span className="no-image">-</span>
                      )}
                    </td>
                    <td className="note-cell">{item.ghiChu || "-"}</td>
                    <td className="action-cell">
                      <button
                        className="action-btn edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(item);
                        }}
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item.id);
                        }}
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards cho Chi */}
          <div className="mobile-cards">
            {chiList.map((item) => (
              <div
                key={item.id}
                className={`transaction-card chi ${
                  expandedRow === item.id ? "expanded" : ""
                }`}
                onClick={() => toggleRow(item.id)}
              >
                <div className="card-main">
                  <div className="card-left">
                    <div className="card-content">
                      <span className="card-title">
                        {item.noiDung || "Không có nội dung"}
                      </span>
                      <span className="card-subtitle">
                        <FiCalendar size={12} />
                        {formatDate(item.ngay)} &bull;{" "}
                        {formatStageName(item.doiTuongThuChi)}
                      </span>
                    </div>
                  </div>
                  <div className="card-amount chi">
                    -{formatCurrency(item.soTien)}
                  </div>
                </div>

                {expandedRow === item.id && (
                  <div className="card-details">
                    <div className="detail-item">
                      <FiUser size={14} />
                      <span className="detail-label">Người cập nhật:</span>
                      <span className="detail-value">
                        {item.nguoiCapNhat || "-"}
                      </span>
                    </div>
                    {item.hinhAnh && (
                       <div className="detail-item">
                         <FiImage size={14} />
                         <span className="detail-label">Chứng từ:</span>
                         <a href={item.hinhAnh} target="_blank" rel="noreferrer" className="detail-link">Xem ảnh</a>
                       </div>
                    )}
                    {item.ghiChu && (
                      <div className="detail-item">
                        <FiInfo size={14} />
                        <span className="detail-label">Ghi chú:</span>
                        <span className="detail-value">{item.ghiChu}</span>
                      </div>
                    )}
                    <div className="card-actions">
                      <button
                        className="action-btn edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(item);
                        }}
                      >
                        <FiEdit2 /> Sửa
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item.id);
                        }}
                      >
                        <FiTrash2 /> Xóa
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <FiChevronLeft />
          </button>

          <div className="page-numbers">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  className={`page-num ${
                    pageNum === currentPage ? "active" : ""
                  }`}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            className="page-btn"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <FiChevronRight />
          </button>

          <span className="page-info">
            {startIndex + 1}-{Math.min(endIndex, data.length)} / {data.length}
          </span>
        </div>
      )}
    </div>
  );
}

export default DataTable;
