import * as XLSX from 'xlsx';

export function createCoilWorkbook(sheetName, rows) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 14 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  return workbook;
}

export function downloadCoilWorkbook(sheetName, rows, filename) {
  XLSX.writeFileXLSX(createCoilWorkbook(sheetName, rows), filename, { compression: true });
}
