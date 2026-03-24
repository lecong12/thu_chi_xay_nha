import React from "react";
import { FiRefreshCw, FiHome, FiLogOut, FiPlus, FiFilter } from "react-icons/fi";
import "./Header.css";

function Header({ onRefresh, loading, onLogout, onAdd, onToggleFilter }) {
  return (
    <header className="header" style={{ height: '60px', minHeight: '60px' }}>
      <div className="header-content">
        <div className="header-left">
          <div className="logo">
            <FiHome className="logo-icon" />
            <span className="logo-text">Sổ Tay Xây Nhà</span>
          </div>
          <span className="subtitle">Theo dõi chi phí & Tiến độ</span>
        </div>

        <div className="header-right">
          <button className="refresh-btn" onClick={onToggleFilter} title="Bộ lọc">
            <FiFilter />
            <span className="mobile-hidden">Lọc</span>
          </button>
          <button className="add-btn" onClick={onAdd} title="Thêm mới">
            <FiPlus />
            <span>Thêm</span>
          </button>
          <button
            className={`refresh-btn ${loading ? "loading" : ""}`}
            onClick={onRefresh}
            disabled={loading}
            title="Làm mới dữ liệu"
          >
            <FiRefreshCw />
            <span>Làm mới</span>
          </button>
          <button className="logout-btn" onClick={onLogout} title="Đăng xuất">
            <FiLogOut />
            <span>Thoát</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
