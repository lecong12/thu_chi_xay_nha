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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(() => (window.innerWidth > 768 ? "all" : "dashboard"));
  const [toast, setToast] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  // --- DỮ LIỆU CÁC NHÓM (GROUPS) ---
  const [dataGiaoDich, setDataGiaoDich] = useState([]);
  const [dataNganSach, setDataNganSach] = useState([]);
  const [dataTienDo, setDataTienDo] = useState([]);

  const [filters, setFilters] = useState({
    loaiThuChi: "",
    nguoiCapNhat: "",
    doiTuongThuChi: "",
    startDate: "",
    endDate: "",
    searchText: "",
  });

  // Hàm chuẩn hóa Key để không sợ sai tên cột trên Excel/Sheets
  const normalizeKey = useCallback((str) => {
    if (!str) return "";
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/\s+/g, "");
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Hàm gọi API tổng quát cho mọi bảng
  const fetchTableData = useCallback(async (tableName) => {
    try {
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
      const result = await response.json();
      const rows = Array.isArray(result) ? result : (result.Rows || []);

      // Chuẩn hóa dữ liệu từng hàng
      return rows.map((row) => {
        const cleanRow = {};
        Object.keys(row).forEach((k) => {
          cleanRow[normalizeKey(k)] = row[k];
        });
        return cleanRow;
      });
    } catch (err) {
      console.error(`Lỗi bảng ${tableName}:`, err);
      return [];
    }
  }, [normalizeKey]);

  // HÀM TẢI DỮ LIỆU TỔNG HỢP (LOAD ALL GROUPS)
  const loadAllAppData = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    setError(null);

    try {
      // Gọi song song để tốc độ nhanh gấp 3 lần
      const [giaoDich, nganSach, tienDo] = await Promise.all([
        fetchTableData("GiaoDich"),
        fetchTableData("NganSach"),
        fetchTableData("TienDo")
      ]);

      setDataGiaoDich(giaoDich.reverse());
      setDataNganSach(nganSach);
      setDataTienDo(tienDo);
      
      console.log("Đã cập nhật dữ liệu từ 3 nhóm thành công.");
    } catch (err) {
      setError("Lỗi kết nối AppSheet. Vui lòng kiểm tra lại mạng.");
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, fetchTableData]);

  useEffect(() => {
    loadAllAppData();
  }, [loadAllAppData]);

  // Logic lọc cho bảng chính GiaoDich
  const filteredGiaoDich = useMemo(() => {
    return dataGiaoDich.filter((item) => {
      if (filters.loaiThuChi && item.loaithuchi !== filters.loaiThuChi) return false;
      if (filters.startDate && new Date(item.ngay) < new Date(filters.startDate)) return false;
      if (filters.searchText) {
        const s = filters.searchText.toLowerCase();
        return (item.noidung?.toLowerCase().includes(s) || item.ghichu?.toLowerCase().includes(s));
      }
      return true;
    });
  }, [dataGiaoDich, filters]);

  const stats = useMemo(() => {
    const tongChi = filteredGiaoDich.reduce((sum, item) => sum + (Number(item.sotien) || 0), 0);
    return { tongThu: 0, tongChi, canDoi: -tongChi, soGiaoDich: filteredGiaoDich.length };
  }, [filteredGiaoDich]);

  if (!isLoggedIn) return <Login onLogin={() => { localStorage.setItem("isLoggedIn", "true"); setIsLoggedIn(true); }} />;

  return (
    <div className="app">
      <Header onRefresh={loadAllAppData} loading={loading} onLogout={() => { localStorage.removeItem("isLoggedIn"); setIsLoggedIn(false); }} onAdd={() => setEditingItem({})} />
      
      <main className="main-content">
        {error && <div className="error-banner">⚠️ {error}</div>}

        {loading ? (
          <div className="loading-container"><div className="loading-spinner"></div><p>Đang tải dữ liệu...</p></div>
        ) : (
          <>
            {(activeTab === "dashboard" || activeTab === "all") && (
              <Dashboard 
                stats={stats} 
                data={filteredGiaoDich}
                // CHÚ Ý: Truyền dữ liệu Ngân Sách và Tiến Độ vào đây
                extraData={{ nganSach: dataNganSach, tienDo: dataTienDo }} 
              />
            )}

            {(activeTab === "list" || activeTab === "all") && (
              <>
                <FilterBar filters={filters} onFilterChange={(n, v) => setFilters(prev => ({ ...prev, [n]: v }))} />
                <DataTable data={filteredGiaoDich} onEdit={setEditingItem} onDelete={() => {}} />
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
