// AppSheet API Configuration
<<<<<<< HEAD
const APPSHEET_TABLE_NAME = "GiaoDich";
const APPSHEET_ACCESS_KEY = process.env.REACT_APP_APPSHEET_ACCESS_KEY;
=======
const APPSHEET_APP_ID = "f3e183ba-cb36-4be2-a1d2-7875985f2b4a";
const APPSHEET_ACCESS_KEY =
  "V2-ESOKa-VoG63-hS9D7-t8Jsn-ioQ7o-aASZH-Ahfti-adTgF";
const APPSHEET_TABLE_NAME = "data_thu_chi";
>>>>>>> a805ca1e (Remove localStorage cache, use AppSheet ID directly, fix duplicate data)

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
<<<<<<< HEAD
        "ApplicationAccessKey": accessKey || APPSHEET_ACCESS_KEY,
=======
        applicationAccessKey: APPSHEET_ACCESS_KEY,
>>>>>>> a805ca1e (Remove localStorage cache, use AppSheet ID directly, fix duplicate data)
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Find",
        Properties: {
<<<<<<< HEAD
          Locale: "en-US", // Dùng en-US khi đọc để ngày tháng có định dạng chuẩn YYYY-MM-DD dễ xử lý
          Timezone: "Asia/Ho_Chi_Minh",
        },
        Rows: [], // Lấy toàn bộ dòng
=======
          Locale: "en-US",
        },
        Rows: [],
>>>>>>> a805ca1e (Remove localStorage cache, use AppSheet ID directly, fix duplicate data)
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${text}`);
    }

    const data = await response.json();
<<<<<<< HEAD
    // AppSheet trả về mảng object hoặc object rỗng nếu lỗi/không có dữ liệu
    return { success: true, data: Array.isArray(data) ? data : [] };
  } catch (error) {
    console.error("Error fetching from AppSheet:", error);
    return { success: false, message: error.message };
=======
    
    console.log("Raw data from AppSheet:", data);
    console.log("Total rows:", data.length);

    const transformedData = data.map((row) => ({
      id: row.id,
      ngay: row.ngay ? new Date(row.ngay) : new Date(),
      nguoiCapNhat: row.nguoiCapNhat || "",
      loaiThuChi: row.loaiThuChi || "",
      noiDung: row.noiDung || "",
      doiTuongThuChi: row.doiTuongThuChi || "",
      soTien: parseFloat(row.soTien?.toString().replace(/,/g, "") || 0),
      ghiChu: row.ghiChu || "",
    }));

    return { success: true, data: transformedData };
  } catch (error) {
    console.error("Error fetching from AppSheet:", error);
    return {
      success: false,
      message: "Lỗi tải dữ liệu: " + error.message,
      data: [],
    };
>>>>>>> a805ca1e (Remove localStorage cache, use AppSheet ID directly, fix duplicate data)
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
<<<<<<< HEAD
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
=======
    // Chuẩn bị data theo format AppSheet: [{id: ..., key: value, ...}]
    const editData = [
      {
        id: rowData.id,
        ngay:
          rowData.ngay instanceof Date
            ? rowData.ngay.toISOString().split("T")[0]
            : rowData.ngay,
        nguoiCapNhat: rowData.nguoiCapNhat,
        loaiThuChi: rowData.loaiThuChi,
        noiDung: rowData.noiDung,
        doiTuongThuChi: rowData.doiTuongThuChi,
        soTien: rowData.soTien.toString(),
        ghiChu: rowData.ghiChu || "",
      },
    ];
>>>>>>> a805ca1e (Remove localStorage cache, use AppSheet ID directly, fix duplicate data)

    const response = await fetch(getApiUrl(appId), {
      method: "POST",
      headers: {
<<<<<<< HEAD
        "ApplicationAccessKey": accessKey || APPSHEET_ACCESS_KEY,
=======
        applicationAccessKey: APPSHEET_ACCESS_KEY,
>>>>>>> a805ca1e (Remove localStorage cache, use AppSheet ID directly, fix duplicate data)
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Edit",
<<<<<<< HEAD
        Properties: {
          Locale: "vi-VN", // Dùng vi-VN khi ghi để tương thích số liệu/ngày tháng tiếng Việt
          Timezone: "Asia/Ho_Chi_Minh",
        },
=======
        Properties: {},
>>>>>>> a805ca1e (Remove localStorage cache, use AppSheet ID directly, fix duplicate data)
        Rows: editData,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

<<<<<<< HEAD
=======
    const result = await response.json();
    console.log("Kết quả edit:", result);

>>>>>>> a805ca1e (Remove localStorage cache, use AppSheet ID directly, fix duplicate data)
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
<<<<<<< HEAD
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
=======
        applicationAccessKey: APPSHEET_ACCESS_KEY,
>>>>>>> a805ca1e (Remove localStorage cache, use AppSheet ID directly, fix duplicate data)
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Delete",
<<<<<<< HEAD
        Properties: { Locale: "vi-VN" },
        Rows: [{
          "id": rowId // Chỉ gửi Key column khi xóa
        }],
=======
        Properties: {
          Locale: "en-US",
        },
        Rows: [
          {
            id: rowId,
          },
        ],
>>>>>>> a805ca1e (Remove localStorage cache, use AppSheet ID directly, fix duplicate data)
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

<<<<<<< HEAD
=======
    // AppSheet Delete trả về array rỗng hoặc row đã xóa
>>>>>>> a805ca1e (Remove localStorage cache, use AppSheet ID directly, fix duplicate data)
    return { success: true, message: "Xóa thành công" };
  } catch (error) {
    console.error("Error deleting from AppSheet:", error);
    return { success: false, message: `Lỗi khi xóa: ${error.message}` };
  }
};
