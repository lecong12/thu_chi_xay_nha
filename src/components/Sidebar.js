import React from 'react';
import { 
  FiHome, 
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
  FiFileText
} from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = ({ isOpen, toggle, activeTab, onTabChange, onLogout, isDarkMode, toggleDarkMode }) => {
  const menuItems = [
    { id: 'dashboard', icon: <FiHome size={20} />, label: 'Tổng quan' },
    { id: 'all', icon: <FiGrid size={20} />, label: 'Tất cả' },
    { id: 'progress_tracker', icon: <FiCheckCircle size={20} />, label: 'Theo dõi Tiến độ' },
    { id: 'gantt_chart', icon: <FiBarChart2 size={20} />, label: 'Biểu đồ Tiến độ' },
    { id: 'budget', icon: <FiDollarSign size={20} />, label: 'Đối chiếu Ngân sách' },
    { id: 'list', icon: <FiList size={20} />, label: 'Danh sách Giao dịch' },
    { id: 'notes', icon: <FiFileText size={20} />, label: 'Ghi chú nhanh' },
    { id: 'zalo', icon: <FiMessageCircle size={20} />, label: 'Chat Nhóm Zalo' },
  ];

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        {isOpen && <h3 className="app-title">Menu</h3>}
        <button className="toggle-btn" onClick={toggle} title={isOpen ? "Thu gọn" : "Mở rộng"}>
          {isOpen ? <FiChevronLeft /> : <FiChevronRight />}
        </button>
      </div>

      <div className="sidebar-menu">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
            title={!isOpen ? item.label : ''}
          >
            <div className="menu-icon">{item.icon}</div>
            {isOpen && <span className="menu-label">{item.label}</span>}
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div 
          className="menu-item" 
          onClick={toggleDarkMode} 
          title={!isOpen ? (isDarkMode ? "Chế độ Sáng" : "Chế độ Tối") : ''}
        >
          <div className="menu-icon">{isDarkMode ? <FiSun size={20} /> : <FiMoon size={20} />}</div>
          {isOpen && <span className="menu-label">{isDarkMode ? "Chế độ Sáng" : "Chế độ Tối"}</span>}
        </div>

        <div 
          className="menu-item logout" 
          onClick={onLogout} 
          title={!isOpen ? "Đăng xuất" : ''}
        >
          <div className="menu-icon"><FiLogOut size={20} /></div>
          {isOpen && <span className="menu-label">Đăng xuất</span>}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;