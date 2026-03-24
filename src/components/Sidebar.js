import React from 'react';
import { 
  FiLogOut, FiChevronLeft, FiChevronRight, FiCheckCircle, FiBarChart2, 
  FiDollarSign, FiList, FiGrid, FiMessageCircle, FiMoon, FiSun, 
  FiFileText, FiBriefcase, FiMap, FiTrendingUp 
} from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = ({ isOpen, toggle, activeTab, onTabChange, onLogout, isDarkMode, toggleDarkMode }) => {
  
  const menuItems = [
    { id: 'dashboard', icon: <FiTrendingUp size={20} />, label: 'Tổng quan' },
    { id: 'list', icon: <FiList size={20} />, label: 'Danh sách Giao dịch' },
    { id: 'budget', icon: <FiDollarSign size={20} />, label: 'Đối chiếu Ngân sách' },
    { id: 'progress_tracker', icon: <FiCheckCircle size={20} />, label: 'Theo dõi Tiến độ' },
    { id: 'gantt_chart', icon: <FiBarChart2 size={20} />, label: 'Biểu đồ Tiến độ' },
    { id: 'drawings', icon: <FiMap size={20} />, label: 'Bản vẽ Thiết kế' },
    { id: 'contracts', icon: <FiBriefcase size={20} />, label: 'Hợp đồng Xây dựng' },
    { id: 'notes', icon: <FiFileText size={20} />, label: 'Ghi chú nhanh' },
    { id: 'zalo', icon: <FiMessageCircle size={20} />, label: 'Chat Nhóm Zalo' },
    { id: 'all', icon: <FiGrid size={20} />, label: 'Tất cả danh mục' },
  ];

  const handleItemClick = (id) => {
    if (id === 'zalo') {
      window.open("https://zalo.me/g/YOUR_ID", "_blank");
    } else {
      onTabChange(id);
    }
    if (window.innerWidth <= 768) toggle();
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'show' : ''}`} onClick={toggle} />
      <aside className={`sidebar ${isOpen ? 'open' : 'closed'} ${isDarkMode ? 'dark-theme' : ''}`}>
        <div className="sidebar-header">
          {isOpen && <h3 className="app-title">QUẢN LÝ</h3>}
          <div className="header-actions">
            <button className="theme-toggle-btn" onClick={toggleDarkMode}>
              {isDarkMode ? <FiSun color="#fbbf24" size={18} /> : <FiMoon size={18} />}
            </button>
            <button className="toggle-btn" onClick={toggle}>
              {isOpen ? <FiChevronLeft /> : <FiChevronRight />}
            </button>
          </div>
        </div>

        <div className="sidebar-menu">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleItemClick(item.id)}
            >
              <div className="menu-icon">{item.icon}</div>
              {isOpen && <span className="menu-label">{item.label}</span>}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="menu-item logout" onClick={onLogout}>
            <div className="menu-icon"><FiLogOut size={20} /></div>
            {isOpen && <span className="menu-label">Đăng xuất hệ thống</span>}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
