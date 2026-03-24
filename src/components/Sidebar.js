import React from 'react';
import { 
  FiHome, 
  FiList, 
  FiGrid, 
  FiLogOut, 
  FiChevronLeft, 
  FiChevronRight,
} from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = ({ isOpen, toggle, activeTab, onTabChange, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', icon: <FiHome size={20} />, label: 'Tổng quan' },
    { id: 'list', icon: <FiList size={20} />, label: 'Danh sách' },
    { id: 'all', icon: <FiGrid size={20} />, label: 'Tất cả' },
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