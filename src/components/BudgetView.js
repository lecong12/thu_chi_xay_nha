import React from 'react';

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

function BudgetView({ budget = [] }) {
  return (
    <div className="budget-section chart-card">
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
  );
}

export default BudgetView;