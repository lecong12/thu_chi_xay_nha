import React, { useState, useEffect, useMemo, useCallback } from "react";
import Dashboard from "./components/Dashboard";
import FilterBar from "./components/FilterBar";
import DataTable from "./components/DataTable";
import MobileFooter from "./components/MobileFooter";
import Header from "./components/Header";
import Login from "./components/Login";
import EditModal from "./components/EditModal";
import Toast from "./components/Toast";
import "./App.css";

const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;
const ACCESS_KEY = process.env.REACT_APP_APPSHEET_ACCESS_KEY;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem("isLoggedIn") === "true");
  const [data, setData] = useState([]); // Dữ liệu GiaoDich chính
  const [nganSach, setNganSach] = useState([]); // Dữ liệu Ngân sách
  const [tienDo, setTienDo] = useState([]); // Dữ liệu Tiến độ
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

  // Hàm chuẩn hóa Key để khớp với mọi cách đặt tên cột trên Sheets
  const normalizeKey = (str) => {
    if (!str) return "";
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/\s+/g, "");
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Hàm gọi API khôi phục logic đổ dữ liệu trực tiếp
  const fetchAllData = async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    setError(null);

    try {
      // Danh sách các bảng cần lấy dữ liệu
      const tables = ["GiaoDich", "NganSach", "TienDo"];
      
      const results = await Promise.all(
        tables.map(async (tableName) => {
          const response = await fetch(
            `https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/${tableName}/Action`,
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
          if (!response.ok) return [];
          const resJson = await response.json();
          const rows = Array.isArray(resJson) ? resJson : (resJson.Rows || []);
          
          // Chuẩn hóa dữ liệu ngay khi đổ về
          return rows.map((row, index) => {
            const cleanRow = {};
            Object.keys(row).forEach((k) => { cleanRow[normalizeKey(k)] = row[k]; });
            return {
              ...cleanRow,
              // Ánh xạ các trường quan trọng cho GiaoDich
              id: cleanRow.id || cleanRow.rownumber || `row_${index}`,
              ngay: cleanRow.ngay ? new Date(cleanRow.ngay) : new Date(),
              sotien: Number(String(cleanRow.sotien || 0).replace(/\D/g, "")),
              noidung: cleanRow.noidung || "",
              loaithuchi: cleanRow.loaithuchi || "Chi"
            };
          });
        })
      );

      // Phân bổ dữ liệu về đúng các State
      setData(results[0].reverse()); // GiaoDich
      setNganSach(results[1]);       // NganSach
      setTienDo(results[2]);         // TienDo

    } catch (err) {
      console.error("Lỗi khôi phục dữ liệu:", err);
      setError("Không thể tải dữ liệu. Vui lòng kiểm tra lại kết nối AppSheet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [isLoggedIn]);

  // Logic lọc dữ liệu cho DataTable
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filters.loaiThuChi && item.loaithuchi !== filters.loaiThuChi) return false;
      if (filters.startDate && new Date(item.ngay) < new Date(filters.startDate)) return false;
      if (filters.searchText) {
        const s = filters.searchText.toLowerCase();
        return item.noidung?.toLowerCase().includes(s) || item.ghichu?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [data, filters]);

  const stats = useMemo(() => {
    const tongChi = filteredData.reduce((sum, item) => sum + (item.sotien || 0), 0);
    return { tongThu: 0, tongChi, canDoi: -tongChi, soGiaoDich: filteredData.length };
  }, [filteredData]);

  if (!isLoggedIn) return <Login onLogin={() => { localStorage.setItem("isLoggedIn", "true"); setIsLoggedIn(true); }} />;

  return (
    <div className="app">
      <Header onRefresh={fetchAllData} loading={loading} onLogout={() => { localStorage.removeItem("isLoggedIn"); setIsLoggedIn(false); }} onAdd={() => setEditingItem({})} />
      
      <main className="main-content">
        {error && <div className="error-banner">⚠️ {error}</div>}

        {loading ? (
          <div className="loading-container"><div className="loading-spinner"></div><p>Đang khôi phục dữ liệu...</p></div>
        ) : (
          <>
            {(activeTab === "dashboard" || activeTab === "all") && (
              <Dashboard 
                stats={stats} 
                data={filteredData} 
                extraData={{ nganSach, tienDo }} 
              />
            )}
            {(activeTab === "list" || activeTab === "all") && (
              <>
                <FilterBar filters={filters} onFilterChange={(n, v) => setFilters(prev => ({ ...prev, [n]: v }))} />
                <DataTable data={filteredData} onEdit={setEditingItem} onDelete={() => {}} />
              </>
            )}
          </>
        )}
      </main>

      <MobileFooter activeTab={activeTab} onTabChange={setActiveTab} />
      {editingItem && <EditModal item={editingItem} onClose={() => setEditingItem(null)} onSave={() => {}} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default App;
