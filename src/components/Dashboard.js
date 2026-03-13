import React, { useState, useEffect, useMemo } from "react";
import {
  FiTrendingDown,
  FiActivity,
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
  Tooltip
} from "recharts";
import { fetchStages, updateStageInSheet } from "../utils/stagesAPI";
import { fetchBudget } from "../utils/budgetAPI"; // Import API mới
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

// Helper function to calculate day difference
const dayDiff = (date1, date2) => {
  if (!date1 || !date2) return 0;
  // Set hours to 0 to compare dates only
  const d1 = new Date(date1);
  d1.setHours(0, 0, 0, 0);
  const d2 = new Date(date2);
  d2.setHours(0, 0, 0, 0);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
};

// Custom Tooltip for Gantt Chart
const GanttTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{`${data.name}`}</p>
        <p className="tooltip-desc">{`Thời gian: ${data.duration} ngày (Từ ngày ${data.range[0]} đến ${data.range[1]})`}</p>
      </div>
    );
  }
  return null;
};

function Dashboard({ stats, data, appId, showToast }) {
  const [stages, setStages] = useState([]);
  const [budget, setBudget] = useState([]);

  // Lấy dữ liệu tiến độ từ Google Sheet khi component được mount
  useEffect(() => {
    if (!appId) return;
    const loadStages = async () => {
      const result = await fetchStages(appId);
      if (result.success && result.data.length > 0) {
        setStages(result.data);
      } else if (!result.success) {
        showToast("error", result.message || "Không thể tải dữ liệu tiến độ.");
      }
    };
    loadStages();

    // Tải dữ liệu ngân sách
    const loadBudget = async () => {
      const result = await fetchBudget(appId);
      if (result.success) {
        setBudget(result.data);
      } else {
        showToast("error", result.message || "Không thể tải dữ liệu ngân sách.");
      }
    };
    loadBudget();
  }, [appId, showToast]);

  const handleUpdateStatus = async (stageId, newStatus) => {
    const originalStages = [...stages];
    const updatedStage = stages.find(s => s.id === stageId);

    if (!updatedStage) return;

    // Cập nhật UI trước để có trải nghiệm mượt mà
    const newStages = stages.map((s) =>
      s.id === stageId ? { ...s, status: newStatus } : s
    );
    setStages(newStages);

    // Gọi API để lưu vào Google Sheet
    const result = await updateStageInSheet({ ...updatedStage, status: newStatus }, appId);

    if (!result.success) {
      // Nếu lỗi, khôi phục lại trạng thái cũ và thông báo
      setStages(originalStages);
      showToast("error", result.message || "Lỗi khi cập nhật trạng thái.");
    }
  };

  // Tính toán tiến độ hoàn thành
  const completedStagesCount = stages.filter(s => s.status === 'Hoàn thành').length;
  const completionPercentage = stages.length > 0 ? Math.round((completedStagesCount / stages.length) * 100) : 0;

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

  // --- GANTT CHART DATA PREPARATION ---
  const ganttData = useMemo(() => {
    const validStages = stages.filter(s => s.ngayBatDau && s.ngayKetThuc && s.ngayBatDau < s.ngayKetThuc);
    if (validStages.length === 0) return [];

    const projectStartDate = new Date(Math.min(...validStages.map(s => s.ngayBatDau.getTime())));

    return validStages.map(stage => {
      const startDay = dayDiff(projectStartDate, stage.ngayBatDau);
      const duration = dayDiff(stage.ngayBatDau, stage.ngayKetThuc) + 1; // Add 1 to be inclusive
      const name = stage.name.replace(/^\d+\.\s*/, "");

      let color = "#a8a29e"; // Default color (stone) for 'Chưa bắt đầu'
      if (stage.status === 'Đang thi công') color = '#3b82f6'; // Blue
      if (stage.status === 'Hoàn thành') color = '#16a34a'; // Green

      return {
        name,
        range: [startDay, startDay + duration - 1], // for tooltip
        startDay, // transparent bar
        duration, // colored bar
        color,
      };
    });
  }, [stages]);
  // --- END GANTT CHART DATA PREPARATION ---

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
      <div className="stats-grid-simplified">
        <div className="stat-card chi">
          <div className="stat-icon">
            <FiTrendingDown />
          </div>
          <div className="stat-info">
            <span className="stat-label">Tổng Chi Phí</span>
            <span className="stat-value">{formatCurrency(stats.tongChi)}</span>
          </div>
        </div>

        <div className="stat-card giao-dich">
          <div className="stat-icon">
            <FiActivity />
          </div>
          <div className="stat-info">
            <span className="stat-label">Tiến độ hoàn thành</span>
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${completionPercentage}%` }}></div>
            </div>
            <span className="stat-value">{completionPercentage}%</span>
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

      {/* Budget Table Section */}
      <div className="budget-section chart-card">
        <h3 className="chart-title">Đối chiếu Ngân sách</h3>
        <div className="budget-table-wrapper">
          <table className="budget-table">
            <thead>
              <tr>
                <th>Hạng mục</th>
                <th>Dự kiến</th>
                <th>Thực tế chi</th>
                <th>Còn lại</th>
                <th>Tình trạng</th>
              </tr>
            </thead>
            <tbody>
              {budget.map((item) => (
                <tr key={item.hangMuc}>
                  <td>{item.hangMuc}</td>
                  <td>{formatCurrency(item.duKien)}</td>
                  <td>{formatCurrency(item.thucTe)}</td>
                  <td className={item.conLai < 0 ? 'negative' : 'positive'}>
                    {formatCurrency(item.conLai)}
                  </td>
                  <td className="status-cell">
                    <span className={`status-badge ${item.conLai < 0 ? 'over' : 'ok'}`}>
                      {item.tinhTrang}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gantt Chart Section */}
      <div className="chart-card" style={{ marginTop: '20px' }}>
        <h3 className="chart-title">Biểu đồ tiến độ (Gantt)</h3>
        {ganttData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={ganttData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis 
                type="number" 
                domain={['dataMin', 'dataMax + 5']} 
                tickFormatter={(tick) => `Ngày ${tick}`} 
                tick={{ fill: "#6b7280", fontSize: 11 }} 
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={120} 
                tick={{ fill: "#374151", fontSize: 12 }}
                interval={0}
              />
              <Tooltip 
                cursor={{fill: 'rgba(239, 246, 255, 0.5)'}}
                content={<GanttTooltip />}
              />
              <Bar dataKey="startDay" stackId="a" fill="transparent" />
              <Bar dataKey="duration" stackId="a" radius={[4, 4, 4, 4]}>
                {ganttData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="no-data">Chưa có dữ liệu ngày bắt đầu/kết thúc để vẽ biểu đồ Gantt.</div>
        )}
      </div>

      {/* Progress Tracker Section */}
      <div className="progress-tracker-section">
        <h3 className="chart-title">Theo dõi tiến độ thi công</h3>
        <div className="stages-grid">
          {stages.map((stage) => (
            <div key={stage.id} className="stage-card">
              <span className="stage-name">
                {stage.name.replace(/^\d+\.\s*/, "")}
              </span>
              <select
                value={stage.status}
                onChange={(e) => handleUpdateStatus(stage.id, e.target.value)}
                className={`status-select status-${stage.status
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
              >
                <option value="Chưa bắt đầu">Chưa bắt đầu</option>
                <option value="Đang thi công">Đang thi công</option>
                <option value="Hoàn thành">Hoàn thành</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
