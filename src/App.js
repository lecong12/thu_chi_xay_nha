import React, { useState, useEffect, useMemo, useCallback } from "react";
import Dashboard from "./components/Dashboard";
import FilterBar from "./components/FilterBar";
import DataTable from "./components/DataTable";
import MobileFooter from "./components/MobileFooter";
import Header from "./components/Header";
import Login from "./components/Login";
import EditModal from "./components/EditModal";
import Toast from "./components/Toast";
import { updateStageInSheet } from "./utils/stagesAPI";
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
    if (!str) return '';
    const s = str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").trim();
    
    if (s.includes("row number")) return "rowNumber";
    if (s.includes("ngay bat dau")) return "ngayBatDau";
    if (s.includes("ngay ket thuc")) return "ngayKetThuc";
    if (s.includes("anh nghiem thu")) return "anhNghiemThu";
    if (s.includes("ten cong viec") || s.includes("giai doan")) return "name";
    if (s.includes("trang thai")) return "status";
    if (s.includes("hang muc")) return "hangMuc";
    if (s.includes("du kien")) return "duKien";
    if (s.includes("thuc te")) return "thucTe";
    if (s.includes("con lai")) return "conLai";
    if (s.includes("tinh trang")) return "tinhTrang";
    if (s.includes("loai thu chi")) return "loaiThuChi";
    if (s.includes("nguoi cap nhat")) return "nguoiCapNhat";
    if (s.includes("doi tuong thu chi")) return "doiTuongThuChi";
    if (s.includes("so tien")) return "soTien";
    if (s.includes("noi dung")) return "noiDung";
    if (s.includes("ghi chu")) return "ghiChu";
    if (s.includes("hinh anh") || s.includes("minh chung")) return "hinhAnh";
    // Fallback for single words like 'id', 'ngay'
    return s.replace(/\s+/g, '');
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

      // 1. Xử lý GiaoDich
      const cleanGD = resGD.map((row, index) => {
        const c = {};
        Object.keys(row).forEach(k => { c[normalizeKey(k)] = row[k]; });
        return {
          id: c.id || c.rowNumber || `gd_${index}`,
          appSheetId: c.id || c.rowNumber,
          ngay: c.ngay ? new Date(c.ngay) : new Date(),
          soTien: Number(String(c.soTien || 0).replace(/\D/g, "")),
          loaiThuChi: c.loaiThuChi || "Chi",
          noiDung: c.noiDung || "",
          doiTuongThuChi: c.doiTuongThuChi || "Khác",
          nguoiCapNhat: c.nguoiCapNhat || "",
          ghiChu: c.ghiChu || "",
          hinhAnh: c.hinhAnh || "",
        };
      });
      setData(cleanGD.sort((a, b) => b.ngay - a.ngay));

      // 2. Xử lý Ngân Sách
      const cleanNS = resNS.map(row => {
        const c = {};
        Object.keys(row).forEach(k => { c[normalizeKey(k)] = row[k]; });
        return { 
          hangMuc: c.hangMuc || "Hạng mục", 
          duKien: Number(String(c.duKien || 0).replace(/\D/g, "")),
          thucTe: Number(String(c.thucTe || 0).replace(/\D/g, "")),
          conLai: c.conLai, // Giữ nguyên giá trị có thể âm
          tinhTrang: c.tinhTrang || ""
        };
      });
      setNganSach(cleanNS);

      // 3. Xử lý Tiến Độ
      const cleanTD = resTD.map((row, index) => {
        const c = {};
        Object.keys(row).forEach(k => { c[normalizeKey(k)] = row[k]; });
        return { 
          id: c.id || c.rowNumber || `td_${index}`,
          name: c.name || "Công việc", 
          status: c.status || "Chưa bắt đầu",
          ngayBatDau: c.ngayBatDau ? new Date(c.ngayBatDau) : null,
          ngayKetThuc: c.ngayKetThuc ? new Date(c.ngayKetThuc) : null,
        };
      });
      setTienDo(cleanTD);

    } catch (err) {
      setError("Lỗi nạp dữ liệu. Hãy kiểm tra tên bảng và App ID.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [isLoggedIn]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const handleUpdateStageStatus = async (stageId, newStatus) => {
    const originalTienDo = [...tienDo];
    const stageToUpdate = tienDo.find(s => s.id === stageId);

    if (!stageToUpdate) return;

    // Optimistic UI update
    const newTienDo = tienDo.map((s) =>
      s.id === stageId ? { ...s, status: newStatus } : s
    );
    setTienDo(newTienDo);

    // Call API
    const result = await updateStageInSheet({ ...stageToUpdate, status: newStatus }, APP_ID);

    if (!result.success) {
      setTienDo(originalTienDo); // Revert on failure
      showToast(result.message || "Lỗi khi cập nhật trạng thái.", "error");
    }
  };

  // --- LOGIC XỬ LÝ DỮ LIỆU DASHBOARD ---
  const extraData = useMemo(() => {
    const categoryMap = data.reduce((acc, item) => {
      const cat = item.doiTuongThuChi;
      acc[cat] = (acc[cat] || 0) + item.soTien;
      return acc;
    }, {});

    const top5 = Object.entries(categoryMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const monthMap = data.reduce((acc, item) => {
      const m = `${item.ngay.getMonth() + 1}/${item.ngay.getFullYear()}`;
      acc[m] = (acc[m] || 0) + item.soTien;
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
    const tongChi = data.reduce((sum, item) => sum + item.soTien, 0);
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
              <Dashboard 
                stats={stats} 
                data={data}
                extraData={extraData} 
                onUpdateStageStatus={handleUpdateStageStatus}
                showToast={showToast}
              />
            )}
            {(activeTab === "list" || activeTab === "all") && (
              <DataTable data={data} onEdit={setEditingItem} onDelete={() => {}} />
            )}
          </>
        )}
      </main>
      <MobileFooter activeTab={activeTab} onTabChange={setActiveTab} />
      {editingItem && <EditModal item={editingItem} onClose={() => setEditingItem(null)} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default App;
