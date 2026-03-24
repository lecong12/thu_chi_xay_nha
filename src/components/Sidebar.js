import React from 'react';
import { 
  FiLogOut, FiMoon, FiSun, FiChevronLeft, FiChevronRight,
  FiCheckCircle, FiTrendingUp, FiDollarSign, FiList, FiGrid, 
  FiMap, FiBriefcase, FiFileText, FiMessageCircle 
} from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = ({ 
  isOpen, 
  toggle, 
  activeTab, 
  onTabChange, 
  onLogout, 
  isDarkMode, 
  toggleDarkMode 
}) => {
  
  const menuItems = [
    { id: 'dashboard', icon: <FiTrendingUp size={20} />, label: 'Tổng quan' },
    { id: 'list', icon: <FiList size={20} />, label: 'Giao dịch' },
    { id: 'budget', icon: <FiDollarSign size={20} />, label: 'Ngân sách' },
    { id: 'progress_tracker', icon: <FiCheckCircle size={20} />, label: 'Tiến độ' },
    { id: 'drawings', icon: <FiMap size={20} />, label: 'Bản vẽ' },
    { id: 'contracts', icon: <FiBriefcase size={20} />, label: 'Hợp đồng' },
    { id: 'notes', icon: <FiFileText size={20} />, label: 'Ghi chú' },
  ];

  const handleItemClick = (id) => {
    onTabChange(id);
    // Tự động đóng sidebar khi chọn mục trên điện thoại
    if (window.innerWidth <= 768 && isOpen) {
      toggle();
    }
  };

  return (
    <>
      {/* Lớp phủ mờ nền khi mở menu trên mobile */}
      <div 
        className={`sidebar-overlay ${isOpen ? 'show' : ''}`} 
        onClick={toggle} 
      />

      <aside className={`sidebar ${isOpen ? 'open' : 'closed'} ${isDarkMode ? 'dark-theme' : ''}`}>
        <div className="sidebar-header">
          {isOpen && <h3 className="app-title">MENU</h3>}
          <button className="toggle-btn" onClick={toggle} title={isOpen ? "Thu gọn" : "Mở rộng"}>
            {isOpen ? <FiChevronLeft /> : <FiChevronRight />}
          </button>
        </div>

        <div className="sidebar-menu">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleItemClick(item.id)}
              title={!isOpen ? item.label : ''}
            >
              <div className="menu-icon">{item.icon}</div>
              {isOpen && <span className="menu-label">{item.label}</span>}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          {/* Nút Chế độ Tối/Sáng */}
          <div 
            className="menu-item theme-toggle" 
            onClick={toggleDarkMode} 
            title={!isOpen ? (isDarkMode ? "Giao diện Sáng" : "Giao diện Tối") : ''}
          >
            <div className="menu-icon">
              {isDarkMode ? <FiSun size={20} color="#fbbf24" /> : <FiMoon size={20} />}
            </div>
            {isOpen && <span className="menu-label">{isDarkMode ? 'Giao diện Sáng' : 'Giao diện Tối'}</span>}
          </div>

          {/* Nút Đăng xuất */}
          <div 
            className="menu-item logout" 
            onClick={onLogout} 
            title={!isOpen ? "Đăng xuất" : ''}
          >
            <div className="menu-icon"><FiLogOut size={20} /></div>
            {isOpen && <span className="menu-label">Đăng xuất</span>}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
