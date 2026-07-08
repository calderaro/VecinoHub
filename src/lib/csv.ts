export type CsvValue = string | number | null | undefined;

/**
 * Escape a single CSV field. Nullish values become empty strings. Fields whose
 * first character can trigger formula/DDE evaluation in Excel/Sheets
 * (`= + - @` or a tab/CR) are prefixed with a single quote to neutralize it —
 * the exported values (group/user names) are user-controlled. Then the field is
 * wrapped in double quotes (with any embedded quote doubled) whenever it
 * contains a quote, comma, or newline; otherwise it is emitted verbatim.
 */
export function escapeCsv(value: CsvValue): string {
  let str = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/["\n\r,]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Serialize a matrix of values into an RFC 4180-style CSV string (CRLF rows). */
export function rowsToCsv(rows: CsvValue[][]): string {
  return rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
}
