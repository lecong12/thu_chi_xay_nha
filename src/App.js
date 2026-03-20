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

// Cấu hình từ Vercel
const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;
const ACCESS_KEY = process.env.REACT_APP_APPSHEET_ACCESS_KEY;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem("isLoggedIn") === "true");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(() => (window.innerWidth > 768 ? "all" : "dashboard"));
  const [toast, setToast] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  // State lưu trữ dữ liệu từ nhiều Sheet khác nhau
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

  // 1. HÀM CHUẨN HÓA KEY (Dùng chung cho tất cả các Sheet)
  const normalizeKey = useCallback((str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/\s+/g, "");
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 2. HÀM GỌI API DÙNG CHUNG CHO MỌI TABLE
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

      // Chuẩn hóa toàn bộ hàng dữ liệu
      return rows.map((row, index) => {
        const cleanRow = {};
        Object.keys(row).forEach((k) => {
          cleanRow[normalizeKey(k)] = row[k];
        });
        return { ...cleanRow, _original: row, tempId: `id_${tableName}_${index}` };
      });
    } catch (err) {
      console.error(`Lỗi tải bảng ${tableName}:`, err);
      return [];
    }
  }, [normalizeKey]);

  // 3. TẢI TẤT CẢ DỮ LIỆU KHI KHỞI CHẠY
  const loadAllData = useCallback(async () => {
    if (!isLoggedIn || !APP_ID || !ACCESS_KEY) return;
    setLoading(true);
    setError(null);

    try {
      // Chạy song song 3 bảng để tối ưu tốc độ nạp web
      const [giaoDich, nganSach, tienDo] = await Promise.all([
        fetchTableData("GiaoDich"),
        fetchTableData("NganSach"),
        fetchTableData("TienDo")
      ]);

      setDataGiaoDich(giaoDich.reverse());
      setDataNganSach(nganSach);
      setDataTienDo(tienDo);
    } catch (err) {
      setError("Không thể đồng bộ dữ liệu từ AppSheet.");
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, fetchTableData]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // 4. LOGIC LỌC DỮ LIỆU (Áp dụng cho bảng GiaoDich hiển thị chính)
  const filteredGiaoDich = useMemo(() => {
    return dataGiaoDich.filter((item) => {
      // Lưu ý: Key ở đây dùng tên đã chuẩn hóa (noidung, loaithuchi...)
      if (filters.loaiThuChi && item.loaithuchi !== filters.loaiThuChi) return false;
      if (filters.startDate && new Date(item.ngay) < new Date(filters.startDate)) return false;
      if (filters.searchText) {
        const s = filters.searchText.toLowerCase();
        return (item.noidung?.toLowerCase().includes(s) || item.ghichu?.toLowerCase().includes(s));
      }
      return true;
    });
  }, [dataGiaoDich, filters]);

  // 5. THỐNG KÊ (Dùng cho Dashboard)
  const stats = useMemo(() => {
    const tongChi = filteredGiaoDich.reduce((sum, item) => sum + (Number(item.sotien) || 0), 0);
    const soGiaoDich = filteredGiaoDich.length;
    return { tongThu: 0, tongChi, canDoi: -tongChi, soGiaoDich };
  }, [filteredGiaoDich]);

  // 6. XỬ LÝ ĐĂNG NHẬP / ĐĂNG XUẤT
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
        onRefresh={loadAllData} 
        loading={loading} 
        onLogout={handleLogout} 
        onAdd={() => setEditingItem({})} 
      />

      <main className="main-content">
        {error && (
          <div className="error-banner">
            <p>⚠️ {error}</p>
            <button onClick={loadAllData}>Tải lại trang</button>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Đang đồng bộ dữ liệu đa bảng...</p>
          </div>
        ) : (
          <>
            {/* TAB DASHBOARD: Hiển thị thống kê và có thể thêm biểu đồ Ngân sách/Tiến độ */}
            {(activeTab === "dashboard" || activeTab === "all") && (
              <Dashboard 
                stats={stats} 
                data={filteredGiaoDich}
                extraData={{ nganSach: dataNganSach, tienDo: dataTienDo }} // Truyền thêm dữ liệu bảng khác vào đây
              />
            )}

            {/* TAB DANH SÁCH: Hiển thị bảng GiaoDich */}
            {(activeTab === "list" || activeTab === "all") && (
              <>
                <FilterBar 
                  filters={filters} 
                  onFilterChange={(n, v) => setFilters(prev => ({ ...prev, [n]: v }))} 
                />
                <DataTable 
                  data={filteredGiaoDich} 
                  onEdit={setEditingItem} 
                  onDelete={() => {}} 
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
          onSave={() => showToast("Chức năng đang được cập nhật", "info")} 
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default App;
