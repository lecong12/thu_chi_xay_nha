import React, { useState } from "react";
import {
  FiFilter,
  FiSearch,
  FiX,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import "./FilterBar.css";

function FilterBar({ filters, filterOptions, onFilterChange, onReset }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div className="filter-bar">
      <div className="filter-header">
        <div className="filter-title">
          <FiFilter />
          <span>Bộ lọc dữ liệu</span>
          {hasActiveFilters && <span className="filter-badge">Đang lọc</span>}
        </div>

        <div className="filter-actions">
          {hasActiveFilters && (
            <button className="reset-btn" onClick={onReset}>
              <FiX />
              <span>Xóa lọc</span>
            </button>
          )}
          <button
            className="toggle-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
            <span className="toggle-text">
              {isExpanded ? "Thu gọn" : "Mở rộng"}
            </span>
          </button>
        </div>
      </div>

      {/* Search bar - always visible */}
      <div className="search-container">
        <FiSearch className="search-icon" />
        <input
          type="text"
          placeholder="Tìm kiếm theo nội dung, ghi chú, người cập nhật..."
          value={filters.searchText}
          onChange={(e) => onFilterChange("searchText", e.target.value)}
          className="search-input"
        />
        {filters.searchText && (
          <button
            className="clear-search"
            onClick={() => onFilterChange("searchText", "")}
          >
            <FiX />
          </button>
        )}
      </div>

      {/* Expanded filters */}
      <div className={`filter-content ${isExpanded ? "expanded" : ""}`}>
        <div className="filter-grid">
          {/* Loại thu chi */}
          <div className="filter-group">
            <label className="filter-label">Loại</label>
            <select
              value={filters.loaiThuChi}
              onChange={(e) => onFilterChange("loaiThuChi", e.target.value)}
              className="filter-select"
            >
              <option value="">Tất cả</option>
              {filterOptions.loaiThuChi.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Người cập nhật */}
          <div className="filter-group">
            <label className="filter-label">Người cập nhật</label>
            <select
              value={filters.nguoiCapNhat}
              onChange={(e) => onFilterChange("nguoiCapNhat", e.target.value)}
              className="filter-select"
            >
              <option value="">Tất cả</option>
              {filterOptions.nguoiCapNhat.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Đối tượng thu chi */}
          <div className="filter-group">
            <label className="filter-label">Đối tượng</label>
            <select
              value={filters.doiTuongThuChi}
              onChange={(e) => onFilterChange("doiTuongThuChi", e.target.value)}
              className="filter-select"
            >
              <option value="">Tất cả</option>
              {filterOptions.doiTuongThuChi.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Ngày bắt đầu */}
          <div className="filter-group">
            <label className="filter-label">Từ ngày</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => onFilterChange("startDate", e.target.value)}
              className="filter-input"
            />
          </div>

          {/* Ngày kết thúc */}
          <div className="filter-group">
            <label className="filter-label">Đến ngày</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => onFilterChange("endDate", e.target.value)}
              className="filter-input"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default FilterBar;
