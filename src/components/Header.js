import React from 'react';
import { FiRefreshCw, FiPlus, FiMenu } from 'react-icons/fi';
import './Header.css';

const Header = ({ onRefresh, loading, onAdd, onToggleSidebar, isDarkMode }) => {
  return (
    <header className={`app-header ${isDarkMode ? 'dark-theme' : ''}`}>
      <div className="header-left">
        {/* Nút mở Sidebar - Cực kỳ quan trọng trên Mobile */}
        <button className="icon-btn menu-toggle" onClick={onToggleSidebar} title="Menu">
          <FiMenu size={22} />
        </button>
        <h2 className="header-title">THU CHI XÂY NHÀ</h2>
      </div>

      <div className="header-right">
        {/* Nút làm mới dữ liệu */}
        <button 
          className={`icon-btn refresh-btn ${loading ? 'spinning' : ''}`} 
          onClick={onRefresh} 
          disabled={loading}
          title="Làm mới"
        >
          <FiRefreshCw size={20} />
        </button>

        {/* Nút Thêm mới nhanh - Chỉ hiện biểu tượng trên Mobile để tiết kiệm chỗ */}
        <button className="primary-btn add-btn" onClick={onAdd}>
          <FiPlus size={20} />
          <span className="btn-text">Thêm mới</span>
        </button>

        {/* GHI CHÚ: ĐÃ LOẠI BỎ NÚT LOGOUT TẠI ĐÂY VÌ ĐÃ CÓ TRONG SIDEBAR */}
      </div>
    </header>
  );
};

export default Header;
