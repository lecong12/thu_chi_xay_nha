import React, { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import Dashboard from "./components/Dashboard";
import FilterBar from "./components/FilterBar";
import DataTable from "./components/DataTable";
import MobileFooter from "./components/MobileFooter";
import Header from "./components/Header";
import Login from "./components/Login";
import "./App.css";

const SHEET_ID = "1XHDNHpQ6GtPjIDGtKRHMUyHTWJWS8Q4WlT_Du-qggLA";
const SHEET_GID = "0";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("isLoggedIn") === "true";
  });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Filter states
  const [filters, setFilters] = useState({
    loaiThuChi: "",
    nguoiCapNhat: "",
    doiTuongThuChi: "",
    startDate: "",
    endDate: "",
    searchText: "",
  });

  // Fetch data from Google Sheets
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(CSV_URL);
      if (!response.ok) throw new Error("Không thể tải dữ liệu");

      const csvText = await response.text();

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedData = results.data.map((row, index) => ({
            ...row,
            id: row.id || `row_${index}`,
            soTien: parseFloat(row.soTien?.replace(/,/g, "") || 0),
            ngay: row.ngay ? new Date(row.ngay) : new Date(),
          }));
          setData(parsedData);
          setLoading(false);
        },
        error: (err) => {
          setError("Lỗi phân tích dữ liệu: " + err.message);
          setLoading(false);
        },
      });
    } catch (err) {
      setError("Lỗi tải dữ liệu: " + err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get unique values for filter dropdowns
  const filterOptions = useMemo(
    () => ({
      loaiThuChi: [
        ...new Set(data.map((item) => item.loaiThuChi).filter(Boolean)),
      ],
      nguoiCapNhat: [
        ...new Set(data.map((item) => item.nguoiCapNhat).filter(Boolean)),
      ],
      doiTuongThuChi: [
        ...new Set(data.map((item) => item.doiTuongThuChi).filter(Boolean)),
      ],
    }),
    [data]
  );

  // Filtered data
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filters.loaiThuChi && item.loaiThuChi !== filters.loaiThuChi)
        return false;
      if (filters.nguoiCapNhat && item.nguoiCapNhat !== filters.nguoiCapNhat)
        return false;
      if (
        filters.doiTuongThuChi &&
        item.doiTuongThuChi !== filters.doiTuongThuChi
      )
        return false;

      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        if (item.ngay < startDate) return false;
      }

      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (item.ngay > endDate) return false;
      }

      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const matchFields = [
          item.noiDung,
          item.ghiChu,
          item.nguoiCapNhat,
          item.doiTuongThuChi,
        ];
        if (
          !matchFields.some((field) =>
            field?.toLowerCase().includes(searchLower)
          )
        )
          return false;
      }

      return true;
    });
  }, [data, filters]);

  // Calculate statistics
  const stats = useMemo(() => {
    const tongThu = filteredData
      .filter((item) => item.loaiThuChi === "Thu")
      .reduce((sum, item) => sum + item.soTien, 0);

    const tongChi = filteredData
      .filter((item) => item.loaiThuChi === "Chi")
      .reduce((sum, item) => sum + item.soTien, 0);

    return {
      tongThu,
      tongChi,
      canDoi: tongThu - tongChi,
      soGiaoDich: filteredData.length,
    };
  }, [filteredData]);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      loaiThuChi: "",
      nguoiCapNhat: "",
      doiTuongThuChi: "",
      startDate: "",
      endDate: "",
      searchText: "",
    });
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    setIsLoggedIn(false);
  };

  // Show login page if not logged in
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <Header onRefresh={fetchData} loading={loading} onLogout={handleLogout} />

      <main className="main-content">
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={fetchData}>Thử lại</button>
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
              <Dashboard stats={stats} data={filteredData} />
            )}

            {(activeTab === "list" || activeTab === "all") && (
              <>
                <FilterBar
                  filters={filters}
                  filterOptions={filterOptions}
                  onFilterChange={handleFilterChange}
                  onReset={resetFilters}
                />
                <DataTable data={filteredData} />
              </>
            )}
          </>
        )}
      </main>

      <MobileFooter activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
