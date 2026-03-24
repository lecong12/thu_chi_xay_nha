import React from 'react';
import { 
  FiLogOut, 
  FiChevronLeft, 
  FiChevronRight,
  FiCheckCircle,
  FiBarChart2,
  FiDollarSign,
  FiList,
  FiGrid,
  FiMessageCircle,
  FiMoon,
  FiSun,
  FiFileText,
  FiBriefcase,
  FiMap,
  FiTrendingUp 
} from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = ({ isOpen, toggle, activeTab, onTabChange, onLogout, isDarkMode, toggleDarkMode }) => {
  
  // KHÔI PHỤC ĐẦY ĐỦ 10 MỤC MENU
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
    { id: 'all', icon: <FiGrid size={20} />, label: 'Tất cả' },
  ];

  const handleItemClick = (id) => {
    onTabChange(id);
    // Tự động đóng trên mobile khi chọn xong
    if (window.innerWidth <= 768 && isOpen) {
      toggle();
    }
  };

  return (
    <>
      {/* Overlay cho mobile */}
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

        {/* PHẦN CHÂN: TỐI/SÁNG & ĐĂNG XUẤT */}
        <div className="sidebar-footer">
          <div className="menu-item theme-toggle" onClick={toggleDarkMode}>
            <div className="menu-icon">
              {isDarkMode ? <FiSun size={20} color="#fbbf24" /> : <FiMoon size={20} />}
            </div>
            {isOpen && <span className="menu-label">{isDarkMode ? "Giao diện Sáng" : "Giao diện Tối"}</span>}
          </div>

          <div className="menu-item logout" onClick={onLogout}>
            <div className="menu-icon"><FiLogOut size={20} /></div>
            {isOpen && <span className="menu-label">Đăng xuất</span>}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
