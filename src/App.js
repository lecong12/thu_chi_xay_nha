import React, { useState, useEffect, useMemo, useCallback } from "react";
import Dashboard from "./components/Dashboard";
import DataTable from "./components/DataTable";
import MobileFooter from "./components/MobileFooter";
import Header from "./components/Header";
import Login from "./components/Login";
import EditModal from "./components/EditModal";
import ConfirmModal from "./components/ConfirmModal"; // Import modal xác nhận
import Toast from "./components/Toast";
import { updateStageInSheet } from "./utils/stagesAPI";
import { updateRowInSheet, addRowToSheet, deleteRowFromSheet } from "./utils/sheetsAPI";
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
  const [itemToDelete, setItemToDelete] = useState(null); // State cho modal xác nhận xóa
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
    if (s.includes("rownumber")) return "rowNumber"; // Bắt trường hợp _RowNumber từ AppSheet
    if (s.includes("ngay bat dau")) return "ngayBatDau";
    if (s.includes("ngay ket thuc")) return "ngayKetThuc";
    if (s.includes("anh nghiem thu")) return "anhNghiemThu";
    if (s.includes("ten cong viec") || s.includes("giai doan")) return "name";
    if (s.includes("trang thai")) return "status";
    if (s.includes("hang muc")) return "doiTuongThuChi"; // Map đúng về biến doiTuongThuChi
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
          id: row._RowNumber || `gd_${index}`, // Lấy trực tiếp _RowNumber từ AppSheet làm ID
          appSheetId: row._RowNumber, // Đảm bảo ID cho API luôn là _RowNumber
          keyId: c.id || row.id, // Lưu giá trị cột 'id' (Key) thực sự từ AppSheet
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
          hangMuc: c.hangMuc || c.doiTuongThuChi || "Hạng mục", 
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

  const handleAddNew = () => {
    setEditingItem({
      ngay: new Date(),
      soTien: 0,
      loaiThuChi: "Chi",
      noiDung: "",
      doiTuongThuChi: "",
      nguoiCapNhat: "",
      ghiChu: "",
      hinhAnh: ""
    });
  };

  // --- XỬ LÝ THÊM / SỬA / XÓA ---
  const handleSaveEdit = async (updatedItem) => {
    try {
      // Nếu có appSheetId thì là Sửa, không có thì là Thêm mới
      const isEdit = !!updatedItem.appSheetId;

      showToast("Đang xử lý dữ liệu...", "info");

      let result;
      if (isEdit) {
        result = await updateRowInSheet(updatedItem, APP_ID, ACCESS_KEY);
      } else {
        // LOGIC TÍNH ID TỰ TĂNG: Lấy max(id) hiện có + 1
        const maxId = data.reduce((max, item) => {
          const val = parseInt(item.keyId, 10);
          return !isNaN(val) && val > max ? val : max;
        }, 0);
        const newId = maxId + 1;
        
        updatedItem.id = newId; // Gán ID mới vào item
        result = await addRowToSheet(updatedItem, APP_ID, ACCESS_KEY);
      }

      if (result && result.success) {
        showToast(isEdit ? "Cập nhật thành công!" : "Thêm mới thành công!", "success");
        setEditingItem(null); // Đóng modal
        fetchAllData(); // Tải lại dữ liệu mới nhất
      } else {
        showToast(`Lỗi: ${result?.message || "Không có phản hồi từ server"}`, "error");
      }
    } catch (error) {
      console.error("Save error:", error);
      showToast(`Lỗi hệ thống: ${error.message}`, "error");
    }
  };

  // Mở modal xác nhận khi người dùng bấm nút xóa
  const requestDelete = (id) => {
    setItemToDelete(id);
  };

  // Thực thi xóa sau khi người dùng xác nhận từ Modal
  const executeDelete = async () => {
    if (!itemToDelete) return;

    const item = data.find(i => i.id === itemToDelete);
    if (!item) {
      setItemToDelete(null); // Đóng modal nếu không tìm thấy item
      return;
    }

    showToast("Đang xóa...", "info");
    const result = await deleteRowFromSheet(item.keyId, item.appSheetId, APP_ID, ACCESS_KEY);

    if (result.success) {
      showToast("Đã xóa thành công!", "success");
      fetchAllData();
    } else {
      showToast(`Lỗi xóa: ${result.message}`, "error");
    }
    setItemToDelete(null); // Luôn đóng modal sau khi thực hiện
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
      <Header onRefresh={fetchAllData} loading={loading} onLogout={() => setIsLoggedIn(false)} onAdd={handleAddNew} />
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
              <DataTable data={data} onEdit={setEditingItem} onDelete={requestDelete} />
            )}
          </>
        )}
      </main>
      <MobileFooter activeTab={activeTab} onTabChange={setActiveTab} />
      {editingItem && <EditModal item={editingItem} onClose={() => setEditingItem(null)} onSave={handleSaveEdit} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {itemToDelete && (
        <ConfirmModal
          isOpen={!!itemToDelete}
          onClose={() => setItemToDelete(null)}
          onConfirm={executeDelete}
          title="Xác nhận xóa giao dịch"
        >
          <p>Bạn có chắc chắn muốn xóa vĩnh viễn giao dịch này không? Hành động này không thể hoàn tác.</p>
        </ConfirmModal>
      )}
    </div>
  );
}

export default App;
