const APPSHEET_TABLE_NAME = "GiaoDich";
const APPSHEET_ACCESS_KEY = process.env.REACT_APP_APPSHEET_ACCESS_KEY;

const getApiUrl = (appId, tableName = APPSHEET_TABLE_NAME) => 
  `https://api.appsheet.com/api/v2/apps/${appId}/tables/${encodeURIComponent(tableName)}/Action`;

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
          Locale: "en-US", // Chuyển sang en-US để AppSheet trả về định dạng ngày chuẩn (YYYY-MM-DD hoặc MM/DD/YYYY) dễ xử lý hơn
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
    // AppSheet trả về mảng object hoặc object rỗng nếu lỗi
    return { success: true, data: Array.isArray(data) ? data : [] };
  } catch (error) {
    console.error("Error fetching from AppSheet:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Giữ lại hàm này để tương thích ngược nếu cần, nhưng trỏ về hàm chung
 */
export const fetchDataFromAppSheet = (appId, accessKey) => {
  return fetchTableData(APPSHEET_TABLE_NAME, appId, accessKey);
};

/**
 * Cập nhật một dòng trong bảng AppSheet.
 */
export const updateRowInSheet = async (rowData, appId, accessKey) => {
  try {
    const editData = [{
      "id": rowData.keyId || rowData.id, // Fallback: Nếu không có keyId thì dùng id
      // "_RowNumber": rowData.appSheetId, // Bỏ RowNumber, chỉ dùng ID (Key) để update cho an toàn giống hàm Xóa
      "Ngày": rowData.ngay instanceof Date ? rowData.ngay.toISOString().split("T")[0] : rowData.ngay,
      "Hạng mục": rowData.doiTuongThuChi,
      "Nội dung": rowData.noiDung,
      "Số tiền": rowData.soTien ? rowData.soTien.toString() : "0",
      "Minh chứng": rowData.hinhAnh || "",
      "Ghi chú": rowData.ghiChu || "",
      "Người cập nhật": rowData.nguoiCapNhat || ""
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
          Locale: "en-US", // Quan trọng: en-US hỗ trợ tốt định dạng ngày YYYY-MM-DD
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
    // Sử dụng ID đã được tính toán từ App.js (Max + 1)
    const newId = rowData.id;

    // Khi thêm mới, KHÔNG gửi _RowNumber
    const addData = [{
      "id": newId, 
      "Ngày": rowData.ngay instanceof Date ? rowData.ngay.toISOString().split("T")[0] : rowData.ngay,
      "Hạng mục": rowData.doiTuongThuChi,
      "Nội dung": rowData.noiDung,
      "Số tiền": rowData.soTien ? rowData.soTien.toString() : "0",
      "Minh chứng": rowData.hinhAnh || "",
      "Ghi chú": rowData.ghiChu || "",
      "Người cập nhật": rowData.nguoiCapNhat || "",
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
          Locale: "en-US", // Đồng bộ Locale
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
