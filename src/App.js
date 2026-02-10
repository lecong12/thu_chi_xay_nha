import React, { useState, useEffect, useMemo, useRef } from "react";
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
} from "./utils/sheetsAPI";
import "./App.css";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("isLoggedIn") === "true";
  });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [editingItem, setEditingItem] = useState(null);
  const [toast, setToast] = useState(null);
  const hasFetched = useRef(false);

  // Filter states
  const [filters, setFilters] = useState({
    loaiThuChi: "",
    nguoiCapNhat: "",
    doiTuongThuChi: "",
    startDate: "",
    endDate: "",
    searchText: "",
  });

  // Fetch data from AppSheet
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDataFromAppSheet(process.env.REACT_APP_SHEET_ID);

      if (result.success && result.data) {
        setData(result.data);
        setLoading(false);
      } else {
        throw new Error(result.message || "Không thể tải dữ liệu");
      }
    } catch (err) {
      console.error("Fetch error details:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get unique values for filter dropdowns
  const filterOptions = useMemo(
    () => ({
      loaiThuChi: [
        ...new Set(data.map((item) => item.loaiThuChi).filter(Boolean)),
      ],
      nguoiCapNhat: [
        ...new Set(data.map((item) => item.nguoiCapNhat).filter(Boolean)),
      ],
      doiTuongThuChi: [
        ...new Set(data.map((item) => item.doiTuongThuChi).filter(Boolean)),
      ],
    }),
    [data]
  );

  // Filtered data
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filters.loaiThuChi && item.loaiThuChi !== filters.loaiThuChi)
        return false;
      if (filters.nguoiCapNhat && item.nguoiCapNhat !== filters.nguoiCapNhat)
        return false;
      if (
        filters.doiTuongThuChi &&
        item.doiTuongThuChi !== filters.doiTuongThuChi
      )
        return false;

      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        if (item.ngay < startDate) return false;
      }

      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (item.ngay > endDate) return false;
      }

      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const matchFields = [
          item.noiDung,
          item.ghiChu,
          item.nguoiCapNhat,
          item.doiTuongThuChi,
        ];
        if (
          !matchFields.some((field) =>
            field?.toLowerCase().includes(searchLower)
          )
        )
          return false;
      }

      return true;
    });
  }, [data, filters]);

  // Calculate statistics
  const stats = useMemo(() => {
    const tongThu = filteredData
      .filter((item) => item.loaiThuChi?.trim().toLowerCase() === "thu")
      .reduce((sum, item) => sum + (Number(item.soTien) || 0), 0);

    const tongChi = filteredData
      .filter((item) => item.loaiThuChi?.trim().toLowerCase() === "chi")
      .reduce((sum, item) => sum + (Number(item.soTien) || 0), 0);

    return {
      tongThu,
      tongChi,
      canDoi: tongThu - tongChi,
      soGiaoDich: filteredData.length,
    };
  }, [filteredData]);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      loaiThuChi: "",
      nguoiCapNhat: "",
      doiTuongThuChi: "",
      startDate: "",
      endDate: "",
      searchText: "",
    });
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    setIsLoggedIn(false);
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const handleEdit = (item) => {
    setEditingItem(item);
  };

  const handleSaveEdit = async (updatedItem) => {
    try {
      const result = await updateRowInSheet(updatedItem, process.env.REACT_APP_SHEET_ID);

      if (result.success) {
        // Refresh data from AppSheet to ensure consistency
        await fetchData();
        setEditingItem(null);
        showToast(result.message || "Cập nhật thành công!", "success");
      } else {
        showToast(result.message || "Cập nhật thất bại", "error");
      }
    } catch (error) {
      showToast("Có lỗi xảy ra khi cập nhật", "error");
      console.error("Error saving edit:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa giao dịch này?")) {
      try {
        // Find the item to get appSheetId
        const item = data.find(row => row.id === id);
        const result = await deleteRowFromSheet(id, item?.appSheetId, process.env.REACT_APP_SHEET_ID);

        if (result.success) {
          // Refresh data from AppSheet to ensure consistency
          await fetchData();
          showToast(result.message || "Xóa thành công!", "success");
        } else {
          showToast(result.message || "Xóa thất bại", "error");
        }
      } catch (error) {
        showToast("Có lỗi xảy ra khi xóa", "error");
        console.error("Error deleting:", error);
      }
    }
  };

  // Show login page if not logged in
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <Header onRefresh={fetchData} loading={loading} onLogout={handleLogout} />

      <main className="main-content">
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={fetchData}>Thử lại</button>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : (
          <>
            {(activeTab === "dashboard" || activeTab === "all") && (
              <Dashboard stats={stats} data={filteredData} />
            )}

            {(activeTab === "list" || activeTab === "all") && (
              <>
                <FilterBar
                  filters={filters}
                  filterOptions={filterOptions}
                  onFilterChange={handleFilterChange}
                  onReset={resetFilters}
                />
                <DataTable
                  data={filteredData}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </>
            )}
          </>
        )}
      </main>

      <MobileFooter activeTab={activeTab} onTabChange={setActiveTab} />

      {editingItem && (
        <EditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveEdit}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;
