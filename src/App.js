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
  const [data, setData] = useState([]); // Đây là bảng GiaoDich
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

  const normalizeKey = (str) => {
    if (!str) return "";
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/\s+/g, "");
  };

  const fetchAllData = async () => {
    if (!isLoggedIn || !APP_ID || !ACCESS_KEY) return;
    setLoading(true);
    setError(null);

    try {
      // Gọi 3 bảng song song
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
          if (!response.ok) return [];
          const resJson = await response.json();
          return Array.isArray(resJson) ? resJson : (resJson.Rows || []);
        })
      );

      // 1. Xử lý GiaoDich (Nguồn cho Top 5 và Biểu đồ)
      const cleanGD = resGD.map((row, index) => {
        const c = {};
        Object.keys(row).forEach(k => { c[normalizeKey(k)] = row[k]; });
        return {
          ...c,
          id: c.id || c.rownumber || `gd_${index}`,
          ngay: c.ngay ? new Date(c.ngay) : new Date(),
          sotien: Number(String(c.sotien || 0).replace(/\D/g, "")),
          loaithuchi: c.loaithuchi || "Khác", // Cột này dùng để phân loại Top 5
          noidung: c.noidung || ""
        };
      });
      setData(cleanGD.sort((a, b) => b.ngay - a.ngay));

      // 2. Xử lý Ngân Sách (Lấy từ sheet Ngansach)
      setNganSach(resNS.map(row => {
        const c = {};
        Object.keys(row).forEach(k => { c[normalizeKey(k)] = row[k]; });
        return { hangMuc: c.hangmuc || "Hạng mục", soTien: Number(String(c.sotien || 0).replace(/\D/g, "")) };
      }));

      // 3. Xử lý Tiến Độ (Lấy từ sheet TienDo)
      setTienDo(resTD.map(row => {
        const c = {};
        Object.keys(row).forEach(k => { c[normalizeKey(k)] = row[k]; });
        return { tenCongViec: c.tencongviec || "Công việc", phanTram: Number(c.phantram || 0) };
      }));

    } catch (err) {
      setError("Lỗi nạp dữ liệu. Hãy kiểm tra tên bảng và App ID.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [isLoggedIn]);

  // --- LOGIC XỬ LÝ DỮ LIỆU DASHBOARD ---
  const extraData = useMemo(() => {
    // TÍNH TOP 5 TỪ BẢNG GIAODICH
    const categoryMap = data.reduce((acc, item) => {
      const cat = item.loaithuchi;
      acc[cat] = (acc[cat] || 0) + item.sotien;
      return acc;
    }, {});

    const top5 = Object.entries(categoryMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // TÍNH BIỂU ĐỒ THEO THÁNG TỪ BẢNG GIAODICH
    const monthMap = data.reduce((acc, item) => {
      const m = `${item.ngay.getMonth() + 1}/${item.ngay.getFullYear()}`;
      acc[m] = (acc[m] || 0) + item.sotien;
      return acc;
    }, {});

    const chartData = Object.entries(monthMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
          const [m1, y1] = a.name.split('/');
          const [m2, y2] = b.name.split('/');
          return new Date(y1, m1-1) - new Date(y2, m2-1);
      });

    return { top5, chartData, nganSach, tienDo };
  }, [data, nganSach, tienDo]);

  const stats = useMemo(() => {
    const tongChi = data.reduce((sum, item) => sum + item.sotien, 0);
    return { tongThu: 0, tongChi, soGiaoDich: data.length };
  }, [data]);

  if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />;

  return (
    <div className="app">
      <Header onRefresh={fetchAllData} loading={loading} onLogout={() => setIsLoggedIn(false)} onAdd={() => setEditingItem({})} />
      <main className="main-content">
        {loading ? (
          <div className="loading-container"><p>Đang đồng bộ dữ liệu...</p></div>
        ) : (
          <>
            {(activeTab === "dashboard" || activeTab === "all") && (
              <Dashboard stats={stats} data={data} extraData={extraData} />
            )}
            {(activeTab === "list" || activeTab === "all") && (
              <DataTable data={data} onEdit={setEditingItem} onDelete={() => {}} />
            )}
          </>
        )}
      </main>
      <MobileFooter activeTab={activeTab} onTabChange={setActiveTab} />
      {editingItem && <EditModal item={editingItem} onClose={() => setEditingItem(null)} />}
      {toast && <Toast message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

export default App;
