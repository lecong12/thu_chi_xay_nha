import React, { useState, useMemo, useEffect } from "react";
import Dashboard from "./components/Dashboard";

// --- Tách Component để dễ quản lý ---
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

const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;
const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem("isLoggedIn") === "true");
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [isDarkMode, setIsDarkMode] = useState(false); 
  
  const { 
    data, setData, nganSach, tienDo, loading, fetchAllData, handleUpdateStage, handleUpdateBudget
  } = useAppData(isLoggedIn);

  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null); 
  const [toast, setToast] = useState(null);
  const [uploadingId, setUploadingId] = useState(null); // Quản lý trạng thái upload chung

  // --- LOGIC UPLOAD FILE TỔNG HỢP (ẢNH/PDF) ---
  // id: khóa chính của dòng cần update
  // tableName: Tên Sheet (HopDong, BanVe, TienDo...)
  // columnName: Tên cột lưu link (url, hinhAnh...)
  const handleUniversalUpload = async (id, tableName, columnName, file) => {
    if (!file) return;

    try {
      setUploadingId(id);
      showToast("Đang tải file lên Cloudinary...", "info");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      formData.append("resource_type", "auto"); // Tự động nhận diện PDF/Ảnh

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
        { method: "POST", body: formData }
      );
      const fileData = await res.json();

      if (fileData.secure_url) {
        showToast("Đang đồng bộ với Google Sheets...", "info");
        
        // Cập nhật AppSheet
        const result = await updateRowInSheet(tableName, { 
          id: id, 
          [columnName]: fileData.secure_url 
        }, APP_ID);

        if (result.success) {
          showToast("Lưu tệp thành công!", "success");
          await fetchAllData(); // Load lại toàn bộ để cập nhật UI
        } else {
          showToast(`Lỗi lưu AppSheet: ${result.message}`, "error");
        }
      }
    } catch (error) {
      showToast(`Lỗi upload: ${error.message}`, "error");
    } finally {
      setUploadingId(null);
    }
  };

  // Các hàm Filter giữ nguyên...
  const [filters, setFilters] = useState({
    loaiThuChi: "", nguoiCapNhat: "", doiTuongThuChi: "", startDate: "", endDate: "", searchText: "",
  });
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

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
  const showToast = (message, type = "success") => setToast({ message, type });
  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
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
      showToast("Đang xử lý...", "info");
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
      } else {
        showToast(`Lỗi: ${result.message}`, "error");
      }
    } catch (error) { showToast(error.message, "error"); }
  };

  const requestDelete = (id) => setItemToDelete(id);
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
  const stats = useMemo(() => ({ tongThu: 0, tongChi: filteredData.reduce((s, i) => s + i.soTien, 0), soGiaoDich: filteredData.length }), [filteredData]);

  // --- RENDER CONTENT ---
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard stats={stats} data={filteredData} extraData={extraData} />;
      case 'progress_tracker': return <ProgressTracker stages={tienDo} onUpdateStage={handleStageUpdate} showToast={showToast} onUploadFile={(id, file) => handleUniversalUpload(id, "TienDo", "Ảnh nghiệm thu", file)} uploadingId={uploadingId} />;
      case 'budget': return <BudgetView budget={nganSach} onUpdateBudget={handleUpdateBudget} showToast={showToast} />;
      case 'drawings': return <DesignDrawings onUploadPDF={(id, file) => handleUniversalUpload(id, "BanVe", "url", file)} uploadingId={uploadingId} />;
      case 'contracts': return <ConstructionContracts onUploadPDF={(id, file) => handleUniversalUpload(id, "HopDong", "url", file)} uploadingId={uploadingId} />;
      case 'list':
        return (
          <div className="list-container">
            <FilterBar filters={filters} filterOptions={filterOptions} onFilterChange={handleFilterChange} onReset={handleResetFilters} onAdd={handleAddNew} />
            <DataTable data={filteredData} onEdit={setEditingItem} onDelete={requestDelete} />
          </div>
        );
      case 'notes': return <QuickNotes />;
      default: return <Dashboard stats={stats} data={filteredData} extraData={extraData} />;
    }
  };

  if (!isLoggedIn) return <Login onLogin={handleLogin} />;

  return (
    <div className={`app ${isDarkMode ? 'dark-mode' : ''}`}>
      <Sidebar isOpen={isSidebarOpen} toggle={() => setIsSidebarOpen(!isSidebarOpen)} activeTab={activeTab} onTabChange={handleTabChange} onLogout={handleLogout} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
      <div className="app-main-wrapper" style={{ marginLeft: window.innerWidth > 768 ? (isSidebarOpen ? '240px' : '64px') : '0', transition: 'margin-left 0.3s ease' }}>
        <Header onRefresh={fetchAllData} loading={loading} onAdd={handleAddNew} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="main-content">
          {loading ? <div className="loading-spinner"></div> : renderContent()}
        </main>
      </div>
      <MobileFooter activeTab={activeTab} onTabChange={setActiveTab} />
      {editingItem && <EditModal item={editingItem} onClose={() => setEditingItem(null)} onSave={handleSaveEdit} showToast={showToast} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {itemToDelete && <ConfirmModal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} onConfirm={executeDelete} title="Xác nhận xóa" />}
    </div>
  );
}

export default App;
