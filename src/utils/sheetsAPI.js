// AppSheet API Configuration
const APPSHEET_APP_ID = "f3e183ba-cb36-4be2-a1d2-7875985f2b4a";
const APPSHEET_ACCESS_KEY =
  "V2-ESOKa-VoG63-hS9D7-t8Jsn-ioQ7o-aASZH-Ahfti-adTgF";
const APPSHEET_TABLE_NAME = "data_thu_chi";

const APPSHEET_API_BASE = `https://www.appsheet.com/api/v2/apps/${APPSHEET_APP_ID}/tables/${APPSHEET_TABLE_NAME}/Action`;

// Fetch all data from AppSheet
export const fetchDataFromAppSheet = async () => {
  try {
    const response = await fetch(APPSHEET_API_BASE, {
      method: "POST",
      headers: {
        applicationAccessKey: APPSHEET_ACCESS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Find",
        Properties: {
          Locale: "en-US",
        },
        Rows: [],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
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
  }
};

export const updateRowInSheet = async (rowData) => {
  try {
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

    const response = await fetch(APPSHEET_API_BASE, {
      method: "POST",
      headers: {
        applicationAccessKey: APPSHEET_ACCESS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Edit",
        Properties: {},
        Rows: editData,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("Kết quả edit:", result);

    return { success: true, message: "Cập nhật thành công" };
  } catch (error) {
    console.error("Error updating AppSheet:", error);
    return { success: false, message: "Lỗi cập nhật: " + error.message };
  }
};

export const deleteRowFromSheet = async (rowId) => {
  try {
    const response = await fetch(APPSHEET_API_BASE, {
      method: "POST",
      headers: {
        applicationAccessKey: APPSHEET_ACCESS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Delete",
        Properties: {
          Locale: "en-US",
        },
        Rows: [
          {
            id: rowId,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // AppSheet Delete trả về array rỗng hoặc row đã xóa
    return { success: true, message: "Xóa thành công" };
  } catch (error) {
    console.error("Error deleting from AppSheet:", error);
    return { success: false, message: "Lỗi xóa: " + error.message };
  }
};
