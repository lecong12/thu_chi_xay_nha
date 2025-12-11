import React, { useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiUser,
  FiTag,
  FiInfo,
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

function DataTable({ data }) {
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

  // Calculate total for current page
  const pageTotalThu = currentData
    .filter((item) => item.loaiThuChi === "Thu")
    .reduce((sum, item) => sum + item.soTien, 0);

  const pageTotalChi = currentData
    .filter((item) => item.loaiThuChi === "Chi")
    .reduce((sum, item) => sum + item.soTien, 0);

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
        <div className="table-summary">
          <span className="summary-item thu">
            Thu: {formatCurrency(pageTotalThu)}
          </span>
          <span className="summary-item chi">
            Chi: {formatCurrency(pageTotalChi)}
          </span>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="table-wrapper desktop-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Ngày</th>
              <th>Loại</th>
              <th>Nội dung</th>
              <th>Đối tượng</th>
              <th>Số tiền</th>
              <th>Người cập nhật</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((item, index) => (
              <tr
                key={item.id}
                className={item.loaiThuChi === "Thu" ? "row-thu" : "row-chi"}
              >
                <td>{startIndex + index + 1}</td>
                <td>{formatDate(item.ngay)}</td>
                <td>
                  <span
                    className={`type-badge ${
                      item.loaiThuChi === "Thu" ? "thu" : "chi"
                    }`}
                  >
                    {item.loaiThuChi}
                  </span>
                </td>
                <td className="content-cell">{item.noiDung || "-"}</td>
                <td>{item.doiTuongThuChi || "-"}</td>
                <td
                  className={`amount-cell ${
                    item.loaiThuChi === "Thu" ? "thu" : "chi"
                  }`}
                >
                  {formatCurrency(item.soTien)}
                </td>
                <td>{item.nguoiCapNhat || "-"}</td>
                <td className="note-cell">{item.ghiChu || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="mobile-cards">
        {currentData.map((item, index) => (
          <div
            key={item.id}
            className={`transaction-card ${
              item.loaiThuChi === "Thu" ? "thu" : "chi"
            } ${expandedRow === item.id ? "expanded" : ""}`}
            onClick={() => toggleRow(item.id)}
          >
            <div className="card-main">
              <div className="card-left">
                <span
                  className={`type-indicator ${
                    item.loaiThuChi === "Thu" ? "thu" : "chi"
                  }`}
                >
                  {item.loaiThuChi}
                </span>
                <div className="card-content">
                  <span className="card-title">
                    {item.noiDung || "Không có nội dung"}
                  </span>
                  <span className="card-subtitle">
                    <FiCalendar size={12} />
                    {formatDate(item.ngay)}
                  </span>
                </div>
              </div>
              <div
                className={`card-amount ${
                  item.loaiThuChi === "Thu" ? "thu" : "chi"
                }`}
              >
                {item.loaiThuChi === "Thu" ? "+" : "-"}
                {formatCurrency(item.soTien)}
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
                <div className="detail-item">
                  <FiTag size={14} />
                  <span className="detail-label">Đối tượng:</span>
                  <span className="detail-value">
                    {item.doiTuongThuChi || "-"}
                  </span>
                </div>
                {item.ghiChu && (
                  <div className="detail-item">
                    <FiInfo size={14} />
                    <span className="detail-label">Ghi chú:</span>
                    <span className="detail-value">{item.ghiChu}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

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
