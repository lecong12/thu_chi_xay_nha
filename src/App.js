import React, { useState, useEffect, useMemo, useCallback } from "react";
import Dashboard from "./components/Dashboard";
import DataTable from "./components/DataTable";
import MobileFooter from "./components/MobileFooter";
import Header from "./components/Header";
import Login from "./components/Login";
import EditModal from "./components/EditModal";
import ConfirmModal from "./components/ConfirmModal"; // Import modal xác nhận
import { useAppData } from "./utils/useAppData"; // Import custom hook
import Toast from "./components/Toast";
import { updateRowInSheet, addRowToSheet, deleteRowFromSheet } from "./utils/sheetsAPI";
import "./App.css";

const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;
const ACCESS_KEY = process.env.REACT_APP_APPSHEET_ACCESS_KEY;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem("isLoggedIn") === "true");
  const [activeTab, setActiveTab] = useState(() => (window.innerWidth > 768 ? "all" : "dashboard"));
  
  // Sử dụng custom hook để quản lý state và logic dữ liệu
  const { 
    data, nganSach, tienDo, loading, error, fetchAllData, handleUpdateStageStatus: updateStageStatus 
  } = useAppData(isLoggedIn);

  // State cho UI, không liên quan đến data fetching
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

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const handleUpdateStageStatus = async (stageId, newStatus) => {
    const result = await updateStageStatus(stageId, newStatus);
    if (!result.success) {
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
      // Nếu item có appSheetId tức là đã tồn tại -> Sửa. Ngược lại -> Thêm mới
      // Lưu ý: updatedItem ở đây là object từ EditModal, nó kế thừa các trường từ item gốc
      const isEdit = !!updatedItem.appSheetId;

      showToast("Đang xử lý dữ liệu...", "info");

      let result;
      if (isEdit) {
        result = await updateRowInSheet(updatedItem, APP_ID, ACCESS_KEY);
      } else {
        // LOGIC TÍNH ID TỰ TĂNG: Lấy max(id) hiện có + 1
        // Đảm bảo data đã được tải và có trường keyId
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
              >
                {activeTab === "all" && (
                  <div style={{ marginTop: '20px' }}>
                    <h3 className="chart-title" style={{ marginBottom: '10px' }}>Danh sách giao dịch</h3>
                    <DataTable data={data} onEdit={setEditingItem} onDelete={requestDelete} />
                  </div>
                )}
              </Dashboard>
            )}
            {activeTab === "list" && (
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
