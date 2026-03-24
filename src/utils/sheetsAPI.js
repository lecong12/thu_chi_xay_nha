// AppSheet API Configuration
const APPSHEET_ACCESS_KEY = process.env.REACT_APP_APPSHEET_ACCESS_KEY;

// Sử dụng endpoint chuẩn của AppSheet
const getApiUrl = (appId, tableName) => 
  `https://www.appsheet.com/api/v2/apps/${appId}/tables/${encodeURIComponent(tableName)}/Action`;

const formatRowId = (id) => {
  if (typeof id === 'string' && id.startsWith('GD_')) {
    const numericPart = id.replace(/\D/g, '');
    return numericPart ? Number(numericPart) : id;
  }
  return id;
};

/**
 * Hàm lấy dữ liệu chung cho bất kỳ bảng nào từ AppSheet
 */
export const fetchTableData = async (tableName, appId, accessKey) => {
  try {
    const response = await fetch(getApiUrl(appId, tableName), {
      method: "POST",
      headers: {
        "ApplicationAccessKey": accessKey || APPSHEET_ACCESS_KEY,
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

/**
 * Cập nhật dòng linh hoạt cho MỌI bảng
 */
export const updateRowInSheet = async (tableName, rowData, appId, accessKey) => {
  try {
    const payload = { ...rowData };
    if (payload.id) payload.id = formatRowId(payload.id);
    if (payload.keyId) {
       if (!payload.id) payload.id = formatRowId(payload.keyId);
       delete payload.keyId;
    }

    const response = await fetch(getApiUrl(appId, tableName), {
      method: "POST",
      headers: {
        "ApplicationAccessKey": accessKey || APPSHEET_ACCESS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Edit",
        Properties: {
          Locale: "vi-VN", // Dùng vi-VN khi ghi để tương thích số liệu/ngày tháng tiếng Việt
          Timezone: "Asia/Ho_Chi_Minh",
        },
        Rows: [payload],
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
export const addRowToSheet = async (tableName, rowData, appId, accessKey) => {
  try {
    const payload = { ...rowData };
    if (payload.id) payload.id = formatRowId(payload.id);

    const response = await fetch(getApiUrl(appId, tableName), {
      method: "POST",
      headers: {
        "ApplicationAccessKey": accessKey || APPSHEET_ACCESS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Add",
        Properties: {
          Locale: "vi-VN",
          Timezone: "Asia/Ho_Chi_Minh",
        },
        Rows: [payload],
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
export const deleteRowFromSheet = async (tableName, rowId, appId, accessKey) => {
  try {
    const response = await fetch(getApiUrl(appId, tableName), {
      method: "POST",
      headers: {
        "ApplicationAccessKey": accessKey || APPSHEET_ACCESS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Delete",
        Properties: { Locale: "vi-VN" },
        Rows: [{ id: formatRowId(rowId) }],
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

// Wrapper tương thích ngược (nếu cần)
export const fetchDataFromAppSheet = (appId, accessKey) => fetchTableData("GiaoDich", appId, accessKey);
