const ExcelJS = require("exceljs");

const exportToExcel = async (res, fileName, sheetName, columns, rows) => {
    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns;

    worksheet.addRows(rows);

    worksheet.getRow(1).font = {
        bold: true,
    };

    worksheet.columns.forEach((column) => {
        column.width = Math.max(column.header.length + 5, 18);
    });

    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
        "Content-Disposition",
        `attachment; filename=${fileName}.xlsx`
    );

    await workbook.xlsx.write(res);

    res.end();
};

module.exports = {
    exportToExcel,
};