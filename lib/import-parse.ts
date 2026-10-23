import * as XLSX from "xlsx";
import type { ImportRow } from "@/lib/customers";
import { LIMITS } from "@/lib/limits";
import { PublicError } from "@/lib/public-error";

const HEADER_MAP: Record<string, keyof ImportRow> = {
  姓名: "name",
  来源: "source",
  收件人: "recipientName",
  电话: "recipientPhone",
  地址: "address",
  name: "name",
  source: "source",
  recipient: "recipientName",
  phone: "recipientPhone",
  address: "address",
};

function cellText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

export function parseCustomerImportFile(
  buffer: Buffer,
  filename: string,
): ImportRow[] {
  const lower = filename.toLowerCase();
  if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls") && !lower.endsWith(".csv")) {
    throw new PublicError("仅支持 .xlsx / .xls / .csv");
  }

  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellFormula: false,
    cellHTML: false,
    cellNF: false,
    cellStyles: false,
    bookVBA: false,
    bookFiles: false,
    sheetRows: LIMITS.importMaxRows + 2,
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new PublicError("文件没有工作表");
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (matrix.length < 2) throw new PublicError("除表头外没有数据行");

  const header = (matrix[0] || []).map((h) => cellText(h));
  const indexes: Partial<Record<keyof ImportRow, number>> = {};
  header.forEach((h, i) => {
    const key = HEADER_MAP[h];
    if (key) indexes[key] = i;
  });

  const required: (keyof ImportRow)[] = [
    "name",
    "source",
    "recipientName",
    "recipientPhone",
    "address",
  ];
  for (const key of required) {
    if (indexes[key] == null) {
      throw new PublicError("表头必须包含：姓名、来源、收件人、电话、地址");
    }
  }

  if (matrix.length - 1 > LIMITS.importMaxRows) {
    throw new PublicError(`单次最多导入 ${LIMITS.importMaxRows} 行`);
  }

  const rows: ImportRow[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const line = matrix[r] || [];
    rows.push({
      name: cellText(line[indexes.name!]),
      source: cellText(line[indexes.source!]),
      recipientName: cellText(line[indexes.recipientName!]),
      recipientPhone: cellText(line[indexes.recipientPhone!]),
      address: cellText(line[indexes.address!]),
    });
  }
  return rows;
}
