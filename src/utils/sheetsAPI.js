// AppSheet API Configuration
const APPSHEET_ACCESS_KEY = process.env.REACT_APP_APPSHEET_ACCESS_KEY;

const formatRowId = (id) => {
  if (id === null || id === undefined) return id;
  if (typeof id === 'string') {
    // Nếu chuỗi có định dạng PREFIX_12345 hoặc chỉ là số
    const parts = id.split('_');
    const possibleNum = parts.length > 1 ? parts[1] : parts[0];
    if (!isNaN(possibleNum) && possibleNum.trim() !== "") {
      return Number(possibleNum);
    }
  }
  return id;
};

// Sử dụng endpoint chuẩn của AppSheet, có thể thay đổi tên bảng linh hoạt
const getApiUrl = (appId, tableName) => 
  `https://www.appsheet.com/api/v2/apps/${appId}/tables/${encodeURIComponent(tableName)}/Action`;

/**
 * Hàm lấy dữ liệu chung cho bất kỳ bảng nào từ AppSheet
 */
export const fetchTableData = async (tableName, appId) => {
  try {
    const response = await fetch(getApiUrl(appId, tableName), {
      method: "POST",
      headers: {
        "ApplicationAccessKey": APPSHEET_ACCESS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Find",
        Properties: {
          Locale: "en-US", // Dùng en-US khi đọc để ngày tháng có định dạng chuẩn YYYY-MM-DD dễ xử lý
          Timezone: "Asia/Ho_Chi_Minh",
        },
        Rows: [], // Lấy toàn bộ dòng
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${text}`);
    }

    const data = await response.json();
    // AppSheet trả về mảng object hoặc object rỗng nếu lỗi/không có dữ liệu
    return { success: true, data: Array.isArray(data) ? data : [] };
  } catch (error) {
    console.error(`Error fetching ${tableName}:`, error);
    return { success: false, message: error.message };
  }
};

// Helper function to fetch data with specific column mapping for files (Contracts, Drawings)
export const fetchFileData = async (tableName, appId) => {
  try {
    const { success, data, message } = await fetchTableData(tableName, appId);
    if (!success) return { success, data, message };

    return {
      success: true,
      data: data.map(row => ({
        ...row,
        url: row.url || row.URL || row.Link || row['Link PDF'] || row['File URL'] || row.file || '' // Flexible URL mapping
      }))
    };
  } catch (error) {
    console.error(`Error fetching ${tableName}:`, error);
    return { success: false, message: error.message };
  }
};

/**
 * Cập nhật dòng linh hoạt cho MỌI bảng
 */
export const updateRowInSheet = async (tableName, payload, appId) => {
  try {
    // AppSheet cần ID để biết dòng nào cần sửa
    if (!payload.id) {
        throw new Error("Thiếu 'id' để cập nhật dòng.");
    }

    // Đảm bảo ID được định dạng là số nếu AppSheet yêu cầu (loại bỏ GD_, CT_, BV_...)
    const formattedPayload = { 
      ...payload, 
      id: formatRowId(payload.id) 
    };

    // AppSheet cần ID để biết dòng nào cần sửa, và các trường khác để cập nhật
    const response = await fetch(getApiUrl(appId, tableName), {
      method: "POST",
      headers: {
        "ApplicationAccessKey": APPSHEET_ACCESS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Edit",
        Properties: {
          Locale: "vi-VN", // Dùng vi-VN khi ghi để tương thích số liệu/ngày tháng tiếng Việt
          Timezone: "Asia/Ho_Chi_Minh",
        },
        Rows: [formattedPayload],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    return { success: true, message: "Cập nhật thành công" };
  } catch (error) {
    console.error(`Error updating ${tableName}:`, error);
    return { success: false, message: error.message };
  }
};

/**
 * Thêm dòng mới linh hoạt
 */
export const addRowToSheet = async (tableName, payload, appId) => {
  try {
    // Đảm bảo ID được định dạng chuẩn số trước khi thêm mới
    const formattedPayload = { 
      ...payload, 
      id: formatRowId(payload.id) 
    };

    const response = await fetch(getApiUrl(appId, tableName), {
      method: "POST",
      headers: {
        "ApplicationAccessKey": APPSHEET_ACCESS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Add",
        Properties: {
          Locale: "vi-VN",
          Timezone: "Asia/Ho_Chi_Minh",
        },
        Rows: [formattedPayload], // Gửi payload đã chuẩn hóa
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    return { success: true, message: "Thêm mới thành công" };
  } catch (error) {
    console.error(`Error adding to ${tableName}:`, error);
    return { success: false, message: error.message };
  }
};

/**
 * Xóa dòng khỏi bất kỳ bảng nào
 */
export const deleteRowFromSheet = async (tableName, payloadId, appId) => {
  try {
    const response = await fetch(getApiUrl(appId, tableName), {
      method: "POST",
      headers: {
        "ApplicationAccessKey": APPSHEET_ACCESS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Delete",
        Properties: { Locale: "vi-VN" },
        Rows: [{ id: formatRowId(payloadId) }], // Chỉ cần gửi ID của dòng cần xóa
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    return { success: true, message: "Xóa thành công" };
  } catch (error) {
    console.error(`Error deleting from ${tableName}:`, error);
    return { success: false, message: error.message };
  }
};
