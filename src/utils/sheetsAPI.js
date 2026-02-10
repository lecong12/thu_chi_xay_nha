// AppSheet API Configuration
const APPSHEET_ACCESS_KEY = process.env.REACT_APP_APPSHEET_ACCESS_KEY;
const APPSHEET_TABLE_NAME = process.env.REACT_APP_APPSHEET_TABLE_NAME || "data_thu_chi";

// Sử dụng encodeURIComponent để xử lý tên bảng có dấu cách hoặc ký tự đặc biệt
const getApiUrl = (appId) => `https://www.appsheet.com/api/v2/apps/${appId}/tables/${encodeURIComponent(APPSHEET_TABLE_NAME)}/Action`;

// Fetch all data from AppSheet
export const fetchDataFromAppSheet = async (appId) => {
  try {
    // Kiểm tra cấu hình trước khi gọi API
    if (!APPSHEET_ACCESS_KEY) {
      throw new Error("Thiếu Access Key. Vui lòng kiểm tra biến môi trường (Environment Variables).");
    }
    if (!appId) {
      throw new Error("Thiếu App ID. Vui lòng kiểm tra biến môi trường (Environment Variables).");
    }
    const apiUrl = getApiUrl(appId);
    console.log(`Đang tải dữ liệu... URL: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "ApplicationAccessKey": APPSHEET_ACCESS_KEY, // Sửa thành PascalCase cho chuẩn
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
      if (response.status === 404) {
        throw new Error(`Lỗi 404: Không tìm thấy bảng "${APPSHEET_TABLE_NAME}". Hãy kiểm tra lại tên bảng trong AppSheet và biến môi trường.`);
      }
      if (response.status === 403) {
        throw new Error("Lỗi 403: Không có quyền truy cập. Hãy kiểm tra Access Key hoặc Deploy ứng dụng.");
      }
      throw new Error(`Lỗi kết nối AppSheet (Mã lỗi: ${response.status})`);
    }

    // Handle cases where the response body is empty (e.g., no rows in the sheet)
    const responseText = await response.text();
    const rawData = responseText ? JSON.parse(responseText) : [];

    // Chuẩn hóa tên cột: xóa dấu hai chấm hoặc khoảng trắng thừa ở cuối (ví dụ "loaiThuChi:" -> "loaiThuChi")
    const normalizedData = rawData.map((row) => {
      const newRow = {};
      Object.keys(row).forEach((key) => {
        const cleanKey = key.trim().replace(/:$/, "");
        newRow[cleanKey] = row[key];
      });
      return newRow;
    });
    
    console.log("Raw data from AppSheet:", normalizedData);
    console.log("Total rows:", normalizedData.length);

    if (normalizedData.length > 0) {
      const firstRow = normalizedData[0];
      const currentKeys = Object.keys(firstRow);
      console.log("Sample row keys (Tên cột nhận được):", currentKeys);

      // Kiểm tra các cột quan trọng
      const requiredCols = ["id", "ngay", "loaiThuChi", "soTien"];
      const missingCols = requiredCols.filter(col => !currentKeys.includes(col));

      if (missingCols.length > 0) {
        const msg = `Dữ liệu không khớp! Không tìm thấy cột: [${missingCols.join(", ")}]. AppSheet đang trả về: [${currentKeys.join(", ")}]. Hãy kiểm tra lại tên cột trong Google Sheet (phải là tiếng Việt không dấu: ngay, loaiThuChi, soTien) và Regenerate Structure trong AppSheet.`;
        throw new Error(msg);
      }
    }
    
    // Deduplicate by _RowNumber (unique row identifier)
    const uniqueData = normalizedData.reduce((acc, row, index) => {
      // Sử dụng _RowNumber hoặc id nếu có, nếu không dùng index để tránh mất dữ liệu do trùng key undefined
      const rowKey = row._RowNumber || row.id || `row_${index}`;
      acc[rowKey] = row;
      return acc;
    }, {});
    
    const deduplicatedData = Object.values(uniqueData);
    console.log("After deduplication:", deduplicatedData.length, "rows");

    const transformedData = deduplicatedData.map((row, index) => ({
      id: row._RowNumber || row.id || `generated_id_${index}`,
      appSheetId: row.id,
      ngay: row.ngay ? new Date(row.ngay) : new Date(),
      nguoiCapNhat: row.nguoiCapNhat ? row.nguoiCapNhat.toString().trim() : "",
      loaiThuChi: (() => {
        const val = row.loaiThuChi ? row.loaiThuChi.toString().trim() : "";
        if (val.toLowerCase() === "thu") return "Thu";
        if (val.toLowerCase() === "chi") return "Chi";
        return val;
      })(),
      noiDung: row.noiDung || "",
      doiTuongThuChi: row.doiTuongThuChi ? row.doiTuongThuChi.toString().trim() : "",
      soTien: (() => {
        // Xử lý số tiền: loại bỏ cả dấu phẩy (,) và dấu chấm (.) để hỗ trợ định dạng tiền tệ Việt Nam/Mỹ
        // Ví dụ: "1,000,000" hoặc "1.000.000" đều thành 1000000
        const val = row.soTien?.toString().replace(/[.,]/g, "") || "0";
        const number = parseFloat(val);
        return isNaN(number) ? 0 : number;
      })(),
      ghiChu: row.ghiChu || "",
    }));

    return { success: true, data: transformedData };
  } catch (error) {
    console.error("Error fetching from AppSheet:", error);
    return {
      success: false,
      message: error.message,
      data: [],
    };
  }
};

export const updateRowInSheet = async (rowData, appId) => {
  try {
    // Chuẩn bị data theo format AppSheet: [{id: ..., key: value, ...}]
    const editData = [
      {
        id: rowData.appSheetId || rowData.id,
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
        "ApplicationAccessKey": APPSHEET_ACCESS_KEY,
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

    // Edit action might return an empty body on success, so we handle it
    const responseText = await response.text();
    const result = responseText ? JSON.parse(responseText) : null;
    console.log("Kết quả edit:", result);

    return { success: true, message: "Cập nhật thành công" };
  } catch (error) {
    console.error("Error updating AppSheet:", error);
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
    return { success: false, message: error.message };
  }
};
