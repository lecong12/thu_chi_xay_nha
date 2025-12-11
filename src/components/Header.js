import React from "react";
import { FiRefreshCw, FiHome, FiLogOut } from "react-icons/fi";
import "./Header.css";

function Header({ onRefresh, loading, onLogout }) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <div className="logo">
            <FiHome className="logo-icon" />
            <span className="logo-text">Quản Lý Thu Chi</span>
          </div>
          <span className="subtitle">Dự án xây nhà</span>
        </div>

        <div className="header-right">
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
