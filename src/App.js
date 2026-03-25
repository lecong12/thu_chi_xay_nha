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
import "./DarkMode.css";

const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;
const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem("isLoggedIn") === "true");
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("theme") === "dark");

  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null); 
  const [toast, setToast] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 768;

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

  const showToast = (message, type = "success") => setToast({ message, type });

  const handleAddNew = () => {
    setEditingItem({
      ngay: new Date(),
      soTien: 0,
      loaiThuChi: "Chi",
      noiDung: "",
      doiTuongThuChi: "",
      nguoiCapNhat: "",
      hinhAnh: ""
    });
  };

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
        showToast("Lưu thành công!", "success");
        setEditingItem(null);
        await fetchAllData();
      }
    } catch (error) { showToast(error.message, "error"); }
  };

  const handleUniversalUpload = async (id, tableName, columnName, file) => {
    if (!file) return;
    try {
      setUploadingId(id);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
        method: "POST", body: formData
      });
      const fileData = await res.json();
      if (fileData.secure_url) {
        const result = await updateRowInSheet(tableName, { id, [columnName]: fileData.secure_url }, APP_ID);
        if (result.success) { showToast("Lưu tệp thành công!", "success"); await fetchAllData(); }
      }
    } catch (error) { showToast(`Lỗi: ${error.message}`, "error"); } finally { setUploadingId(null); }
  };

  const [filters, setFilters] = useState({ loaiThuChi: "", nguoiCapNhat: "", doiTuongThuChi: "", startDate: "", endDate: "", searchText: "" });

  const filterOptions = useMemo(() => ({
    doiTuongThuChi: [...new Set(data.map(i => i.doiTuongThuChi).filter(Boolean))],
    nguoiCapNhat: [...new Set(data.map(i => i.nguoiCapNhat).filter(Boolean))],
  }), [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (filters.loaiThuChi && item.loaiThuChi !== filters.loaiThuChi) return false;
      if (filters.nguoiCapNhat && item.nguoiCapNhat !== filters.nguoiCapNhat) return false;
      if (filters.doiTuongThuChi && item.doiTuongThuChi !== filters.doiTuongThuChi) return false;
      if (filters.searchText) {
        const t = filters.searchText.toLowerCase();
        return (item.noiDung || "").toLowerCase().includes(t) || (item.doiTuongThuChi || "").toLowerCase().includes(t);
      }
      return true;
    });
  }, [data, filters]);

  const renderContent = () => {
    const stats = { tongThu: 0, tongChi: filteredData.reduce((s, i) => s + i.soTien, 0), soGiaoDich: filteredData.length };
    const extraData = { top5: [], chartData: [], nganSach, tienDo };

    switch (activeTab) {
      case 'dashboard': return <Dashboard stats={stats} data={filteredData} extraData={extraData} isDarkMode={isDarkMode} />;
      case 'list': return (
        <>
          <FilterBar filters={filters} filterOptions={filterOptions} onFilterChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))} onReset={() => setFilters({ loaiThuChi: "", nguoiCapNhat: "", doiTuongThuChi: "", startDate: "", endDate: "", searchText: "" })} onAdd={handleAddNew} />
          <DataTable data={filteredData} onEdit={setEditingItem} onDelete={setItemToDelete} />
        </>
      );
      case 'all':
        return (
          <>
            <div style={{ marginBottom: '20px' }}>
              <Dashboard stats={stats} data={filteredData} extraData={extraData} isDarkMode={isDarkMode} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <FilterBar filters={filters} filterOptions={filterOptions} onFilterChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))} onReset={() => setFilters({ loaiThuChi: "", nguoiCapNhat: "", doiTuongThuChi: "", startDate: "", endDate: "", searchText: "" })} onAdd={handleAddNew} />
                <DataTable data={filteredData} onEdit={setEditingItem} onDelete={setItemToDelete} />
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <BudgetView budget={nganSach} onUpdateBudget={handleUpdateBudget} showToast={showToast} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <ProgressTracker stages={tienDo} onUpdateStage={handleUpdateStage} showToast={showToast} onUploadFile={(id, f) => handleUniversalUpload(id, "TienDo", "Ảnh nghiệm thu", f)} uploadingId={uploadingId} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <GanttChartView stages={tienDo} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <DesignDrawings onUploadPDF={(id, f) => handleUniversalUpload(id, "BanVe", "url", f)} uploadingId={uploadingId} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <ConstructionContracts onUploadPDF={(id, f) => handleUniversalUpload(id, "HopDong", "url", f)} uploadingId={uploadingId} />
            </div>
            <div style={{ marginBottom: '80px' }}>
              <QuickNotes />
            </div>
          </>
        );
      case 'budget': return <BudgetView budget={nganSach} onUpdateBudget={handleUpdateBudget} showToast={showToast} />;
      case 'progress_tracker': return <ProgressTracker stages={tienDo} onUpdateStage={handleUpdateStage} showToast={showToast} onUploadFile={(id, f) => handleUniversalUpload(id, "TienDo", "Ảnh nghiệm thu", f)} uploadingId={uploadingId} />;
      case 'gantt_chart': return <GanttChartView stages={tienDo} />;
      case 'drawings': return <DesignDrawings onUploadPDF={(id, f) => handleUniversalUpload(id, "BanVe", "url", f)} uploadingId={uploadingId} />;
      case 'contracts': return <ConstructionContracts onUploadPDF={(id, f) => handleUniversalUpload(id, "HopDong", "url", f)} uploadingId={uploadingId} />;
      case 'notes': return <QuickNotes />;
      default: return <Dashboard stats={stats} data={filteredData} extraData={extraData} isDarkMode={isDarkMode} />;
    }
  };

  if (!isLoggedIn) return <Login onLogin={() => { localStorage.setItem("isLoggedIn", "true"); setIsLoggedIn(true); }} />;

  return (
    <div className={`app ${isDarkMode ? 'dark-theme' : ''}`}>
      <Sidebar 
        isOpen={isSidebarOpen} toggle={() => setIsSidebarOpen(!isSidebarOpen)} 
        activeTab={activeTab} onTabChange={setActiveTab} 
        onLogout={() => { localStorage.removeItem("isLoggedIn"); setIsLoggedIn(false); }} 
        isDarkMode={isDarkMode} toggleDarkMode={() => setIsDarkMode(!isDarkMode)} 
        isMobile={isMobile}
      />
      <div 
        className="app-main-wrapper" 
        style={{ 
          marginLeft: isMobile ? '0' : (isSidebarOpen ? '280px' : '80px'),
          transition: 'margin-left 0.3s ease', width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column'
        }}
      >
        <Header onRefresh={fetchAllData} loading={loading} onAdd={handleAddNew} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isDarkMode={isDarkMode} />
        <main className="main-content" style={{ flex: 1 }}>
          {loading ? <div className="loading-spinner"></div> : renderContent()}
        </main>
        {isMobile && !isSidebarOpen && <MobileFooter activeTab={activeTab} onTabChange={setActiveTab} />}
      </div>
      {editingItem && <EditModal item={editingItem} onClose={() => setEditingItem(null)} onSave={handleSaveEdit} showToast={showToast} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {itemToDelete && <ConfirmModal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} onConfirm={async () => {
          const item = data.find(i => i.id === itemToDelete);
          if (item) {
            const result = await deleteRowFromSheet("GiaoDich", item.keyId || item.id, APP_ID);
            if (result.success) { showToast("Đã xóa!", "success"); await fetchAllData(); }
          }
          setItemToDelete(null);
      }} title="Xác nhận xóa" />}
    </div>
  );
}

export default App;
