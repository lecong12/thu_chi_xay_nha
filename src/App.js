import React, { useState, useEffect, useMemo } from "react";
import Dashboard from "./components/Dashboard";
import FilterBar from "./components/FilterBar";
import DataTable from "./components/DataTable";
import MobileFooter from "./components/MobileFooter";
import Header from "./components/Header";
import Login from "./components/Login";
import EditModal from "./components/EditModal";
import Toast from "./components/Toast";
import "./App.css";

// Lấy biến môi trường từ Vercel (Phải có tiền tố REACT_APP_)
const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;
const ACCESS_KEY = process.env.REACT_APP_APPSHEET_ACCESS_KEY;
const TABLE_NAME = process.env.REACT_APP_APPSHEET_TABLE_NAME || "GiaoDich";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("isLoggedIn") === "true";
  });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(() => (window.innerWidth > 768 ? "all" : "dashboard"));
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

  // Hàm gọi API trực tiếp từ AppSheet
  const fetchData = async () => {
    if (!APP_ID || !ACCESS_KEY) {
      setError("Thiếu cấu hình biến môi trường (APP_ID hoặc ACCESS_KEY). Hãy kiểm tra lại Vercel.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/${TABLE_NAME}/Action`,
        {
          method: "POST",
          headers: {
            "ApplicationAccessKey": ACCESS_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Action: "Find",
            Properties: { Locale: "vi-VN" },
            Rows: [],
          }),
        }
      );

      // Kiểm tra an toàn trước khi đọc headers
      if (!response || !response.ok) {
        throw new Error(`Lỗi kết nối AppSheet: ${response?.status || "Unknown"}`);
      }

      const result = await response.json();
      
      // AppSheet trả về mảng trong result (thường là trực tiếp mảng các Object)
      if (Array.isArray(result)) {
        const formattedData = result.map((row, index) => ({
          id: row.id || row._RowNumber || `row_${index}`,
          ngay: row.Ngay ? new Date(row.Ngay) : new Date(),
          loaiThuChi: row.LoaiThuChi || "Chi",
          noiDung: row.NoiDung || "",
          soTien: Number(row.SoTien || 0),
          hinhAnh: row.HinhAnh || "",
          ghiChu: row.GhiChu || "",
          nguoiCapNhat: row.NguoiCapNhat || "Admin",
          doiTuongThuChi: row.DoiTuongThuChi || "",
        }));

        setData(formattedData.reverse());
      } else {
        setData([]);
      }
    } catch (err) {
      console.error("Fetch error details:", err);
      setError(err.message || "Không thể kết nối với Backend AppSheet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) fetchData();
  }, [isLoggedIn]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setActiveTab("all");
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const stats = useMemo(() => {
    const tongChi = filteredData.reduce((sum, item) => sum + (item.soTien || 0), 0);
    return { tongThu: 0, tongChi, canDoi: -tongChi, soGiaoDich: filteredData.length };
  }, [data, filters]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filters.loaiThuChi && item.loaiThuChi !== filters.loaiThuChi) return false;
      if (filters.startDate && new Date(item.ngay) < new Date(filters.startDate)) return false;
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        return item.noiDung?.toLowerCase().includes(searchLower) || item.ghiChu?.toLowerCase().includes(searchLower);
      }
      return true;
    });
  }, [data, filters]);

  const handleSaveEdit = async (updatedItem) => {
    try {
      const isEdit = !!updatedItem.id && !String(updatedItem.id).startsWith("row_");
      const action = isEdit ? "Edit" : "Add";

      const response = await fetch(
        `https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/${TABLE_NAME}/Action`,
        {
          method: "POST",
          headers: {
            "ApplicationAccessKey": ACCESS_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Action: action,
            Properties: { Locale: "vi-VN" },
            Rows: [
              {
                ...updatedItem,
                Ngay: updatedItem.ngay,
                SoTien: updatedItem.soTien,
                NoiDung: updatedItem.noiDung,
              },
            ],
          }),
        }
      );

      if (response.ok) {
        showToast(isEdit ? "Cập nhật thành công!" : "Thêm mới thành công!");
        setEditingItem(null);
        fetchData();
      } else {
        showToast("Lỗi lưu dữ liệu", "error");
      }
    } catch (error) {
      showToast("Có lỗi xảy ra", "error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />;

  return (
    <div className="app">
      <Header onRefresh={fetchData} loading={loading} onLogout={handleLogout} onAdd={() => setEditingItem({})} />
      <main className="main-content">
        {error && (
          <div className="error-banner">
            <h3>⚠️ Lỗi: {error}</h3>
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
            {(activeTab === "dashboard" || activeTab === "all") && <Dashboard stats={stats} data={filteredData} />}
            {(activeTab === "list" || activeTab === "all") && (
              <>
                <FilterBar filters={filters} onFilterChange={(n, v) => setFilters({ ...filters, [n]: v })} />
                <DataTable data={filteredData} onEdit={setEditingItem} onDelete={fetchData} />
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
