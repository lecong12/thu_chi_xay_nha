import React, { useState, useEffect, useMemo } from "react";
import Dashboard from "./components/Dashboard";
import FilterBar from "./components/FilterBar";
import DataTable from "./components/DataTable";
import MobileFooter from "./components/MobileFooter";
import Header from "./components/Header";
import Login from "./components/Login";
import EditModal from "./components/EditModal";
import {
  updateRowInSheet,
  deleteRowFromSheet,
  addRowToSheet,
  fetchDataFromAppSheet,
} from "./utils/sheetsAPI";
import "./App.css";

// Định nghĩa URL backend: Nếu chạy localhost, trỏ thẳng vào port 5000 để tránh lỗi Proxy
const API_BASE_URL = window.location.hostname === "localhost" ? "http://localhost:5000" : "/api";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("isLoggedIn") === "true";
  });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Dùng lazy initialization để chỉ tính toán window.innerWidth một lần lúc khởi tạo
  const [activeTab, setActiveTab] = useState(() => window.innerWidth > 768 ? "all" : "dashboard");
  const [editingItem, setEditingItem] = useState(null);
  const [toast, setToast] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    loaiThuChi: "",
    nguoiCapNhat: "",
    doiTuongThuChi: "",
    startDate: "",
    endDate: "",
    searchText: "",
  });

 const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // GỌI API TỪ SERVER NODE.JS CỦA BẠN THAY VÌ APPSHEET
      const response = await fetch(`${API_BASE_URL}/api/data`);
      
      // Kiểm tra Content-Type: Nếu trả về HTML (lỗi) thay vì JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        // Đọc text trả về để biết lỗi gì (thường là trang 404 hoặc 500 của Vercel)
        const text = await response.text(); 
        console.error("Non-JSON response:", text);
        throw new Error(`Lỗi kết nối Server Backend (${response.status}). Vui lòng kiểm tra Logs trên Vercel.`);
      }

     const result = await response.json();
      if (response.ok && result.data) {
        // Chuyển đổi mảng 2 chiều từ Sheet thành Object cho React
         // Cấu trúc Sheet GiaoDich: [Ngày, Hạng mục, Nội dung, Số tiền, Minh chứng, Ghi chú]
        const formattedData = result.data.slice(1).map((row, index) => ({
          id: `row_${index}`, // Tạo ID tạm
          ngay: row[0] ? new Date(row[0]) : new Date(),
          loaiThuChi: row[1] || "Khác",
          noiDung: row[2] || "",
          soTien: parseInt((row[3] || "0").replace(/\D/g, ''), 10), // Xóa ký tự không phải số
          hinhAnh: row[4] || "",
          ghiChu: row[5] || "",
          // Các trường mặc định khác để tránh lỗi
          nguoiCapNhat: "Admin", 
          doiTuongThuChi: ""
        }));
        
        setData(formattedData.reverse());
        setLoading(false);
      } else {
        throw new Error(result.error || "Không thể tải dữ liệu từ Google Sheet");
      }
    } catch (err) {
      console.error("Fetch error details:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []); // Mảng rỗng đảm bảo useEffect chỉ chạy một lần sau khi component mount

  // Tự động chuyển sang chế độ hiển thị tất cả (Dashboard + List) khi ở màn hình lớn (Desktop)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setActiveTab("all");
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

 const showToast = (message, type = "success") => {
    // Use a state variable to control the toast's visibility
    setToast({ message, type });
    // Automatically clear the toast after a delay
  };

  // Filter Options & Filtered Data logic (giữ nguyên vì không liên quan lỗi kết nối)
  const filterOptions = useMemo(() => ({
    loaiThuChi: [...new Set(data.map((item) => item.loaiThuChi).filter(Boolean))],
    nguoiCapNhat: [...new Set(data.map((item) => item.nguoiCapNhat).filter(Boolean))],
    doiTuongThuChi: [...new Set(data.map((item) => item.doiTuongThuChi).filter(Boolean))],
  }), [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filters.loaiThuChi && item.loaiThuChi !== filters.loaiThuChi) return false;
      if (filters.nguoiCapNhat && item.nguoiCapNhat !== filters.nguoiCapNhat) return false;
      if (filters.doiTuongThuChi && item.doiTuongThuChi !== filters.doiTuongThuChi) return false;
      
      // item.ngay đã là Date object từ sheetsAPI, không cần new Date() lại
      if (filters.startDate && item.ngay < new Date(filters.startDate)) return false;
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (item.ngay > endDate) return false;
      }
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        // Kiểm tra trực tiếp để tối ưu hiệu năng thay vì tạo mảng matchFields
        const content = item.noiDung?.toLowerCase() || "";
        const note = item.ghiChu?.toLowerCase() || "";
        if (!content.includes(searchLower) && !note.includes(searchLower) && !item.nguoiCapNhat?.toLowerCase().includes(searchLower) && !item.doiTuongThuChi?.toLowerCase().includes(searchLower)) return false;
      }
      return true;
    });
  }, [data, filters]);

  const stats = useMemo(() => {
    // Sau khi tái cấu trúc, tất cả giao dịch đều là 'Chi'
    const tongChi = filteredData.reduce((sum, item) => sum + (Number(item.soTien) || 0), 0);
    const tongThu = 0; // Không còn quản lý Thu ở bảng này
    return { tongThu, tongChi, canDoi: tongThu - tongChi, soGiaoDich: filteredData.length };
  }, [filteredData]);

  const handleFilterChange = (name, value) => setFilters((prev) => ({ ...prev, [name]: value }));
  const resetFilters = () => setFilters({ loaiThuChi: "", nguoiCapNhat: "", doiTuongThuChi: "", startDate: "", endDate: "", searchText: "" });
  const handleLogin = () => setIsLoggedIn(true);
  const handleLogout = () => { localStorage.removeItem("isLoggedIn"); setIsLoggedIn(false); };
  const handleEdit = (item) => setEditingItem(item);

  const handleSetup = async () => {
    const isConfirmed = window.confirm(
      "Bạn có chắc chắn muốn cấu hình lại Google Sheet?\nHệ thống sẽ tạo các Tab (GiaoDich, NganSach, TienDo...) nếu chưa có và điền công thức tự động."
    );

    if (!isConfirmed) return;

    setLoading(true);
    showToast("info", "Đang cấu hình hệ thống...");

    try {
      const response = await fetch(`${API_BASE_URL}/api/setup-sheets`, {
        method: 'POST',
      });

      // Kiểm tra Content-Type
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Không thể kết nối Server Backend.");
      }

      const result = await response.json();

      if (response.ok) {
        showToast("success", result.message);
        fetchData(); // Tải lại toàn bộ dữ liệu sau khi cấu hình
      } else {
        throw new Error(result.error || "Có lỗi xảy ra.");
      }
    } catch (error) {
      showToast(`Lỗi: ${error.message}. Chi tiết: ${error}`, "error");
      console.error("Setup error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingItem({
      ngay: new Date().toISOString().split("T")[0], // Mặc định hôm nay
      soTien: "",
      noiDung: "",
      doiTuongThuChi: "",
      nguoiCapNhat: "",
      ghiChu: "",
      hinhAnh: ""
    });
  };

  const handleSaveEdit = async (updatedItem) => {
    try {
      let result;
      // Kiểm tra nếu có ID (appSheetId) thì là Sửa, ngược lại là Thêm mới
       const response = await fetch(`${API_BASE_URL}/api/data`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedItem),
    });
     result = await response.json();

      if (result.success) {
        // Cập nhật giao diện NGAY LẬP TỨC (Optimistic Update) không cần chờ tải lại từ server
        setData((prevData) => {
          // Chuẩn hóa dữ liệu vừa nhập để khớp với định dạng hiển thị (Date object, Number...)
          const newItem = {
            ...updatedItem,
            id: updatedItem.id || updatedItem.appSheetId || `temp_${Date.now()}`, // Tạo ID tạm nếu là thêm mới
            appSheetId: updatedItem.appSheetId || updatedItem.id,
            ngay: updatedItem.ngay instanceof Date ? updatedItem.ngay : new Date(updatedItem.ngay),
            soTien: Number(updatedItem.soTien || 0),
            nguoiCapNhat: updatedItem.nguoiCapNhat || "",
            loaiThuChi: updatedItem.loaiThuChi || "Chi",
            noiDung: updatedItem.noiDung || "",
            doiTuongThuChi: updatedItem.doiTuongThuChi || "",
            ghiChu: updatedItem.ghiChu || ""
          };

          if (updatedItem.id || updatedItem.appSheetId) {
            // Trường hợp Sửa: Tìm và thay thế dòng cũ
            return prevData.map((item) => 
              (item.id === updatedItem.id || item.appSheetId === updatedItem.appSheetId) ? newItem : item
            );
          } else {
            // Trường hợp Thêm: Đưa lên đầu danh sách
            return [newItem, ...prevData];
          }
        });

        setEditingItem(null);
        showToast(result.message || "Thành công!", "success");
        
        // Tải lại dữ liệu thật từ server (chạy ngầm, không await để UI không bị đơ)
        fetchData();
      } else {
        showToast(result.message || "Thất bại", "error");
      }
    } catch (error) {
      showToast("Có lỗi xảy ra", "error");
      console.error("Error saving edit:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa giao dịch này?")) {
      try {
         const response = await fetch(`${API_BASE_URL}/api/data/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error('Không thể xóa mục này.');
        }
         let result;

        if (result.success) {
          await fetchData();
          showToast(result.message || "Xóa thành công!", "success");
        } else {
          showToast(result.message || "Xóa thất bại", "error");
        }
      } catch (error) {
        showToast("Có lỗi xảy ra khi xóa", "error");
        console.error("Error deleting:", error);
      }
    }

  };

  if (!isLoggedIn) return <Login onLogin={handleLogin} />;






  return (
    <div className="app">
      <Header
        onRefresh={fetchData}
        loading={loading}
        onLogout={handleLogout}
        onAdd={handleAddNew}
        onSetup={handleSetup}
      />
      <main className="main-content">
         {error && (
          <div className="error-banner">
            <h3>⚠️ Đã xảy ra lỗi tải dữ liệu</h3>
            <p>{error}</p>
            <p style={{ fontSize: '0.9em', color: '#666' }}>
              Nếu đây là lần đầu chạy ứng dụng, bạn cần tạo các Sheet mẫu trước.
            </p>
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={fetchData}>Thử lại</button>
              <button onClick={handleSetup} style={{ backgroundColor: '#2563eb', color: 'white' }}>🛠️ Tạo Sheet mẫu & Cấu hình</button>
            </div>
          </div>
        )}
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : (
          <>
            {(activeTab === "dashboard" || activeTab === "all") && (
              <Dashboard
                stats={stats}
                data={filteredData}
                appId={process.env.REACT_APP_APPSHEET_APP_ID}
                showToast={showToast}
              />
            )}
            {(activeTab === "list" || activeTab === "all") && (
              <>
                <FilterBar filters={filters} filterOptions={filterOptions} onFilterChange={handleFilterChange} onReset={resetFilters} />
                <DataTable data={filteredData} onEdit={handleEdit} onDelete={handleDelete} />
              </>
            )}
          </>
        )}
      </main>
      <MobileFooter activeTab={activeTab} onTabChange={setActiveTab} />
      {editingItem && <EditModal item={editingItem} onClose={() => setEditingItem(null)} onSave={handleSaveEdit} />}
       {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default App;