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

    const transformedData = rawData.map((row, index) => {
      // 1. Tìm tên cột Key và Ảnh chính xác (bất kể hoa thường)
      const rowKeys = Object.keys(row);
      
      // Ưu tiên tìm cột 'id', nếu không có thì tìm 'tt', 'stt', cuối cùng fallback về 'id'
      const idKey = rowKeys.find(k => k.trim().toLowerCase() === 'id') || 
                    rowKeys.find(k => k.trim().toLowerCase() === 'tt') || 
                    rowKeys.find(k => k.trim().toLowerCase() === 'stt') || 'id';
                    
      const imgKey = rowKeys.find(k => k.trim().toLowerCase() === 'ảnh nghiệm thu' || k.trim().toLowerCase() === 'anh nghiem thu') || "Ảnh nghiệm thu";

      // 2. Tạo ID duy nhất cho Frontend (QUAN TRỌNG: Sửa lỗi hiển thị ảnh ở tất cả các ô)
      // Ưu tiên dùng giá trị từ cột Key tìm được
      const uniqueId = row[idKey] || row._RowNumber || `stage_idx_${index}`;

      return {
        id: uniqueId, 
        appSheetId: row._RowNumber, 
        keyId: row[idKey], // Giá trị Key thực sự để gửi API (Cột id)
        keyColumn: idKey, // Lưu lại tên cột Key tìm được để dùng lúc Update
        name: row.name || row["Tên công việc"] || row["Hạng mục"] || "",
        status: row.status || row["Trạng thái"] || "Chưa bắt đầu",
        ngayBatDau: row.ngayBatDau ? new Date(row.ngayBatDau) : null,
        ngayKetThuc: row.ngayKetThuc ? new Date(row.ngayKetThuc) : null,
        anhNghiemThu: row[imgKey] || "", // Map đúng cột ảnh
      };
    }).sort((a, b) => parseInt(a.keyId || 0, 10) - parseInt(b.keyId || 0, 10));

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
    // Kiểm tra Key bắt buộc
    if (stage.keyId === undefined || stage.keyId === null || stage.keyId === "") {
      throw new Error("Dữ liệu dòng này bị thiếu Key (id/TT). Vui lòng kiểm tra lại Google Sheet.");
    }

    // Sử dụng tên cột Key đã tìm thấy lúc Fetch, mặc định là 'id' nếu không có
    const keyColumnName = stage.keyColumn || 'id';

    const editData = [{
      "_RowNumber": stage.appSheetId, // Gửi kèm RowNumber để hỗ trợ tìm kiếm
      [keyColumnName]: String(stage.keyId), // Dùng đúng tên cột Key tìm được (id, ID, TT...)
      "status": stage.status,
      "Ảnh nghiệm thu": stage.anhNghiemThu || "", // Link ảnh từ Cloudinary
    }];

    // Log dữ liệu gửi đi để kiểm tra xem có link ảnh chưa
    console.log("Đang gửi cập nhật tiến độ lên AppSheet:", JSON.stringify(editData, null, 2));

    const apiUrl = getApiUrl(appId);

    console.log("Update Stage API URL:", apiUrl);

    // Thêm timeout 20s cho AppSheet request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "ApplicationAccessKey": APPSHEET_ACCESS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        Action: "Edit", 
        Properties: {
          Locale: "vi-VN",
          Timezone: "Asia/Ho_Chi_Minh",
        }, 
        Rows: editData 
      }), 
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    let responseData;
    try {
      responseData = await response.json();
      // Kiểm tra xem AppSheet có thực sự cập nhật dòng nào không
      if (responseData.Rows && responseData.Rows.length === 0) {
        console.warn(`Cảnh báo: AppSheet trả về danh sách rỗng. Có thể sai Key '${keyColumnName}' hoặc '_RowNumber'.`);
      }
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