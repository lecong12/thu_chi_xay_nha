import React, { useState, useMemo } from "react";
import Dashboard from "./components/Dashboard";
import DataTable from "./components/DataTable";
import MobileFooter from "./components/MobileFooter";
import Header from "./components/Header";
import FilterBar from "./components/FilterBar";
import Login from "./components/Login";
import EditModal from "./components/EditModal";
import ConfirmModal from "./components/ConfirmModal"; // Import modal xác nhận
import { useAppData } from "./utils/useAppData"; // Import custom hook
import Toast from "./components/Toast";
import { updateRowInSheet, addRowToSheet, deleteRowFromSheet, fetchDataFromAppSheet } from "./utils/sheetsAPI";
import "./App.css";

const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem("isLoggedIn") === "true");
  const [activeTab, setActiveTab] = useState(() => (window.innerWidth > 768 ? "all" : "dashboard"));
  
  // Sử dụng custom hook để quản lý state và logic dữ liệu
  // Lưu ý: Nếu useAppData chưa được cập nhật để dùng API mới, bạn nên cập nhật nó hoặc
  // dùng fetchDataFromAppSheet trực tiếp ở đây thay vì hook nếu hook vẫn dùng logic cũ.
  // Dưới đây giả định logic trong App.js là chính.
  const { 
    data, setData, nganSach, tienDo, loading, error, fetchAllData, handleUpdateStageStatus: updateStageStatus 
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

  // State quản lý việc đóng/mở thanh lọc
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // --- LOGIC LỌC DỮ LIỆU ---
  const filterOptions = useMemo(() => ({
    doiTuongThuChi: [...new Set(data.map((item) => item.doiTuongThuChi).filter(Boolean))],
    nguoiCapNhat: [...new Set(data.map((item) => item.nguoiCapNhat).filter(Boolean))],
  }), [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filters.loaiThuChi && item.loaiThuChi !== filters.loaiThuChi) return false;
      if (filters.nguoiCapNhat && item.nguoiCapNhat !== filters.nguoiCapNhat) return false;
      if (filters.doiTuongThuChi && item.doiTuongThuChi !== filters.doiTuongThuChi) return false;
      
      const itemDate = new Date(item.ngay);
      if (filters.startDate && itemDate < new Date(filters.startDate)) return false;
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (itemDate > end) return false;
      }

      if (filters.searchText) {
        const text = filters.searchText.toLowerCase();
        const content = (item.noiDung || "").toLowerCase();
        const note = (item.ghiChu || "").toLowerCase();
        const cat = (item.doiTuongThuChi || "").toLowerCase();
        return content.includes(text) || note.includes(text) || cat.includes(text);
      }

      return true;
    });
  }, [data, filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({ loaiThuChi: "", nguoiCapNhat: "", doiTuongThuChi: "", startDate: "", endDate: "", searchText: "" });
  };

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
        // Gọi API qua sheetsAPI (đã trỏ về Proxy)
        result = await updateRowInSheet(updatedItem, APP_ID);
      } else {
        // AppSheet xử lý thêm mới
        // Đảm bảo updatedItem có ID nếu AppSheet yêu cầu Client gửi ID
        result = await addRowToSheet(updatedItem, APP_ID);
      }

      if (result && result.success) {
        // --- OPTIMISTIC UPDATE: Cập nhật giao diện ngay lập tức ---
        const newItem = {
          ...updatedItem,
          // Nếu là thêm mới, updatedItem.id đã được gán newId ở trên
          id: updatedItem.id || updatedItem.appSheetId, 
          appSheetId: updatedItem.appSheetId, // Giữ nguyên appSheetId nếu có (khi sửa)
          keyId: updatedItem.id, // Quan trọng: Cập nhật keyId để các thao tác sau (Sửa/Xóa) hoạt động đúng
          ngay: new Date(updatedItem.ngay), // Đảm bảo là Date object
          soTien: Number(updatedItem.soTien),
        };

        setData(prevData => {
          if (isEdit) {
            return prevData.map(item => (item.id === newItem.id || item.appSheetId === newItem.appSheetId) ? newItem : item);
          } else {
            return [newItem, ...prevData];
          }
        });
        // -----------------------------------------------------------

        showToast(isEdit ? "Cập nhật thành công!" : "Thêm mới thành công!", "success");
        setEditingItem(null); // Đóng modal
        await fetchAllData(); // Tải lại dữ liệu thật từ server để đảm bảo đã ghi thành công
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
    // Gọi API xóa, chỉ cần truyền ID (keyId)
    const result = await deleteRowFromSheet(item.keyId || item.id, item.appSheetId, APP_ID);

    if (result.success) {
      setData(prevData => prevData.filter(i => i.id !== itemToDelete)); // Xóa ngay trên giao diện
      showToast("Đã xóa thành công!", "success");
      await fetchAllData(); // Đồng bộ lại với server
    } else {
      showToast(`Lỗi xóa: ${result.message}`, "error");
    }
    setItemToDelete(null); // Luôn đóng modal sau khi thực hiện
  };

  // --- LOGIC XỬ LÝ DỮ LIỆU DASHBOARD ---
  const extraData = useMemo(() => {
    const categoryMap = filteredData.reduce((acc, item) => {
      const cat = item.doiTuongThuChi;
      acc[cat] = (acc[cat] || 0) + item.soTien;
      return acc;
    }, {});

    const top5 = Object.entries(categoryMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const monthMap = filteredData.reduce((acc, item) => {
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
  }, [filteredData, nganSach, tienDo]);

  const stats = useMemo(() => {
    const tongChi = filteredData.reduce((sum, item) => sum + item.soTien, 0);
    return { tongThu: 0, tongChi, soGiaoDich: filteredData.length };
  }, [filteredData]);

  if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />;

  return (
    <div className="app">
      <Header 
        onRefresh={fetchAllData} 
        loading={loading} 
        onLogout={() => setIsLoggedIn(false)} 
        onAdd={handleAddNew}
        onToggleFilter={() => setIsFilterExpanded(!isFilterExpanded)} 
      />
      <main className="main-content">
        <>

          {(activeTab === "dashboard" || activeTab === "all") && (
            <Dashboard 
              stats={stats} 
              data={filteredData}
              extraData={extraData} 
              onUpdateStageStatus={handleUpdateStageStatus}
              showToast={showToast}
            >
              {activeTab === "all" && (
                <div style={{ marginTop: '20px' }}>
                  <h3 className="chart-title" style={{ marginBottom: '10px' }}>Danh sách giao dịch</h3>
                  <FilterBar 
                    filters={filters} 
                    filterOptions={filterOptions} 
                    onFilterChange={handleFilterChange} 
                    onReset={handleResetFilters} 
                    isExpanded={isFilterExpanded}
                    onToggleExpand={() => setIsFilterExpanded(!isFilterExpanded)}
                  />
                  <DataTable data={filteredData} onEdit={setEditingItem} onDelete={requestDelete} />
                </div>
              )}
            </Dashboard>
          )}
          {activeTab === "list" && (
            <>
              <FilterBar 
                filters={filters} 
                filterOptions={filterOptions} 
                onFilterChange={handleFilterChange} 
                onReset={handleResetFilters} 
                isExpanded={isFilterExpanded}
                onToggleExpand={() => setIsFilterExpanded(!isFilterExpanded)}
              />
              <DataTable data={filteredData} onEdit={setEditingItem} onDelete={requestDelete} />
            </>
          )}
        </>
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
