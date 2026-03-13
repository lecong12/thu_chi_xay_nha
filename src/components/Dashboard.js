import React from "react";
import {
  FiTrendingUp,
  FiTrendingDown,
  FiDollarSign,
  FiActivity,
  FiClock,
} from "react-icons/fi";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import "./Dashboard.css";

const formatCurrency = (value) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatShortCurrency = (value) => {
  if (value >= 1000000000) {
    return (value / 1000000000).toFixed(1) + " tỷ";
  }
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + " triệu";
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(0) + "k";
  }
  return value.toString();
};

function Dashboard({ stats, data }) {
  // TÍNH TOÁN TIẾN ĐỘ: Tìm giao dịch chi mới nhất để xác định đang ở giai đoạn nào
  const latestExpense = [...data]
    .filter((item) => item.loaiThuChi === "Chi" && item.doiTuongThuChi)
    .sort((a, b) => new Date(b.ngay) - new Date(a.ngay))[0];

  const currentStage = latestExpense
    ? latestExpense.doiTuongThuChi.split("(")[0].trim() // Lấy phần tên ngắn (bỏ phần trong ngoặc)
    : "Chưa khởi công";

  // Group data by doiTuongThuChi for pie chart
  const groupByDoiTuong = data.reduce((acc, item) => {
    if (item.loaiThuChi === "Chi") {
      const key = item.doiTuongThuChi || "Khác";
      acc[key] = (acc[key] || 0) + item.soTien;
    }
    return acc;
  }, {});

  const pieData = Object.entries(groupByDoiTuong)
    .map(([name, value]) => ({ name, value }))
    // Sắp xếp theo thứ tự giai đoạn (1 -> 9) để thể hiện trình tự xây dựng
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  // Group data by noiDung for bar chart
  const expenseItems = data.reduce((acc, item) => {
    if (item.loaiThuChi === "Chi") {
      const key = item.noiDung || "Hạng mục khác";
      acc[key] = (acc[key] || 0) + item.soTien;
    }
    return acc;
  }, {});

  const barData = Object.entries(expenseItems)
    .map(([name, chi]) => ({ name: name.substring(0, 25), chi }))
    .sort((a, b) => b.chi - a.chi)
    .slice(0, 5);

  const COLORS = [
    "#2d8e2b",
    "#16a34a",
    "#22c55e",
    "#4ade80",
    "#86efac",
    "#bbf7d0",
  ];

  return (
    <div className="dashboard">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card thu">
          <div className="stat-icon">
            <FiTrendingUp />
          </div>
          <div className="stat-info">
            <span className="stat-label">Tổng Nguồn Tiền</span>
            <span className="stat-value">{formatCurrency(stats.tongThu)}</span>
          </div>
        </div>

        <div className="stat-card chi">
          <div className="stat-icon">
            <FiTrendingDown />
          </div>
          <div className="stat-info">
            <span className="stat-label">Đã Chi Tiêu</span>
            <span className="stat-value">{formatCurrency(stats.tongChi)}</span>
          </div>
        </div>

        <div className="stat-card can-doi">
          <div className="stat-icon">
            <FiDollarSign />
          </div>
          <div className="stat-info">
            <span className="stat-label">Còn Dư</span>
            <span
              className={`stat-value ${
                stats.canDoi >= 0 ? "positive" : "negative"
              }`}
            >
              {formatCurrency(stats.canDoi)}
            </span>
          </div>
        </div>

        <div className="stat-card giao-dich">
          <div className="stat-icon">
            <FiClock />
          </div>
          <div className="stat-info">
            <span className="stat-label">Tiến Độ Hiện Tại</span>
            <span className="stat-value" style={{ fontSize: "1.1rem" }}>
              {currentStage}
            </span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Pie Chart - Chi tiêu theo đối tượng */}
        <div className="chart-card">
          <h3 className="chart-title">Chi phí theo Giai đoạn</h3>
          {pieData.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => {
                      // Cắt bỏ phần trong ngoặc và xóa số thứ tự đầu dòng (VD: "1. " -> "")
                      const shortName = name.split("(")[0].trim().replace(/^\d+\.\s*/, "");
                      return `${shortName} ${(percent * 100).toFixed(0)}%`;
                    }}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      background: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      color: "#1f2937",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="legend-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></span>
                    <span className="legend-label">{entry.name}</span>
                    <span className="legend-value">
                      {formatShortCurrency(entry.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="no-data">Chưa có dữ liệu chi tiêu</div>
          )}
        </div>

        {/* Bar Chart - Thu chi theo nội dung */}
        <div className="chart-card">
          <h3 className="chart-title">Top 5 Hạng mục chi tiêu nhiều nhất</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} layout="vertical">
                <XAxis
                  type="number"
                  tickFormatter={formatShortCurrency}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fill: "#1f2937", fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    color: "#1f2937",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar
                  dataKey="chi"
                  name="Chi"
                  fill="#dc2626"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">Chưa có dữ liệu</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
