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

// Lấy biến môi trường từ Vercel
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

  // HÀM CHUẨN HÓA TIẾNG VIỆT: Xóa dấu, xóa khoảng trắng, chuyển chữ thường
  const normalizeKey = (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Xóa dấu
      .replace(/đ/g, "d")
      .replace(/\s+/g, ""); // Xóa khoảng trắng
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    if (!isLoggedIn) return;
    if (!APP_ID || !ACCESS_KEY) {
      setError("Thiếu cấu hình REACT_APP_APPSHEET_APP_ID hoặc ACCESS_KEY trên Vercel.");
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

      if (!response.ok) throw new Error(`Lỗi kết nối Server: ${response.status}`);

      const result = await response.json();
      const rows = Array.isArray(result) ? result : (result.Rows || []);

      const formattedData = rows.map((row, index) => {
        // Tạo một object mới đã chuẩn hóa tất cả các Keys từ AppSheet
        const cleanRow = {};
        Object.keys(row).forEach((k) => {
          cleanRow[normalizeKey(k)] = row[k];
        });

        // Ánh xạ dữ liệu dựa trên các key đã chuẩn hóa
        return {
          id: cleanRow.id || cleanRow.rownumber || `row_${index}`,
          ngay: cleanRow.ngay ? new Date(cleanRow.ngay) : new Date(),
          loaiThuChi: cleanRow.loaithuchi || "Chi",
          noiDung: cleanRow.noidung || "",
          soTien: Number(String(cleanRow.sotien || 0).replace(/\D/g, "")),
          hinhAnh: cleanRow.hinhanh || "",
          ghiChu: cleanRow.ghichu || "",
          nguoiCapNhat: cleanRow.nguoicapnhat || "Admin",
          doiTuongThuChi: cleanRow.doituongthuchi || "",
        };
      });

      setData(formattedData.reverse());
    } catch (err) {
      console.error("Fetch Error:", err);
      setError("Không thể tải dữ liệu. Hãy kiểm tra tên bảng và kết nối API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isLoggedIn]);

  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.filter((item) => {
      if (filters.loaiThuChi && item.loaiThuChi !== filters.loaiThuChi) return false;
      if (filters.startDate && new Date(item.ngay) < new Date(filters.startDate)) return false;
      if (filters.searchText) {
        const s = filters.searchText.toLowerCase();
        return item.noiDung?.toLowerCase().includes(s) || item.ghiChu?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [data, filters]);

  const stats = useMemo(() => {
    const tongChi = filteredData.reduce((sum, item) => sum + (item.soTien || 0), 0);
    return { tongThu: 0, tongChi, canDoi: -tongChi, soGiaoDich: filteredData.length };
  }, [filteredData]);

  if (!isLoggedIn) return <Login onLogin={() => { localStorage.setItem("isLoggedIn", "true"); setIsLoggedIn(true); }} />;

  return (
    <div className="app">
      <Header onRefresh={fetchData} loading={loading} onLogout={() => { localStorage.removeItem("isLoggedIn"); setIsLoggedIn(false); }} onAdd={() => setEditingItem({})} />
      <main className="main-content">
        {error && (
          <div className="error-banner" style={{ color: 'red', textAlign: 'center', padding: '20px' }}>
            <p>⚠️ {error}</p>
            <button onClick={fetchData}>Thử lại</button>
          </div>
        )}
        {loading ? (
          <div className="loading-container" style={{ textAlign: 'center', padding: '50px' }}>
            <div className="loading-spinner"></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : (
          <>
            {(activeTab === "dashboard" || activeTab === "all") && <Dashboard stats={stats} data={filteredData} />}
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
      {editingItem && <EditModal item={editingItem} onClose={() => setEditingItem(null)} onSave={() => {}} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default App;
