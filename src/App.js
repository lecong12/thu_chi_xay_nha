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
import { updateRowInSheet, addRowToSheet, deleteRowFromSheet } from "./utils/sheetsAPI";
import Sidebar from "./components/Sidebar"; // Import Sidebar
import Sidebar from "./components/Sidebar"; // Import Sidebar
import Sidebar from "./components/Sidebar"; // Import Sidebar
import Sidebar from "./components/Sidebar"; // Import Sidebar
import "./App.css";

const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;

function App() {
  constate cho Sidebar (mặc định mở trên desktop)
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  
  // St [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem("isLoggedIn") === "true");
  constate cho Sidebar (mặc định mở trên desktop)
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  
  // St [activeTab, setActiveTab] = useState(() => (window.innerWidth > 768 ? "all" : "dashboard"));
  tate cho Sidebar (mặc định mở trên desktop)
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  
  // S
  // State cho Sidebar (mặc định mở trên desktop)
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  
  // Sử dụng custom hook để quản lý state và logic dữ liệu
  // Lưu ý: Nếu useAppData chưa được cập nhật để dùng API mới, bạn nên cập nhật nó hoặc
  // dùng fetchDataFromAppSheet trực tiếp ở đây thay vì hook nếu hook vẫn dùng logic cũ.
  // Dưới đây giả định logic trong App.js là chính.
  const { 
    data, setData, nganSach, tienDo, loading, fetchAllData, handleUpdateStage 
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

  const handleStageUpdate = async (stageId, updates) => {
    const result = await handleUpdateStage(stageId, updates);
    if (!result.success) {
      showToast(result.message || "Lỗi khi cập nhật trạng thái.", "error");
    }
    return result; // Trả về kết quả để Dashboard xử lý tiếp (ví dụ: tắt loading upload)
  };

  const handleAddNew = () => {
    setEditingItem({
      ngay: new Date(),
      soTien: 0,
      loaiThuChi: "Chi",
      noiDung: "",
      doiTuongThuChi: "",
      nguoiCapNhat: "",
      hinhAnh: ""
    });
  };

  // --- LOGIC XUẤT EXCEL (CSV) ---
  const exportToCSV = (data, fileName) => {
    if (!data || !data.length) {
      showToast("Không có dữ liệu để xuất!", "warning");
      return;
    }

    const headers = ["Ngày", "Loại", "Nội dung", "Giai đoạn/Nguồn", "Số tiền", "Người cập nhật", "Ghi chú", "Link Ảnh"];
    
    // Helper format tên giai đoạn cho gọn (giống trong DataTable)
    const formatStage = (name) => name ? name.split("(")[0].trim().replace(/^\d+\.\s*/, "") : "-";

    const csvRows = data.map(item => {
      const date = item.ngay instanceof Date ? item.ngay.toLocaleDateString("vi-VN") : item.ngay;
      const escape = (text) => text ? `"${text.toString().replace(/"/g, '""')}"` : "";
      
      return [
        escape(date),
        escape(item.loaiThuChi),
        escape(item.noiDung),
        escape(formatStage(item.doiTuongThuChi)),
        item.soTien,
        escape(item.nguoiCapNhat),
        escape(item.hinhAnh || "")
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- XỬ LÝ THÊM / SỬA / XÓA ---
  const handleSaveEdit = async (updatedItem) => {
    try {
      // Nếu item có id (RowNumber) tức là đã tồn tại -> Sửa. Ngược lại -> Thêm mới
      const isEdit = !!updatedItem.id;

      showToast("Đang xử lý dữ liệu...", "info");

      let result;
      // Clone item để xử lý, tránh mutate object gốc
      const itemToSave = { ...updatedItem };

      // Chuẩn bị payload khớp với tên cột trong AppSheet cho bảng "GiaoDich"
      const apiPayload = {
        "id": itemToSave.keyId || itemToSave.id,
        "Ngày": itemToSave.ngay instanceof Date ? itemToSave.ngay.toISOString().split("T")[0] : itemToSave.ngay,
        "Hạng mục": itemToSave.doiTuongThuChi,
        "Nội dung": itemToSave.noiDung,
        "Số tiền": itemToSave.soTien ? itemToSave.soTien.toString() : "0",
        "Người cập nhật": itemToSave.nguoiCapNhat || "",
        "Chứng từ": itemToSave.hinhAnh || "",
      };

      if (isEdit) {
        // Gọi API qua sheetsAPI
        result = await updateRowInSheet("GiaoDich", apiPayload, APP_ID);
      } else {
        // Nếu là thêm mới, tự tạo ID (Key) cho AppSheet để tránh lỗi thiếu Key
        if (!apiPayload.id) {
          apiPayload.id = `GD_${Date.now()}`;
        }
        result = await addRowToSheet("GiaoDich", apiPayload, APP_ID);
      }

      if (result && result.success) {
        // --- OPTIMISTIC UPDATE: Cập nhật giao diện ngay lập tức ---
        const newItem = {
          ...itemToSave,
          // Nếu là thêm mới, dùng Key ID vừa tạo làm ID tạm cho giao diện
          id: itemToSave.appSheetId || itemToSave.id, 
          appSheetId: itemToSave.appSheetId, 
          keyId: itemToSave.keyId || itemToSave.id, // Đảm bảo keyId luôn có (ưu tiên keyId có sẵn)
          ngay: new Date(itemToSave.ngay), // Đảm bảo là Date object
          soTien: Number(itemToSave.soTien),
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
        const msg = result?.message || "Lỗi không xác định";
        // Hiển thị thông báo lỗi chi tiết hơn cho người dùng
        if (msg.includes("403") || msg.includes("Forbidden")) {
          showToast("Lỗi 403: Bạn chưa cấp quyền 'Updates/Adds' cho bảng GiaoDich trong AppSheet Editor.", "error");
        } else {
          showToast(`Lỗi: ${msg}`, "error");
        }
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
    // Thay đổi: Truyền tên bảng "GiaoDich", bỏ tham số appSheetId thừa
    const result = await deleteRowFromSheet("GiaoDich", item.keyId || item.id, APP_ID);

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

  return (
    <div className="app">
      {/* Sidebar cho Desktop */}
      <Sidebar           return new Date(y1, m1-1) - new Date(y2, m2-1);
        isOpen={isSideba Open} 
        toggl ={() => se IsSidebarOpen(!isSidebarOpen)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogo t={() => {
           localStorage.}emoveItem("isLoggedI)");
;          setIsLoggedInfalse);
        }}
      />

     {/* Wrappernộidungchính: Căn lề trái để tránh Sidebar */}
      
        -main-wrapper
        style={{ 
          marginLeft: window.innerWidth > 768 ? (isSidebarOpen ? '240px' : '64px') : '0',
          transition: 'margin-left 0.3s ease',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      
      return { top5, chartData, nganSach, tienDo };
  
    return (
      <div className="app"> // Header vẫn giữ logout choMobile
        {/* Sidebar cho Desktop */}
        <Sidebar   }, [filteredData, nganSach, tienDo]);
        isOpen={isSidebaOpen} 
          toggl={() => seIsSidebarOpen(!isSidebarOpen)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogot={() => {
           localStorage.emoveItem("isLoggedI");
          setIsLoggedInfalse);
        }}
      />

      {/* Wrapper nộicdungochính: Căn lề trái để tránh Sidebar */}
      nst s
        tats = useMemo-main-wrapper(
        style={{ 
          marginLeft: window.innerWidth > 768 ? (isSidebarOpen ? '240px' : '64px') : '0',
          transition: 'margin-left 0.3s ease',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      () => {
      const tongChi = filteredData.reduce((sum, item) => sum + item.soTien
  
    return (
      <div className="app"> // Header vẫn giữ logout choMobile
        {/* Sidebar cho Desktop */}, 0);
        <Sidebar     return { tongThu: 0, tongChi, soGiaoDich: filteredData.length };
          isOpen={isSideba}Open} 
          toggl,={() => se IsSidebarOpen(!isSidebarOpen)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogo[t={() => {
           localStorage.femoveItem("isLoggedIi");
l          setIsLoggedIntfalse);
        }}
      />
eredData]);
     {/* Wrappernộidungchính: Căn lề trái để tránh Sidebar */}
      
        -main-wrapper
        style={{ 
          marginLeft: window.innerWidth > 768 ? (isSidebarOpen ? '240px' : '64px') : '0',
          transition: 'margin-left 0.3s ease',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      
      if (!isL>
      </divo
ggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />;
  
    return (
      <div className="app"> // Header vẫn giữ logout choMobile
        <Header 
          onRefresh={fetchAllData} 
          loading={loading} 
          onLogout={() => setIsLoggedIn(false)} 
        onAdd={handleAddNew}
        onToggleFilter={() => setIsFilterExpanded(!isFilterExpanded)} 
      {/* Sidebar cho Desktop */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggle={() => setIsSidebarOpen(!isSidebarOpen)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={() => {
           localStorage.removeItem("isLoggedIn");
           setIsLoggedIn(false);
        }}
      />
      <main className="main-content">

      {/* Wrapper nội dung chính: Căn lề trái để tránh Sidebar */}
      <div 
        className="app-main-wrapper"
        style={{ 
            ma>
      </divr
ginLeft: window.innerWidth > 768 ? (isSidebarOpen ? '240px' : '64px') : '0',
          transition: 'margin-left 0.3s ease',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Header 
          onRefresh={fetchAllData} 
          loading={loading} 
          onLogout={() => setIsLoggedIn(false)} // Header vẫn giữ logout cho Mobile
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
              onUpdateStage={handleStageUpdate}
              showToast={showToast}
            >
              {activeTab === "all" && (
                <div style={{ marginTop: '30px', marginBottom: '80px' }}>
              >
      </div 
     <h3 className="chart-title" style={{ marginBottom: '10px' }}>Danh sách giao dịch</h3>
                  <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    <FilterBar 
                      filters={filters} 
                      filterOptions={filterOptions} 
                      onFilterChange={handleFilterChange} 
                      onReset={handleResetFilters} 
                      isExpanded={isFilterExpanded}
                      onToggleExpand={() => setIsFilterExpanded(!isFilterExpanded)}
                      onExport={() => exportToCSV(filteredData, "so-tay-xay-nha")}
                    />
                    <div style={{ borderBottom: '1px solid #e5e7eb' }} />
                    <DataTable data={filteredData} onEdit={setEditingItem} onDelete={requestDelete} />
                  </div>
                </div>
              )}
            </Dashboard>
          )}
          {activeTab === "list" && (
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', marginTop: '10px', marginBottom: '80px' }}>
              <FilterBar 
                filters={filters} 
                filterOptions={filterOptions} 
                onFilterChange={handleFilterChange} 
                onReset={handleResetFilters} 
                isExpanded={isFilterExpanded}
                onToggleExpand={() => setIsFilterExpanded(!isFilterExpanded)}
                onExport={() => exportToCSV(filteredData, "so-tay-xay-nha")}
              />
              <div style={{ borderBottom: '1px solid #e5e7eb' }} />
              <DataTable data={filteredData} onEdit={setEditingItem} onDelete={requestDelete} />
            </div>
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
