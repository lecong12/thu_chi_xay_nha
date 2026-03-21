const APPSHEET_ACCESS_KEY = process.env.REACT_APP_APPSHEET_ACCESS_KEY;
const APPSHEET_TABLE_NAME = "GiaoDich"; // Tên bảng trong AppSheet

const getApiUrl = (appId) => 
  `https://www.appsheet.com/api/v2/apps/${appId}/tables/${encodeURIComponent(APPSHEET_TABLE_NAME)}/Action`;

export const updateRowInSheet = async (rowData, appId) => {
  try {
    // Chuẩn bị dữ liệu gửi đi (Map key theo tên cột trong AppSheet)
    const editData = [{
      "_RowNumber": rowData.appSheetId || rowData.id,
      "Ngày": rowData.ngay instanceof Date ? rowData.ngay.toISOString().split("T")[0] : rowData.ngay,
      "Hạng mục": rowData.doiTuongThuChi || "",
      "Nội dung": rowData.noiDung || "",
      "Số tiền": rowData.soTien ? String(rowData.soTien) : "0",
      "Minh chứng": rowData.hinhAnh || "",
      "Ghi chú": rowData.ghiChu || "",
      "Người cập nhật": rowData.nguoiCapNhat || ""
    }];

    const response = await fetch(getApiUrl(appId), {
      method: "POST",
      headers: {
        "ApplicationAccessKey": APPSHEET_ACCESS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Edit",
        Properties: { Locale: "vi-VN" },
        Rows: editData,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return { success: true, message: "Cập nhật thành công" };
  } catch (error) {
    console.error("Error updating AppSheet:", error);
    return { success: false, message: error.message };
  }
};

export const addRowToSheet = async (rowData, appId) => {
  try {
    const addData = [{
      "Ngày": rowData.ngay instanceof Date ? rowData.ngay.toISOString().split("T")[0] : rowData.ngay,
      "Hạng mục": rowData.doiTuongThuChi || "",
      "Nội dung": rowData.noiDung || "",
      "Số tiền": rowData.soTien ? String(rowData.soTien) : "0",
      "Minh chứng": rowData.hinhAnh || "",
      "Ghi chú": rowData.ghiChu || "",
      "Người cập nhật": rowData.nguoiCapNhat || ""
    }];

    const response = await fetch(getApiUrl(appId), {
      method: "POST",
      headers: {
        "ApplicationAccessKey": APPSHEET_ACCESS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Add",
        Properties: { Locale: "vi-VN" },
        Rows: addData,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return { success: true, message: "Thêm mới thành công" };
  } catch (error) {
    console.error("Error adding to AppSheet:", error);
    return { success: false, message: error.message };
  }
};

export const deleteRowFromSheet = async (rowId, appSheetId, appId) => {
  try {
    const response = await fetch(getApiUrl(appId), {
      method: "POST",
      headers: {
        "ApplicationAccessKey": APPSHEET_ACCESS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Delete",
        Properties: { Locale: "vi-VN" },
        Rows: [{ "_RowNumber": appSheetId || rowId }],
      }),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return { success: true, message: "Xóa thành công" };
  } catch (error) {
    console.error("Error deleting from AppSheet:", error);
    return { success: false, message: error.message };
  }
};