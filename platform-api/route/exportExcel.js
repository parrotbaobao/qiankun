const ExcelJS = require("exceljs");

async function exportExcelHandler(req, res) {
  const rows = [
    { name: "张三", dept: "前端", joinDate: "2024-06-01", status: "在职" },
    { name: "李四", dept: "后端", joinDate: "2023-11-15", status: "在职" },
  ];

  const wb = new ExcelJS.Workbook();
  wb.creator = "my-service";
  wb.created = new Date();

  const ws = wb.addWorksheet("Sheet1", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = [
    { header: "姓名", key: "name", width: 12 },
    { header: "部门", key: "dept", width: 12 },
    { header: "入职日期", key: "joinDate", width: 14 },
    { header: "状态", key: "status", width: 10 },
  ];

  rows.forEach((r) => ws.addRow(r));

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 18;

  ws.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  const filename = `表格导出_${Date.now()}.xlsx`;
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
  );

  await wb.xlsx.write(res);
  res.end();
}

module.exports = { exportExcelHandler };
