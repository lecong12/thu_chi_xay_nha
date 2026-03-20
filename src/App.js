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
  const [data, setData] = useState([]); // Giao dịch
  const [nganSach, setNganSach] = useState([]); 
  const [tienDo, setTienDo] = useState([]); 
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

  // Hàm chuẩn hóa Key để khớp với Sheets (Xóa dấu, khoảng cách, viết thường)
  const normalizeKey = (str) => {
    if (!str) return "";
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/\s+/g, "");
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAllData = async () => {
    if (!isLoggedIn || !APP_ID || !ACCESS_KEY) return;
    setLoading(true);
    setError(null);

    try {
      // Gọi chính xác 3 bảng bạn đã đổi tên
      const tables = ["GiaoDich", "Ngansach", "TienDo"];
      
      const [resGD, resNS, resTD] = await Promise.all(
        tables.map(async (tableName) => {
          const response = await fetch(
            `https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/${tableName}/Action`,
            {
              method: "POST",
              headers: { "ApplicationAccessKey": ACCESS_KEY, "Content-Type": "application/json" },
              body: JSON.stringify({ Action: "Find", Properties: { Locale: "vi-VN" }, Rows: [] }),
            }
          );
          if (!response.ok) throw new Error(`Lỗi bảng ${tableName}`);
          const resJson = await response.json();
          return Array.isArray(resJson) ? resJson : (resJson.Rows || []);
        })
      );

      // 1. Xử lý dữ liệu GiaoDich
      const cleanGD = resGD.map((row, index) => {
        const c = {};
        Object.keys(row).forEach(k => { c[normalizeKey(k)] = row[k]; });
        return {
          ...c,
          id: c.id || c.rownumber || `gd_${index}`,
          ngay: c.ngay ? new Date(c.ngay) : new Date(),
          sotien: Number(String(c.sotien || 0).replace(/\D/g, "")),
          loaithuchi: c.loaithuchi || "Khác",
          noidung: c.noidung || ""
        };
      });
      setData(cleanGD.reverse());

      // 2. Xử lý Ngân Sách
      setNganSach(resNS.map(row => {
        const c = {};
        Object.keys(row).forEach(k => { c[normalizeKey(k)] = row[k]; });
        return { hangMuc: c.hangmuc || "Hạng mục", soTien: Number(String(c.sotien || 0).replace(/\D/g, "")) };
      }));

      // 3. Xử lý Tiến Độ
      setTienDo(resTD.map(row => {
        const c = {};
        Object.keys(row).forEach(k => { c[normalizeKey(k)] = row[k]; });
        return { tenCongViec: c.tencongviec || "Công việc", phanTram: Number(c.phantram || 0) };
      }));

    } catch (err) {
      console.error(err);
      setError("Không thể tải dữ liệu. Hãy đảm bảo đã bấm 'Save' và 'Regenerate' trên AppSheet Editor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [isLoggedIn]);

  // --- LOGIC TÍNH TOÁN CHO DASHBOARD ---
  const extraData = useMemo(() => {
    // 1. Tính Top 5 chi tiêu nhiều nhất (Gom theo loại)
    const categoryTotals = data.reduce((acc, item) => {
      const cat = item.loaithuchi;
      acc[cat] = (acc[cat] || 0) + item.sotien;
      return acc;
    }, {});

    const top5 = Object.entries(categoryTotals)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 2. Tính chi phí theo tháng (Giai đoạn)
    const monthlyTotals = data.reduce((acc, item) => {
      const month = `${item.ngay.getMonth() + 1}/${item.ngay.getFullYear()}`;
      acc[month] = (acc[month] || 0) + item.sotien;
      return acc;
    }, {});

    const chartData = Object.entries(monthlyTotals).map(([name, value]) => ({ name, value }));

    return { top5, chartData, nganSach, tienDo };
  }, [data, nganSach, tienDo]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filters.loaiThuChi && item.loaithuchi !== filters.loaiThuChi) return false;
      if (filters.searchText) return item.noidung?.toLowerCase().includes(filters.searchText.toLowerCase());
      return true;
    });
  }, [data, filters]);

  const stats = useMemo(() => {
    const tongChi = filteredData.reduce((sum, item) => sum + item.sotien, 0);
    return { tongThu: 0, tongChi, soGiaoDich: filteredData.length };
  }, [filteredData]);

  if (!isLoggedIn) return <Login onLogin={() => { localStorage.setItem("isLoggedIn", "true"); setIsLoggedIn(true); }} />;

  return (
    <div className="app">
      <Header onRefresh={fetchAllData} loading={loading} onLogout={() => { localStorage.removeItem("isLoggedIn"); setIsLoggedIn(false); }} onAdd={() => setEditingItem({})} />
      <main className="main-content">
        {error && <div className="error-banner">⚠️ {error} <button onClick={fetchAllData}>Thử lại</button></div>}
        {loading ? (
          <div className="loading-container"><p>Đang đồng bộ dữ liệu...</p></div>
        ) : (
          <>
            {(activeTab === "dashboard" || activeTab === "all") && (
              <Dashboard stats={stats} data={filteredData} extraData={extraData} />
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
