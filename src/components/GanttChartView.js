import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const dayDiff = (date1, date2) => {
  if (!date1 || !date2) return 0;
  const d1 = new Date(date1);
  d1.setHours(0, 0, 0, 0);
  const d2 = new Date(date2);
  d2.setHours(0, 0, 0, 0);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
};

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

function GanttChartView({ stages = [] }) {
  const ganttData = useMemo(() => {
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
      const duration = dayDiff(dStart, dEnd) + 1;
      const name = stage.name.replace(/^\d+\.\s*/, "");

      let color = "#a8a29e";
      if (stage.status === 'Đang thi công') color = '#3b82f6';
      if (stage.status === 'Hoàn thành') color = '#16a34a';

      const dateRange = `${dStart.toLocaleDateString('vi-VN')} - ${dEnd.toLocaleDateString('vi-VN')}`;

      return { name, dateRange, startDay, duration, color };
    });
  }, [stages]);

  // Tính chiều cao động: 50px cho mỗi dòng, tối thiểu 450px
  const dynamicHeight = Math.max(450, ganttData.length * 50);

  return (
    <div className="chart-card">
      <h3 className="chart-title">Biểu đồ tiến độ (Gantt)</h3>
      {ganttData.length > 0 ? (
        <ResponsiveContainer width="100%" height={dynamicHeight}>
          <BarChart data={ganttData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <XAxis type="number" domain={['dataMin', 'dataMax + 5']} tickFormatter={(tick) => `Ngày ${tick}`} tick={{ fill: "#6b7280", fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fill: "#374151", fontSize: 12 }} interval={0} />
            <Tooltip cursor={{fill: 'rgba(239, 246, 255, 0.5)'}} content={<GanttTooltip />} />
            <Bar dataKey="startDay" stackId="a" fill="transparent" />
            <Bar dataKey="duration" stackId="a" radius={[4, 4, 4, 4]}>
              {ganttData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="no-data">Chưa có dữ liệu ngày bắt đầu/kết thúc để vẽ biểu đồ.</div>
      )}
    </div>
  );
}

export default GanttChartView;