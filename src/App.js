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
      const result = await fetchDataFromAppSheet();

      if (result.success && result.data) {
        const parsedData = result.data.map((row, index) => {
          // Create unique ID combining original ID and index
          const uniqueId = row.id
            ? `${row.id}_${index}`
            : `row_${Date.now()}_${index}`;

          return {
            ...row,
            id: uniqueId,
            originalId: row.originalId || row.id,
          };
        });

        // Apply local changes
        const mergedData = parsedData
          .filter((item) => !localChanges.deleted.includes(item.id))
          .map((item) =>
            localChanges.edited[item.id]
              ? {
                  ...item,
                  ...localChanges.edited[item.id],
                  ngay: new Date(localChanges.edited[item.id].ngay),
                }
              : item
          );

        setData(mergedData);
        setLoading(false);
      } else {
        throw new Error(result.message || "Không thể tải dữ liệu");
      }
    } catch (err) {
      setError("Lỗi tải dữ liệu: " + err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
      .filter((item) => item.loaiThuChi === "Thu")
      .reduce((sum, item) => sum + item.soTien, 0);

    const tongChi = filteredData
      .filter((item) => item.loaiThuChi === "Chi")
      .reduce((sum, item) => sum + item.soTien, 0);

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
      const result = await updateRowInSheet(updatedItem);

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
        const result = await deleteRowFromSheet(id);

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
