import React, { useState, useMemo, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import ProgressTracker from "./components/ProgressTracker";
import BudgetView from "./components/BudgetView";
import GanttChartView from "./components/GanttChartView";
import DesignDrawings from "./components/DesignDrawings";
import ConstructionContracts from "./components/ConstructionContracts";
import QuickNotes from "./components/QuickNotes";
import DataTable from "./components/DataTable";
import MobileFooter from "./components/MobileFooter";
import Header from "./components/Header";
import FilterBar from "./components/FilterBar";
import Login from "./components/Login";
import EditModal from "./components/EditModal";
import ConfirmModal from "./components/ConfirmModal"; 
import { useAppData } from "./utils/useAppData"; 
import Toast from "./components/Toast"; 
import { updateRowInSheet, addRowToSheet, deleteRowFromSheet } from "./utils/sheetsAPI";
import Sidebar from "./components/Sidebar"; 
import "./App.css";
import "./DarkMode.css"; // Đảm bảo tệp này đã tồn tại

const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;
const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem("isLoggedIn") === "true");
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Khởi tạo Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  // Theo dõi kích thước màn hình
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 768;

  // Xử lý Dark Mode triệt để
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add("dark-theme");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-theme");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const { 
    data, setData, nganSach, tienDo, loading, fetchAllData, handleUpdateStage, handleUpdateBudget
  } = useAppData(isLoggedIn);

  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null); 
  const [toast, setToast] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });

  // Logic Upload tổng hợp
  const handleUniversalUpload = async (id, tableName, columnName, file) => {
    if (!file) return;
    try {
      setUploadingId(id);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      formData.append("resource_type", "auto"); 

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
        method: "POST", body: formData
      });
      const fileData = await res.json();

      if (fileData.secure_url) {
        const result = await updateRowInSheet(tableName, { id, [columnName]: fileData.secure_url }, APP_ID);
        if (result.success) {
          showToast("Lưu tệp thành công!", "success");
          await fetchAllData();
        }
      }
    } catch (error) {
      showToast(`Lỗi: ${error.message}`, "error");
    } finally {
      setUploadingId(null);
    }
  };

  const [filters, setFilters] = useState({
    loaiThuChi: "", nguoiCapNhat: "", doiTuongThuChi: "", startDate: "", endDate: "", searchText: "",
  });

  const filterOptions = useMemo(() => ({
    doiTuongThuChi: [...new Set(data.map((item) => item.doiTuongThuChi).filter(Boolean))],
    nguoiCapNhat: [...new Set(data.map((item) => item.nguoiCapNhat).filter(Boolean))],
  }), [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filters.loaiThuChi && item.loaiThuChi !== filters.loaiThuChi) return false;
      if (filters.nguoiCapNhat && item.nguoiCapNhat !== filters.nguoiCapNhat) return false;
      if (filters.doiTuongThuChi && item.doiTuongThuChi !== filters.doiTuongThuChi) return false;
      const itemDate = new Date(item.ngay);
      if (filters.startDate && itemDate < new Date(filters.startDate)) return false;
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (itemDate > end) return false;
      }
      if (filters.searchText) {
        const text = filters.searchText.toLowerCase();
        return (item.noiDung || "").toLowerCase().includes(text) || (item.doiTuongThuChi || "").toLowerCase().includes(text);
      }
      return true;
    });
  }, [data, filters]);

  const handleFilterChange = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const handleResetFilters = () => setFilters({ loaiThuChi: "", nguoiCapNhat: "", doiTuongThuChi: "", startDate: "", endDate: "", searchText: "" });
  
  const toggleDarkMode = () => setIsDarkMode(prev => !prev);
  const handleLogin = () => { localStorage.setItem("isLoggedIn", "true"); setIsLoggedIn(true); };
  const handleLogout = () => { localStorage.removeItem("isLoggedIn"); setIsLoggedIn(false); };

  const handleStageUpdate = async (stageId, updates) => {
    const result = await handleUpdateStage(stageId, updates);
    if (!result.success) showToast(result.message || "Lỗi cập nhật.", "error");
    return result; 
  };

  const handleTabChange = (tabId) => {
    if (tabId === 'zalo') { window.open("https://zalo.me/g/YOUR_GROUP_ID", "_blank"); return; }
    setActiveTab(tabId);
  };

  const handleAddNew = () => setEditingItem({ ngay: new Date(), soTien: 0, loaiThuChi: "Chi", noiDung: "", doiTuongThuChi: "", nguoiCapNhat: "", hinhAnh: "" });

  const handleSaveEdit = async (updatedItem) => {
    try {
      const isEdit = !!updatedItem.id;
      const apiPayload = {
        "id": updatedItem.keyId || updatedItem.id || `GD_${Date.now()}`,
        "Ngày": updatedItem.ngay instanceof Date ? updatedItem.ngay.toISOString().split("T")[0] : updatedItem.ngay,
        "Hạng mục": updatedItem.doiTuongThuChi,
        "Nội dung": updatedItem.noiDung,
        "Số tiền": updatedItem.soTien?.toString() || "0",
        "Người cập nhật": updatedItem.nguoiCapNhat || "",
        "Chứng từ": updatedItem.hinhAnh || "",
      };
      const result = isEdit ? await updateRowInSheet("GiaoDich", apiPayload, APP_ID) : await addRowToSheet("GiaoDich", apiPayload, APP_ID);
      if (result.success) {
        showToast("Thành công!", "success");
        setEditingItem(null);
        await fetchAllData();
      }
    } catch (error) { showToast(error.message, "error"); }
  };

  const executeDelete = async () => {
    const item = data.find(i => i.id === itemToDelete);
    if (!item) return;
    const result = await deleteRowFromSheet("GiaoDich", item.keyId || item.id, APP_ID);
    if (result.success) {
      showToast("Đã xóa!", "success");
      await fetchAllData();
    }
    setItemToDelete(null);
  };

  const extraData = useMemo(() => ({ top5: [], chartData: [], nganSach, tienDo }), [nganSach, tienDo]);
  const stats = useMemo(() => ({ 
    tongThu: 0, 
    tongChi: filteredData.reduce((s, i) => s + i.soTien, 0), 
    soGiaoDich: filteredData.length 
  }), [filteredData]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard stats={stats} data={filteredData} extraData={extraData} isDarkMode={isDarkMode} />;
      case 'progress_tracker': return <ProgressTracker stages={tienDo} onUpdateStage={handleStageUpdate} showToast={showToast} onUploadFile={(id, file) => handleUniversalUpload(id, "TienDo", "Ảnh nghiệm thu", file)} uploadingId={uploadingId} />;
      case 'budget': return <BudgetView budget={nganSach} onUpdateBudget={handleUpdateBudget} showToast={showToast} />;
      case 'gantt_chart': return <GanttChartView stages={tienDo} />;
      case 'drawings': return <DesignDrawings onUploadPDF={(id, file) => handleUniversalUpload(id, "BanVe", "url", file)} uploadingId={uploadingId} />;
      case 'contracts': return <ConstructionContracts onUploadPDF={(id, file) => handleUniversalUpload(id, "HopDong", "url", file)} uploadingId={uploadingId} />;
      case 'list':
        return (
          <div className="list-container">
            <FilterBar filters={filters} filterOptions={filterOptions} onFilterChange={handleFilterChange} onReset={handleResetFilters} onAdd={handleAddNew} />
            <DataTable data={filteredData} onEdit={setEditingItem} onDelete={setItemToDelete} />
          </div>
        );
      case 'notes': return <QuickNotes />;
      default: return <Dashboard stats={stats} data={filteredData} extraData={extraData} isDarkMode={isDarkMode} />;
    }
  };

  if (!isLoggedIn) return <Login onLogin={handleLogin} />;

  return (
    <div className={`app ${isDarkMode ? 'dark-theme' : ''}`}>
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggle={() => setIsSidebarOpen(!isSidebarOpen)} 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        onLogout={handleLogout} 
        isDarkMode={isDarkMode} 
        toggleDarkMode={toggleDarkMode} 
      />
      <div 
        className="app-main-wrapper" 
        style={{ 
          marginLeft: isMobile ? '0' : (isSidebarOpen ? '280px' : '80px'),
          transition: 'margin-left 0.3s ease',
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Header onRefresh={fetchAllData} loading={loading} onAdd={handleAddNew} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isDarkMode={isDarkMode} />
        <main className="main-content">
          {loading ? <div className="loading-spinner"></div> : renderContent()}
        </main>
      </div>
      {isMobile && <MobileFooter activeTab={activeTab} onTabChange={handleTabChange} />}
      {editingItem && <EditModal item={editingItem} onClose={() => setEditingItem(null)} onSave={handleSaveEdit} showToast={showToast} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {itemToDelete && <ConfirmModal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} onConfirm={executeDelete} title="Xác nhận xóa" />}
    </div>
  );
}

export default App;
