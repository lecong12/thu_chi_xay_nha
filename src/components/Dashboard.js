import React, { useMemo, useState } from "react";
import {
  FiTrendingDown,
  FiActivity,
  FiCamera,
  FiLoader,
  FiSave,
  FiX,
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
import "./Dashboard.css";

// Hàm an toàn để chuyển đổi số, tránh lỗi NaN
const safeNumber = (val) => {
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(safeNumber(value));
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
        <p className="tooltip-desc">{`Thời gian: ${data.duration} ngày (${data.dateRange})`}</p>
      </div>
    );
  }
  return null;
};

// Cấu hình Cloudinary
const CLOUD_NAME = (process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "").replace(/['"]/g, '');
const UPLOAD_PRESET = (process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "").replace(/['"]/g, '');

function Dashboard({ stats, data, extraData, onUpdateStage, showToast, children }) {
  // Lấy dữ liệu đã được fetch và xử lý từ component cha (App.js)
  const stages = extraData.tienDo || [];
  const budget = extraData.nganSach || [];
  const [uploadingStageId, setUploadingStageId] = useState(null);
  const [pendingFiles, setPendingFiles] = useState({}); // Lưu ảnh đang chờ upload: { [stageId]: { file, preview } }

  const handleUpdateStatus = async (stageId, newStatus) => {
    // Gọi hàm được truyền từ App.js để xử lý logic cập nhật
    await onUpdateStage(stageId, { status: newStatus });
  };

  // Bước 1: Chọn file và hiển thị xem trước (chưa upload)
  const handleFileSelect = (e, stageId) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chỉ chọn file ảnh.");
      return;
    }

    // Kiểm tra dung lượng file (Giới hạn 10MB của gói Free Cloudinary)
    if (file.size > 10 * 1024 * 1024) {
      alert("File ảnh quá lớn ( > 10MB). Vui lòng chọn ảnh nhỏ hơn để upload.");
      return;
    }

    // Tạo preview ảnh
    const preview = URL.createObjectURL(file);
    setPendingFiles(prev => ({ ...prev, [stageId]: { file, preview } }));
    
    // Reset input để có thể chọn lại file đó nếu cần
    e.target.value = null;
  };

  // Hủy chọn ảnh
  const handleCancelUpload = (stageId) => {
    setPendingFiles(prev => {
      const newState = { ...prev };
      if (newState[stageId]?.preview) URL.revokeObjectURL(newState[stageId].preview);
      delete newState[stageId];
      return newState;
    });
  };

  // Bước 2: Thực hiện Upload lên Cloudinary và Lưu vào AppSheet
  const handleConfirmUpload = async (stageId) => {
    const { file } = pendingFiles[stageId] || {};
    if (!file) return;

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      if (showToast) {
        showToast("Thiếu cấu hình Cloudinary.", "error");
      } else {
        alert("Thiếu cấu hình Cloudinary.");
      }
      return;
    }

    // Hàm showToast an toàn, nếu không có thì dùng alert
    const notify = (message, type = "info") => {
      if (showToast) showToast(message, type);
      else alert(message);
    };

    try {
      setUploadingStageId(stageId); // Bắt đầu loading
      
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", UPLOAD_PRESET);

      notify("Đang upload ảnh lên Cloudinary...", "info");

      // Thêm Timeout 20 giây để tránh treo mãi mãi
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: data, signal: controller.signal }
      );
      clearTimeout(timeoutId); // Xóa timeout nếu phản hồi thành công

      const fileData = await res.json();
      
      console.log("Kết quả từ Cloudinary:", fileData); // Xem log chi tiết trong Console (F12)
      
      if (fileData.secure_url) {
        console.log("Link ảnh nhận được:", fileData.secure_url); // Log link ra console
        notify(`Đã có link ảnh. Đang lưu vào dòng ${stageId}...`, "info");

        // Cập nhật ảnh lên AppSheet
        const result = await onUpdateStage(stageId, { anhNghiemThu: fileData.secure_url });
        
        // Chỉ xóa trạng thái chờ (preview) nếu lưu thành công
        if (result && result.success) {
          notify("Lưu thành công!", "success");
          handleCancelUpload(stageId);
        } else {
          // Lỗi từ AppSheet API
          throw new Error(result.message || "Không thể lưu link ảnh vào AppSheet.");
        }
      } else {
        // Lỗi từ Cloudinary
        throw new Error(fileData.error?.message || "Lỗi upload ảnh (Cloudinary)");
      }
    } catch (error) {
      console.error("Upload error:", error);
      let msg = "Lỗi upload: " + error.message;
      if (error.name === 'AbortError') {
        msg = "Upload thất bại: Quá thời gian chờ (Timeout). Vui lòng kiểm tra mạng.";
      }
      notify(msg, "error");
    } finally {
      setUploadingStageId(null); // Luôn tắt loading dù thành công hay thất bại
    }
  };

  // Tính toán tiến độ hoàn thành
  const completedStagesCount = stages.filter(s => s.status === 'Hoàn thành').length;
  const completionPercentage = stages.length > 0 ? Math.round((completedStagesCount / stages.length) * 100) : 0;

  // Group data by doiTuongThuChi for pie chart
  const groupByDoiTuong = (data || []).reduce((acc, item) => {
    if (item.loaiThuChi === "Chi" && safeNumber(item.soTien) > 0) {
      const key = item.doiTuongThuChi || "Khác";
      acc[key] = (acc[key] || 0) + safeNumber(item.soTien);
    }
    return acc;
  }, {});

  const pieData = Object.entries(groupByDoiTuong)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Group data by noiDung for bar chart
  const expenseItems = (data || []).reduce((acc, item) => {
    if (item.loaiThuChi === "Chi" && safeNumber(item.soTien) > 0) {
      const key = item.noiDung || "Hạng mục khác";
      acc[key] = (acc[key] || 0) + safeNumber(item.soTien);
    }
    return acc;
  }, {});

  const barData = Object.entries(expenseItems)
    .map(([name, chi]) => ({ name: name.substring(0, 25), chi }))
    .sort((a, b) => b.chi - a.chi)
    .slice(0, 5);

  // --- GANTT CHART DATA PREPARATION ---
  const ganttData = useMemo(() => {
    // 1. Lọc kỹ các giai đoạn có ngày hợp lệ (tránh NaN)
    const validStages = stages.filter(s => {
      const d1 = new Date(s.ngayBatDau);
      const d2 = new Date(s.ngayKetThuc);
      return s.ngayBatDau && s.ngayKetThuc && !isNaN(d1.getTime()) && !isNaN(d2.getTime());
    });

    if (validStages.length === 0) return [];

    const projectStartDate = new Date(Math.min(...validStages.map(s => new Date(s.ngayBatDau).getTime())));

    return validStages.map(stage => {
      const dStart = new Date(stage.ngayBatDau);
      const dEnd = new Date(stage.ngayKetThuc);
      
      const startDay = dayDiff(projectStartDate, dStart);
      const duration = dayDiff(dStart, dEnd) + 1; // Add 1 to be inclusive
      const name = stage.name.replace(/^\d+\.\s*/, "");

      let color = "#a8a29e"; // Default color (stone) for 'Chưa bắt đầu'
      if (stage.status === 'Đang thi công') color = '#3b82f6'; // Blue
      if (stage.status === 'Hoàn thành') color = '#16a34a'; // Green

      // Format ngày để hiển thị tooltip đẹp hơn
      const dateRange = `${dStart.toLocaleDateString('vi-VN')} - ${dEnd.toLocaleDateString('vi-VN')}`;

      return {
        name,
        dateRange, // Dữ liệu hiển thị ngày cụ thể
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
      <div className="budget-section chart-card" style={{ marginTop: '20px' }}>
        <h3 className="chart-title">Đối chiếu Ngân sách</h3>
        <div className="budget-table-wrapper">
          <table className="budget-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Hạng mục</th>
                <th style={{ textAlign: 'right' }}>Dự kiến</th>
                <th style={{ textAlign: 'right' }}>Thực tế chi</th>
                <th style={{ minWidth: '120px', textAlign: 'right' }}>Còn lại</th>
                <th style={{ textAlign: 'center' }}>Tình trạng</th>
              </tr>
            </thead>
            <tbody>
              {budget.map((item) => (
                <tr key={item.hangMuc}>
                  <td style={{ textAlign: 'left' }}>{item.hangMuc}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(safeNumber(item.duKien))}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(safeNumber(item.thucTe))}</td>
                  <td className={safeNumber(item.conLai) < 0 ? 'negative' : 'positive'} style={{ textAlign: 'right' }}>
                    {formatCurrency(safeNumber(item.conLai))}
                  </td>
                  <td className="status-cell" style={{ textAlign: 'center' }}>
                    <span className={`status-badge ${safeNumber(item.conLai) < 0 ? 'over' : 'ok'}`}>
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
      <div className="progress-tracker-section" style={{ marginTop: '20px' }}>
        <h3 className="chart-title">Theo dõi tiến độ thi công</h3>
        <div className="stages-grid" style={{ maxHeight: "400px", overflowY: "auto", paddingRight: "5px" }}>
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
              
              <div className="stage-image-container" style={{ marginTop: '10px', position: 'relative' }}>
                {pendingFiles[stage.id] ? (
                  // Giao diện khi đang có ảnh chờ xác nhận (Preview)
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={pendingFiles[stage.id].preview} 
                      alt="Preview" 
                      style={{ width: '100%', borderRadius: '4px', objectFit: 'cover', maxHeight: '150px', display: 'block', border: '2px solid #3b82f6' }} 
                    />
                    <div style={{ position: 'absolute', bottom: 5, right: 5, display: 'flex', gap: '5px' }}>
                      <button 
                        onClick={() => handleConfirmUpload(stage.id)} 
                        disabled={uploadingStageId === stage.id}
                        style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                      >
                        {uploadingStageId === stage.id ? <FiLoader className="spin" /> : <FiSave />} 
                        Lưu
                      </button>
                      <button 
                        onClick={() => handleCancelUpload(stage.id)}
                        disabled={uploadingStageId === stage.id}
                        style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                      >
                        <FiX /> Hủy
                      </button>
                    </div>
                  </div>
                ) : stage.anhNghiemThu ? (
                  <>
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={stage.anhNghiemThu} 
                      alt="Ảnh nghiệm thu" 
                      style={{ width: '100%', borderRadius: '4px', objectFit: 'cover', maxHeight: '150px', display: 'block' }} 
                    />
                    <label className="upload-btn-overlay" style={{ position: 'absolute', bottom: 5, right: 5, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FiCamera /> 
                      <span>Sửa</span>
                      <input type="file" accept="image/*" hidden onChange={(e) => handleFileSelect(e, stage.id)} disabled={uploadingStageId === stage.id} />
                    </label>
                  </div>
                  {/* Hiển thị link ảnh để xác nhận Cloudinary đã trả về */}
                  <div style={{ marginTop: '4px', fontSize: '10px', color: '#059669', textAlign: 'center' }}>
                    ✓ Đã có link: <a href={stage.anhNghiemThu} target="_blank" rel="noreferrer" style={{color: 'inherit', textDecoration: 'underline'}}>Xem ảnh</a>
                  </div>
                  </>
                ) : (
                  <label className="upload-placeholder" style={{ border: '1px dashed #cbd5e1', borderRadius: '4px', padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', fontSize: '13px' }}>
                    <FiCamera size={20} />
                    <span style={{ marginTop: '5px' }}>Thêm ảnh nghiệm thu</span>
                    <input type="file" accept="image/*" hidden onChange={(e) => handleFileSelect(e, stage.id)} disabled={uploadingStageId === stage.id} />
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hiển thị Danh sách giao dịch (nếu được truyền vào từ App.js) - Đưa xuống cuối để gọn giao diện */}
      {children}
    </div>
  );
}

export default Dashboard;
