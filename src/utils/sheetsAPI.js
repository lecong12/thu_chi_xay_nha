// AppSheet API Configuration
const APPSHEET_A3-hS9D7-t8Jsn-ioQ7o-aASZH-Ahfti-adTgF";
const APPSHEET_TABLE_NAME = "data_thu_chi";

const getApiUrl = (appId) => `https://www.appsheet.com/api/v2/apps/${appId}/tables/${APPSHEET_TABLE_NAME}/Action`;
ch all data from AppSheet
export const fetchDataFromAppSheet = async (appId) => {
  try {
    const response = await fetch(getApiUrl(a
      headers: {
        applicationAccessKey: APPion/json",
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
    
    // Deduplicate by _RowNumber (unique row identifier)
    const uniqueData = data.reduce((acc, row) => {
      const rowNumber = row._RowNumber || row.id;
      acc[rowNumber] = row;
      return acc;
    }, {});
    
    const deduplicatedData = Object.values(uniqueData);
    console.log("After deduplication:", deduplicatedData.length, "rows");

    const transformedData = deduplicatedData.map((row) => ({
      id: row._RowNumber || row.id,
      appSheetId: row.id,
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

export const updateRowInSheet = async (rowData, appId) => {
  try {
    // Chuẩn bị data theo format AppSheet: [{id: ..., key: value, ...}]
    const editData = [
      { a
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

    const response = await fetch(getApiUrl(appId), {
      method: "POST",
      headers: {
        applicationAccessKey: APPSHEET_ACCESS_KEY,

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

export const deleteRowFromSheet = async (rowId, appSheetId, appId) => {
  try {
    const response = await fetch(getApiUrl(appId), {
      method: "POST",
      headers: {
        applicationAccessKey: APPSHEET_ACCESS_KEY,
        "Content-Type": "application/json",
     
        Properties: {
          Locale: "en-US",
        },
        Rows: [
          {
            id: appSheetId || rowId,
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
