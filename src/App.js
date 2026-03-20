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

// Lấy biến môi trường (Ưu tiên REACT_APP_ cho Create React App)
const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;
const ACCESS_KEY = process.env.REACT_APP_APPSHEET_ACCESS_KEY;
const TABLE_NAME = process.env.REACT_APP_APPSHEET_TABLE_NAME || "GiaoDich";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem("isLoggedIn") === "true");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
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

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    setError(null);
    
    console.log("Đang gọi API với ID:", APP_ID); // Debug biến môi trường

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

      if (!response.ok) throw new Error(`Lỗi Server: ${response.status}`);

      const result = await response.json();
      console.log("Dữ liệu nhận được:", result);

      // AppSheet có thể trả về mảng trực tiếp hoặc { Rows: [...] }
      const rows = Array.isArray(result) ? result : (result.Rows || []);

      const formattedData = rows.map((row, index) => ({
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
    } catch (err) {
      console.error("Fetch Error:", err);
      setError("Không thể kết nối Backend. Hãy kiểm tra biến môi trường và tab Network.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isLoggedIn]);

  // Logic lọc dữ liệu an toàn (thêm optional chaining ?.)
  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.filter((item) => {
      if (filters.loaiThuChi && item.loaiThuChi !== filters.loaiThuChi) return false;
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        return (item.noiDung?.toLowerCase().includes(searchLower) || item.ghiChu?.toLowerCase().includes(searchLower));
      }
      return true;
    });
  }, [data, filters]);

  const stats = useMemo(() => {
    const tongChi = filteredData.reduce((sum, item) => sum + (Number(item.soTien) || 0), 0);
    return { tongThu: 0, tongChi, canDoi: -tongChi, soGiaoDich: filteredData.length };
  }, [filteredData]);

  const handleLogin = () => {
    localStorage.setItem("isLoggedIn", "true");
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) return <Login onLogin={handleLogin} />;

  return (
    <div className="app">
      <Header 
        onRefresh={fetchData} 
        loading={loading} 
        onLogout={handleLogout} 
        onAdd={() => setEditingItem({})} 
      />
      
      <main className="main-content">
        {error && (
          <div className="error-banner" style={{ color: 'red', padding: '20px', textAlign: 'center' }}>
            <p>⚠️ {error}</p>
            <button onClick={fetchData}>Thử lại</button>
          </div>
        )}

        {loading ? (
          <div className="loading-container" style={{ textAlign: 'center', padding: '50px' }}>
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : (
          <>
            {(activeTab === "dashboard" || activeTab === "all") && (
              <Dashboard stats={stats} data={filteredData} />
            )}
            {(activeTab === "list" || activeTab === "all") && (
              <>
                <FilterBar filters={filters} onFilterChange={(n, v) => setFilters({ ...filters, [n]: v })} />
                <DataTable data={filteredData} onEdit={setEditingItem} onDelete={() => {}} />
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
          onSave={() => { /* Implement save logic */ }} 
        />
      )}
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default App;
