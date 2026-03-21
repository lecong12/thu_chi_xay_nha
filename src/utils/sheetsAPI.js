const APPSHEET_TABLE_NAME = "GiaoDich"; // Tên bảng trong AppSheet, đảm bảo khớp với AppSheet

const getApiUrl = (appId) => 
  `https://api.appsheet.com/api/v2/apps/${appId}/tables/${encodeURIComponent(APPSHEET_TABLE_NAME)}/Action`;

/**
 * Cập nhật một dòng trong bảng AppSheet.
 * @param {object} rowData - Dữ liệu của dòng cần cập nhật. Phải chứa `appSheetId`.
 * @param {string} appId - App ID của AppSheet.
 * @param {string} accessKey - Application Access Key của AppSheet.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const updateRowInSheet = async (rowData, appId, accessKey) => {
  try {
    const editData = [{
      "_RowNumber": rowData.appSheetId, // QUAN TRỌNG: Dùng appSheetId (chính là _RowNumber) để sửa đúng dòng
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
        "ApplicationAccessKey": accessKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Edit",
        Properties: {
          Locale: "vi-VN",
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
 * @param {object} rowData - Dữ liệu của dòng mới.
 * @param {string} appId - App ID của AppSheet.
 * @param {string} accessKey - Application Access Key của AppSheet.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const addRowToSheet = async (rowData, appId, accessKey) => {
  try {
    // Khi thêm mới, KHÔNG gửi _RowNumber
    const addData = [{
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
        "ApplicationAccessKey": accessKey,
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

export const deleteRowFromSheet = async (rowId, appSheetId, appId, accessKey) => {
  try {
    const response = await fetch(getApiUrl(appId), {
      method: "POST",
      headers: {
        "ApplicationAccessKey": accessKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Delete",
        Properties: { Locale: "vi-VN" },
        Rows: [{
          "id": rowId, // AppSheet bắt buộc phải có giá trị của cột Key (ở đây là 'id')
          "_RowNumber": appSheetId 
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