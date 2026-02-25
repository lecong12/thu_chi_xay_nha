// AppSheet API Configuration
const APPSHEET_ACCESS_KEY = process.env.REACT_APP_APPSHEET_ACCESS_KEY;
// Ưu tiên lấy từ biến môi trường, nếu không có thì dùng giá trị mặc định
const APPSHEET_TABLE_NAME = process.env.REACT_APP_APPSHEET_TABLE_NAME || "data_thu_chi";
// Sử dụng encodeURIComponent để xử lý tên bảng có dấu cách hoặc ký tự đặc biệt
const getApiUrl = (appId) => `https://www.appsheet.com/api/v2/apps/${appId}/tables/${encodeURIComponent(APPSHEET_TABLE_NAME)}/Action`;

// Helper để map tên cột tiếng Việt/Tiếng Anh sang chuẩn code (Đưa ra ngoài để tái sử dụng)
const normalizeKey = (key) => {
  const k = key.toLowerCase().trim().replace(/:$/, "");
  if (['ngay', 'ngày', 'date', 'time', 'thời gian', 'ngày tháng'].includes(k)) return 'ngay';
  if (['sotien', 'so tien', 'số tiền', 'amount', 'price', 'giá', 'chi phí', 'thành tiền', 'trị giá', 'giá trị'].includes(k)) return 'soTien';
  if (['loaithuchi', 'loai thu chi', 'loại thu chi', 'type', 'category', 'phân loại', 'loại', 'hạng mục'].includes(k)) return 'loaiThuChi';
  if (['noidung', 'noi dung', 'nội dung', 'content', 'description', 'mô tả', 'diễn giải', 'chi tiết'].includes(k)) return 'noiDung';
  if (['doituongthuchi', 'doi tuong thu chi', 'đối tượng thu chi', 'nguoichi', 'người chi', 'nguoinhan', 'người nhận', 'đối tượng', 'khách hàng', 'nhóm'].includes(k)) return 'doiTuongThuChi';
  if (['ghichu', 'ghi chu', 'ghi chú', 'note', 'notes'].includes(k)) return 'ghiChu';
  if (['nguoicapnhat', 'nguoi cap nhat', 'người cập nhật', 'user', 'người tạo', 'nhân viên'].includes(k)) return 'nguoiCapNhat';
  return key.trim().replace(/:$/, ""); // Fallback: giữ nguyên hoặc chỉ trim
};

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

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "ApplicationAccessKey": APPSHEET_ACCESS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Find",
        Properties: {
          Locale: "vi-VN",
          Timezone: "Asia/Ho_Chi_Minh",
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

    // Chuẩn hóa tên cột
    const normalizedDataFromRaw = rawData.map((row) => {
      const newRow = {};
      Object.keys(row).forEach((key) => {
        const cleanKey = normalizeKey(key);
        newRow[cleanKey] = row[key];
      });
      return newRow;
    });
    
    if (normalizedDataFromRaw.length === 0) {
      console.warn("AppSheet trả về danh sách rỗng. Nguyên nhân có thể do: 1. Bảng chưa có dữ liệu. 2. AppSheet có 'Security Filter' (Bộ lọc bảo mật) đang chặn API (ví dụ: lọc theo USEREMAIL()).");
    }

    if (normalizedDataFromRaw.length > 0) {
      const firstRow = normalizedDataFromRaw[0];
      const currentKeys = Object.keys(firstRow);

      // Kiểm tra các cột quan trọng
      // Bỏ 'id' khỏi danh sách bắt buộc vì AppSheet có thể không trả về nếu chưa cấu hình Key
      const requiredCols = ["ngay", "loaiThuChi", "soTien"];
      const missingCols = requiredCols.filter(col => !currentKeys.includes(col));

      if (missingCols.length > 0) {
        // Thay vì báo lỗi và dừng lại, ta chỉ cảnh báo để dữ liệu vẫn có thể hiển thị một phần
        console.error(`CẢNH BÁO: Không tìm thấy cột: [${missingCols.join(", ")}]. AppSheet đang trả về: [${currentKeys.join(", ")}]. Dữ liệu có thể hiển thị không đúng.`);
        // throw new Error(msg); // Đã tắt throw Error để cho phép hiển thị dữ liệu một phần
      }
    }
    
    // Deduplicate data to prevent duplicate rows from AppSheet API
    const uniqueDataMap = new Map();
    normalizedDataFromRaw.forEach(row => {
      // Ưu tiên dùng _RowNumber làm key, nếu không có thì tạo fingerprint từ nội dung
      let fingerprint;
      if (row._RowNumber) {
        fingerprint = row._RowNumber;
      } else {
        // Sắp xếp key để đảm bảo thứ tự JSON stringify giống nhau
        const sortedKeys = Object.keys(row).sort();
        const sortedObj = {};
        sortedKeys.forEach(key => sortedObj[key] = row[key]);
        fingerprint = JSON.stringify(sortedObj);
      }

      if (!uniqueDataMap.has(fingerprint)) {
        uniqueDataMap.set(fingerprint, row);
      }
    });
    const deduplicatedData = Array.from(uniqueDataMap.values());

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
        soTien: rowData.soTien ? rowData.soTien.toString() : "0",
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

    return { success: true, message: "Cập nhật thành công" };
  } catch (error) {
    console.error("Error updating AppSheet:", error);
    return { success: false, message: error.message };
  }
};

export const addRowToSheet = async (rowData, appId) => {
  try {
    // Chuẩn bị data. Không gửi ID để AppSheet tự sinh (theo công thức Initial Value)
    const addData = [
      {
        ngay: rowData.ngay instanceof Date ? rowData.ngay.toISOString().split("T")[0] : rowData.ngay,
        nguoiCapNhat: rowData.nguoiCapNhat,
        loaiThuChi: rowData.loaiThuChi,
        noiDung: rowData.noiDung,
        doiTuongThuChi: rowData.doiTuongThuChi,
        soTien: rowData.soTien ? rowData.soTien.toString() : "0",
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
        Action: "Add",
        Properties: {
          Locale: "vi-VN",
          Timezone: "Asia/Ho_Chi_Minh",
        },
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
