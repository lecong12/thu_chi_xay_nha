// AppSheet API Configuration
const APPSHEET_TABLE_NAME = "GiaoDich";
const APPSHEET_ACCESS_KEY = process.env.REACT_APP_APPSHEET_ACCESS_KEY;

// Sử dụng endpoint chuẩn của AppSheet
const getApiUrl = (appId, tableName = APPSHEET_TABLE_NAME) => 
  `https://www.appsheet.com/api/v2/apps/${appId}/tables/${encodeURIComponent(tableName)}/Action`;

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
    console.error("Error fetching from AppSheet:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Wrapper để tương thích với code cũ nếu có chỗ nào còn gọi hàm này
 */
export const fetchDataFromAppSheet = (appId, accessKey) => {
  return fetchTableData(APPSHEET_TABLE_NAME, appId, accessKey);
};

/**
 * Cập nhật một dòng trong bảng AppSheet.
 */
export const updateRowInSheet = async (rowData, appId, accessKey) => {
  try {
    let rowId = rowData.keyId || rowData.id;

    // Xử lý lỗi 400: Nếu AppSheet yêu cầu cột id là Number nhưng code đang giữ chuỗi "GD_..."
    if (typeof rowId === 'string' && rowId.startsWith('GD_')) {
      const numericPart = rowId.replace(/\D/g, ''); // Lấy phần số
      if (numericPart) rowId = Number(numericPart);
    }

    // Chuẩn bị payload khớp với tên cột trong Google Sheet
    const editData = [{
      "id": rowId, // Key column để nhận diện dòng
      "Ngày": rowData.ngay instanceof Date ? rowData.ngay.toISOString().split("T")[0] : rowData.ngay,
      "Hạng mục": rowData.doiTuongThuChi,
      "Nội dung": rowData.noiDung,
      "Số tiền": rowData.soTien ? rowData.soTien.toString() : "0",
      "Người cập nhật": rowData.nguoiCapNhat || "", // Cột F
      "Chứng từ": rowData.hinhAnh || "",            // Cột G (Link ảnh)
    }];

    const response = await fetch(getApiUrl(appId), {
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
        Rows: editData,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    return { success: true, message: "Cập nhật thành công" };
  } catch (error) {
    console.error("Error updating AppSheet:", error);
    return { success: false, message: `Lỗi khi cập nhật: ${error.message}` };
  }
};

/**
 * Thêm một dòng mới vào bảng AppSheet.
 */
export const addRowToSheet = async (rowData, appId, accessKey) => {
  try {
    // Sử dụng ID đã được tính toán từ frontend
    let newId = rowData.id;

    // Xử lý lỗi 400: AppSheet cột id là Number nhưng frontend gửi chuỗi "GD_..."
    if (typeof newId === 'string' && newId.startsWith('GD_')) {
      const numericPart = newId.replace(/\D/g, ''); // Lấy phần số (timestamp)
      if (numericPart) {
        newId = Number(numericPart);
      }
    }

    // Payload gửi đi
    const addData = [{
      "id": newId, 
      "Ngày": rowData.ngay instanceof Date ? rowData.ngay.toISOString().split("T")[0] : rowData.ngay,
      "Hạng mục": rowData.doiTuongThuChi,
      "Nội dung": rowData.noiDung,
      "Số tiền": rowData.soTien ? rowData.soTien.toString() : "0",
      "Người cập nhật": rowData.nguoiCapNhat || "", // Cột F
      "Chứng từ": rowData.hinhAnh || "",            // Cột G (Link ảnh)
    }];

    const response = await fetch(getApiUrl(appId), {
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
        Rows: addData,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    return { success: true, message: "Thêm mới thành công" };
  } catch (error) {
    console.error("Error adding to AppSheet:", error);
    return { success: false, message: `Lỗi khi thêm mới: ${error.message}` };
  }
};

/**
 * Xóa một dòng khỏi bảng AppSheet.
 */
export const deleteRowFromSheet = async (rowId, appSheetId, appId, accessKey) => {
  try {
    const response = await fetch(getApiUrl(appId), {
      method: "POST",
      headers: {
        "ApplicationAccessKey": accessKey || APPSHEET_ACCESS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Delete",
        Properties: { Locale: "vi-VN" },
        Rows: [{
          "id": rowId // Chỉ gửi Key column khi xóa
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    return { success: true, message: "Xóa thành công" };
  } catch (error) {
    console.error("Error deleting from AppSheet:", error);
    return { success: false, message: `Lỗi khi xóa: ${error.message}` };
  }
};
