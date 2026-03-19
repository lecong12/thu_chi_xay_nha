import React, { useState, useEffect, useMemo } from "react";
import Dashboard from "./components/Dashboard";
import FilterBar from "./components/FilterBar";
import DataTable from "./components/DataTable";
import MobileFooter from "./components/MobileFooter";
import Header from "./components/Header";
import Login from "./components/Login";
import EditModal from "./components/EditModal";
import Toast from "./components/Toast";
import {
  fetchDataFromAppSheet,
  updateRowInSheet,
  deleteRowFromSheet,
  addRowToSheet,
} from "./utils/sheetsAPI";
import "./App.css";

// --- HÀM HELPER XỬ LÝ NGÀY THÁNG AN TOÀN ---
const parseSafeDate = (dateInput) => {
  if (!dateInput) return new Date();
  
  // Trường hợp là đối tượng Date sẵn
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) return dateInput;

  // Trường hợp chuỗi định dạng VN: dd/mm/yyyy
  if (typeof dateInput === 'string' && dateInput.includes('/')) {
    const parts = dateInput.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Trường hợp mặc định cho các định dạng chuẩn khác (ISO, YYYY-MM-DD)
  const finalDate = new Date(dateInput);
  return isNaN(finalDate.getTime()) ? new Date() : finalDate;
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("isLoggedIn") === "true";
  });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(() => window.innerWidth > 768 ? "all" : "dashboard");
  const [editingItem, setEditingItem] = useState(null);
  const [toast, setToast] = useState(null);

  const [filters, setFilters] = useState({
    loaiThuChi: "",
    nguoiCapNhat: "",
    doiTuongThuChi: "",
    startDate: "",
    endDate: "",
    searchText: "",
  });

  // --- 1. SỬA HÀM FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/data');
      const result = await response.json();

      if (response.ok && result.data) {
        const formattedData = result.data.slice(1).map((row, index) => ({
          id: `row_${index}`,
          // Sửa lỗi: Sử dụng parseSafeDate để tránh lỗi pattern từ chuỗi Google Sheets
          ngay: parseSafeDate(row[0]),
          loaiThuChi: row[1] || "Khác",
          noiDung: row[2] || "",
          soTien: parseInt((row[3] || "0").toString().replace(/\D/g, ''), 10) || 0,
          hinhAnh: row[4] || "",
          ghiChu: row[5] || "",
          nguoiCapNhat: row[6] || "Admin", 
          doiTuongThuChi: row[7] || ""
        }));
        
        setData(formattedData.reverse());
        setLoading(false);
      } else {
        throw new Error(result.error || "Không thể tải dữ liệu.");
      }
    } catch (err) {
      console.error("Fetch error details:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setActiveTab("all");
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const filterOptions = useMemo(() => ({
    loaiThuChi: [...new Set(data.map((item) => item.loaiThuChi).filter(Boolean))],
    nguoiCapNhat: [...new Set(data.map((item) => item.nguoiCapNhat).filter(Boolean))],
    doiTuongThuChi: [...new Set(data.map((item) => item.doiTuongThuChi).filter(Boolean))],
  }), [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filters.loaiThuChi && item.loaiThuChi !== filters.loaiThuChi) return false;
      if (filters.nguoiCapNhat && item.nguoiCapNhat !== filters.nguoiCapNhat) return false;
      if (filters.doiTuongThuChi && item.doiTuongThuChi !== filters.doiTuongThuChi) return false;
      
      // So sánh ngày an toàn
      if (filters.startDate && item.ngay < new Date(filters.startDate)) return false;
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (item.ngay > endDate) return false;
      }
      
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const content = item.noiDung?.toLowerCase() || "";
        const note = item.ghiChu?.toLowerCase() || "";
        if (!content.includes(searchLower) && !note.includes(searchLower)) return false;
      }
      return true;
    });
  }, [data, filters]);

  const stats = useMemo(() => {
    const tongChi = filteredData.reduce((sum, item) => sum + (Number(item.soTien) || 0), 0);
    return { tongThu: 0, tongChi, canDoi: -tongChi, soGiaoDich: filteredData.length };
  }, [filteredData]);

  const handleFilterChange = (name, value) => setFilters((prev) => ({ ...prev, [name]: value }));
  const resetFilters = () => setFilters({ loaiThuChi: "", nguoiCapNhat: "", doiTuongThuChi: "", startDate: "", endDate: "", searchText: "" });
  const handleLogin = () => setIsLoggedIn(true);
  const handleLogout = () => { localStorage.removeItem("isLoggedIn"); setIsLoggedIn(false); };
  const showToast = (message, type = "success") => setToast({ message, type });
  const handleEdit = (item) => setEditingItem(item);

  const handleSetup = async () => {
    if (!window.confirm("Cấu hình lại Google Sheet?")) return;
    setLoading(true);
    try {
      const response = await fetch('/api/setup-sheets', { method: 'POST' });
      if (response.ok) {
        showToast("Cấu hình thành công!", "success");
        fetchData();
      } else throw new Error("Lỗi setup");
    } catch (error) {
      showToast(error.message, "error");
    } finally { setLoading(false); }
  };

  const handleAddNew = () => {
    setEditingItem({
      ngay: new Date().toISOString().split("T")[0],
      soTien: "",
      noiDung: "",
      doiTuongThuChi: "",
      nguoiCapNhat: "",
      ghiChu: "",
      hinhAnh: ""
    });
  };

  // --- 2. SỬA HÀM SAVE EDIT (OPTIMISTIC UPDATE) ---
  const handleSaveEdit = async (updatedItem) => {
    try {
      let result;
      const appId = process.env.REACT_APP_APPSHEET_APP_ID;
      
      if (updatedItem.id && !updatedItem.id.startsWith('temp_')) {
        result = await updateRowInSheet(updatedItem, appId);
      } else {
        result = await addRowToSheet(updatedItem, appId);
      }

      if (result.success) {
        setData((prevData) => {
          // Chuẩn hóa dữ liệu với parseSafeDate để UI đồng nhất
          const newItem = {
            ...updatedItem,
            id: updatedItem.id || `temp_${Date.now()}`,
            ngay: parseSafeDate(updatedItem.ngay),
            soTien: Number(updatedItem.soTien || 0),
          };

          if (updatedItem.id && !updatedItem.id.startsWith('temp_')) {
            return prevData.map((item) => item.id === updatedItem.id ? newItem : item);
          } else {
            return [newItem, ...prevData];
          }
        });

        setEditingItem(null);
        showToast("Lưu thành công!", "success");
        fetchData(); // Sync lại dữ liệu chuẩn từ server
      } else {
        showToast(result.message || "Thất bại", "error");
      }
    } catch (error) {
      showToast("Có lỗi xảy ra", "error");
      console.error("Error saving:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Xóa giao dịch này?")) {
      try {
        const item = data.find(row => row.id === id);
        const result = await deleteRowFromSheet(id, item?.appSheetId, process.env.REACT_APP_APPSHEET_APP_ID);
        if (result.success) {
          fetchData();
          showToast("Xóa thành công!", "success");
        }
      } catch (error) {
        showToast("Lỗi khi xóa", "error");
      }
    }
  };

  if (!isLoggedIn) return <Login onLogin={handleLogin} />;

  return (
    <div className="app">
      <Header onRefresh={fetchData} loading={loading} onLogout={handleLogout} onAdd={handleAddNew} onSetup={handleSetup} />
      <main className="main-content">
        {error && (
          <div className="error-banner">
            <h3>⚠️ Đã xảy ra lỗi tải dữ liệu</h3>
            <p>{error}</p>
            <button onClick={handleSetup}>Tạo Sheet mẫu & Cấu hình</button>
          </div>
        )}
        {loading ? (
          <div className="loading-container"><div className="loading-spinner"></div></div>
        ) : (
          <>
            {(activeTab === "dashboard" || activeTab === "all") && <Dashboard stats={stats} data={filteredData} />}
            {(activeTab === "list" || activeTab === "all") && (
              <>
                <FilterBar filters={filters} filterOptions={filterOptions} onFilterChange={handleFilterChange} onReset={resetFilters} />
                <DataTable data={filteredData} onEdit={handleEdit} onDelete={handleDelete} />
              </>
            )}
          </>
        )}
      </main>
      <MobileFooter activeTab={activeTab} onTabChange={setActiveTab} />
      {editingItem && <EditModal item={editingItem} onClose={() => setEditingItem(null)} onSave={handleSaveEdit} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default App;
