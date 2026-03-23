const APPSHEET_ACCESS_KEY = process.env.REACT_APP_APPSHEET_ACCESS_KEY;
const STAGES_TABLE_NAME = "TienDo"; // Tên bảng chứa dữ liệu tiến độ

const getApiUrl = (appId) => `https://www.appsheet.com/api/v2/apps/${appId}/tables/${encodeURIComponent(STAGES_TABLE_NAME)}/Action`;

/**
 * Lấy danh sách các giai đoạn từ bảng data_tien_do
 */
export const fetchStages = async (appId) => {
  try {
    if (!appId) throw new Error("Thiếu App ID.");
    const apiUrl = getApiUrl(appId);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "ApplicationAccessKey": APPSHEET_ACCESS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ Action: "Find", Properties: { Locale: "en-US" }, Rows: [] }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Lỗi 404: Không tìm thấy bảng "${STAGES_TABLE_NAME}". Hãy tạo bảng này trong Google Sheet và AppSheet.`);
      }
      throw new Error(`Lỗi kết nối AppSheet (Mã lỗi: ${response.status}) khi tải tiến độ.`);
    }

    const rawData = await response.json();
    if (!rawData || rawData.length === 0) {
      return { success: true, data: [] };
    }

    const transformedData = rawData.map(row => ({
      id: row.id, // Cột 'id' trong bảng data_tien_do (VD: 1, 2, 3...)
      appSheetId: row._RowNumber, // ID của dòng trong AppSheet
      name: row.name || "",
      status: row.status || "Chưa bắt đầu", // Giá trị mặc định
      ngayBatDau: row.ngayBatDau ? new Date(row.ngayBatDau) : null,
      ngayKetThuc: row.ngayKetThuc ? new Date(row.ngayKetThuc) : null,
      anhNghiemThu: row.anhNghiemThu || null,
    })).sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10)); // Sắp xếp theo ID để đảm bảo thứ tự

    return { success: true, data: transformedData };
  } catch (error) {
    console.error("Lỗi khi tải dữ liệu tiến độ:", error);
    return { success: false, message: error.message, data: [] };
  }
};

/**
 * Cập nhật trạng thái của một giai đoạn
 */
export const updateStageInSheet = async (stage, appId) => {
  try {
    const editData = [{
      _RowNumber: stage.appSheetId, // Dùng _RowNumber để xác định dòng cần sửa
      status: stage.status,
      anhNghiemThu: stage.anhNghiemThu || "", // Cập nhật cột ảnh nghiệm thu
      // Thêm các trường khác để có thể cập nhật sau này
      // ngayBatDau: stage.ngayBatDau ? stage.ngayBatDau.toISOString().split('T')[0] : null,
      // ngayKetThuc: stage.ngayKetThuc ? stage.ngayKetThuc.toISOString().split('T')[0] : null,
    }];

    const apiUrl = getApiUrl(appId);

    console.log("Update Stage API URL:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "ApplicationAccessKey": APPSHEET_ACCESS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ Action: "Edit", Properties: {}, Rows: editData }),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    let responseData;
    try {
      responseData = await response.json();
    } catch (error) {
      console.warn("Empty JSON response from AppSheet:", error);
      responseData = {}; // Treat as empty object
    }
    return { success: true, message: "Cập nhật trạng thái thành công!" };
  } catch (error) {
    console.error("Lỗi khi cập nhật tiến độ:", error);
    return { success: false, message: error.message };
  }
};