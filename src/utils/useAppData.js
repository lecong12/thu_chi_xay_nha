import { useState, useEffect, useCallback } from 'react';
import { updateStageInSheet } from "./stagesAPI";
import { fetchTableData } from "./sheetsAPI";

const APP_ID = process.env.REACT_APP_APPSHEET_APP_ID;
const ACCESS_KEY = process.env.REACT_APP_APPSHEET_ACCESS_KEY;

const normalizeKey = (str) => {
    if (!str) return '';
    const s = str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").trim();
    
    if (s.includes("row number")) return "rowNumber";
    if (s.includes("rownumber")) return "rowNumber"; // Bắt trường hợp _RowNumber từ AppSheet
    if (s.includes("ngay bat dau")) return "ngayBatDau";
    if (s.includes("ngay ket thuc")) return "ngayKetThuc";
    if (s.includes("anh nghiem thu")) return "anhNghiemThu";
    if (s.includes("ten cong viec") || s.includes("giai doan")) return "name";
    if (s.includes("trang thai")) return "status";
    if (s.includes("hang muc")) return "doiTuongThuChi"; // Map đúng về biến doiTuongThuChi
    if (s.includes("du kien")) return "duKien";
    if (s.includes("thuc te")) return "thucTe";
    if (s.includes("con lai")) return "conLai";
    if (s.includes("tinh trang")) return "tinhTrang";
    if (s.includes("loai thu chi")) return "loaiThuChi";
    if (s.includes("doi tuong thu chi")) return "doiTuongThuChi";
    if (s.includes("so tien")) return "soTien";
    if (s.includes("noi dung")) return "noiDung";
    if (s.includes("ghi chu")) return "ghiChu";
    if (s.includes("hinh anh") || s.includes("minh chung")) return "hinhAnh";
    // Fallback for single words like 'id', 'ngay'
    return s.replace(/\s+/g, '');
};

export const useAppData = (isLoggedIn) => {
    const [data, setData] = useState([]);
    const [nganSach, setNganSach] = useState([]);
    const [tienDo, setTienDo] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchAllData = useCallback(async () => {
        if (!isLoggedIn || !APP_ID || !ACCESS_KEY) return;
        setLoading(true);
        setError(null);

        try {
            const tables = ["GiaoDich", "Ngansach", "TienDo"];
            const [resGD, resNS, resTD] = await Promise.all(
                tables.map(async (tableName) => {
                    const result = await fetchTableData(tableName, APP_ID, ACCESS_KEY);
                    return result.success ? result.data : [];
                })
            );

            // 1. Xử lý GiaoDich
            const cleanGD = resGD.map((row, index) => {
                const c = {};
                Object.keys(row).forEach(k => { c[normalizeKey(k)] = row[k]; });
                return {
                    id: row._RowNumber || `gd_${index}`,
                    appSheetId: row._RowNumber,
                    keyId: c.id || row.id || row.ID, // Đảm bảo lấy được key ID
                    ngay: c.ngay ? new Date(c.ngay) : new Date(),
                    soTien: Number(String(c.soTien || 0).replace(/\D/g, "")),
                    loaiThuChi: c.loaiThuChi || "Chi",
                    noiDung: c.noiDung || "",
                    doiTuongThuChi: c.doiTuongThuChi || "Khác",
                    ghiChu: c.ghiChu || "",
                    hinhAnh: c.hinhAnh || "",
                };
            });
            setData(cleanGD.sort((a, b) => b.ngay - a.ngay));

            // 2. Xử lý Ngân Sách
            const cleanNS = resNS.map(row => {
                const c = {};
                Object.keys(row).forEach(k => { c[normalizeKey(k)] = row[k]; });
                return {
                    hangMuc: c.hangMuc || c.doiTuongThuChi || "Hạng mục",
                    duKien: Number(String(c.duKien || 0).replace(/\D/g, "")),
                    thucTe: Number(String(c.thucTe || 0).replace(/\D/g, "")),
                    conLai: c.conLai,
                    tinhTrang: c.tinhTrang || ""
                };
            });
            setNganSach(cleanNS);

            // 3. Xử lý Tiến Độ
            const cleanTD = resTD.map((row, index) => {
                const c = {};
                Object.keys(row).forEach(k => { c[normalizeKey(k)] = row[k]; });
                return {
                    id: c.id || c.rowNumber || `td_${index}`,
                    name: c.name || "Công việc",
                    status: c.status || "Chưa bắt đầu",
                    ngayBatDau: c.ngayBatDau ? new Date(c.ngayBatDau) : null,
                    ngayKetThuc: c.ngayKetThuc ? new Date(c.ngayKetThuc) : null,
                };
            });
            setTienDo(cleanTD);

        } catch (err) {
            setError("Lỗi nạp dữ liệu. Hãy kiểm tra tên bảng và App ID.");
        } finally {
            setLoading(false);
        }
    }, [isLoggedIn]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const handleUpdateStageStatus = async (stageId, newStatus) => {
        const originalTienDo = [...tienDo];
        const stageToUpdate = tienDo.find(s => s.id === stageId);
        if (!stageToUpdate) return { success: false, message: "Không tìm thấy giai đoạn" };

        const newTienDo = tienDo.map((s) => s.id === stageId ? { ...s, status: newStatus } : s);
        setTienDo(newTienDo);

        const result = await updateStageInSheet({ ...stageToUpdate, status: newStatus }, APP_ID);

        if (!result.success) {
            setTienDo(originalTienDo); // Revert on failure
        }
        return result;
    };

    return { data, setData, nganSach, tienDo, loading, error, fetchAllData, handleUpdateStageStatus };
};