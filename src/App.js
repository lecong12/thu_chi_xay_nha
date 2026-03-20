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
  const [data, setData] = useState([]); 
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

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAllData = async () => {
    if (!isLoggedIn || !APP_ID || !ACCESS_KEY) return;
    setLoading(true);
    setError(null);

    try {
      const tables = ["GiaoDich", "NganSach", "TienDo"];
      
      const [resGiaoDich, resNganSach, resTienDo] = await Promise.all(
        tables.map(async (tableName) => {
          const response = await fetch(
            `https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/${tableName}/Action`,
            {
              method: "POST",
              headers: {
                "ApplicationAccessKey": ACCESS_KEY,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ Action: "Find", Properties: { Locale: "vi-VN" }, Rows: [] }),
            }
          );
          if (!response.ok) return [];
          const resJson = await response.json();
          return Array.isArray(resJson) ? resJson : (resJson.Rows || []);
        })
      );

      // 1. Xử lý GiaoDich
      const cleanGiaoDich = resGiaoDich.map((row, index) => {
        const c = {};
        Object.keys(row).forEach(k => { c[normalizeKey(k)] = row[k]; });
        return {
          ...c,
          id: c.id || c.rownumber || `gd_${index}`,
          ngay: c.ngay ? new Date(c.ngay) : new Date(),
          sotien: Number(String(c.sotien || 0).replace(/\D/g, "")),
          loaithuchi: c.loaithuchi || "Chi"
        };
      });
      setData(cleanGiaoDich.reverse());

      // 2. Xử lý Ngân Sách (Quan trọng: Phải khớp key hangmuc, sotien)
      const cleanNganSach = resNganSach.map((row) => {
        const c = {};
        Object.keys(row).forEach(k => { c[normalizeKey(k)] = row[k]; });
        return {
          hangMuc: c.hangmuc || c.tenhangmuc || "Chưa đặt tên",
          soTien: Number(String(c.sotien || c.hanmuc || 0).replace(/\D/g, ""))
        };
      });
      setNganSach(cleanNganSach);

      // 3. Xử lý Tiến Độ (Quan trọng: Phải khớp key tencongviec, phantram)
      const cleanTienDo = resTienDo.map((row) => {
        const c = {};
        Object.keys(row).forEach(k => { c[normalizeKey(k)] = row[k]; });
        return {
          tenCongViec: c.tencongviec || c.hangmuc || "Hạng mục xây dựng",
          phanTram: Number(c.phantram || c.tiendo || 0)
        };
      });
      setTienDo(cleanTienDo);

      console.log("Data loaded:", { cleanGiaoDich, cleanNganSach, cleanTienDo });

    } catch (err) {
      setError("Lỗi nạp dữ liệu từ AppSheet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [isLoggedIn]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filters.loaiThuChi && item.loaithuchi !== filters.loaiThuChi) return false;
      if (filters.searchText) {
        const s = filters.searchText.toLowerCase();
        return item.noidung?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [data, filters]);

  const stats = useMemo(() => {
    const tongChi = filteredData.reduce((sum, item) => sum + (item.sotien || 0), 0);
    return { tongThu: 0, tongChi, soGiaoDich: filteredData.length };
  }, [filteredData]);

  if (!isLoggedIn) return <Login onLogin={() => { localStorage.setItem("isLoggedIn", "true"); setIsLoggedIn(true); }} />;

  return (
    <div className="app">
      <Header onRefresh={fetchAllData} loading={loading} onLogout={() => { localStorage.removeItem("isLoggedIn"); setIsLoggedIn(false); }} onAdd={() => setEditingItem({})} />
      <main className="main-content">
        {loading ? (
          <div className="loading-container"><p>Đang tải...</p></div>
        ) : (
          <>
            {(activeTab === "dashboard" || activeTab === "all") && (
              <Dashboard 
                stats={stats} 
                data={filteredData} 
                extraData={{ nganSach, tienDo }} // Đảm bảo biến này được truyền vào
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
