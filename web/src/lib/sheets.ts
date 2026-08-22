import { google } from 'googleapis';

export interface ExpenseRow {
  dataISO: string; // YYYY-MM-DD
  mes: string; // YYYY-MM
  responsavel: string;
  valor: number;
  categoria: string;
  formaPagamento: string;
  descricao: string;
}

function parseBrDate(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

export async function fetchExpenses(): Promise<ExpenseRow[]> {
  const sheets = getSheetsClient();
  const sheetName = process.env.GOOGLE_SHEET_NAME ?? 'Gastos';
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SPREADSHEET_ID não configurado.');
  }

  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:F`,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });

  const rows = data.values ?? [];
  const expenses: ExpenseRow[] = [];

  for (const row of rows) {
    const [data0, responsavel, valor, categoria, formaPagamento, descricao] = row;
    const dataISO = parseBrDate(data0);
    const numero = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(',', '.'));

    if (!dataISO || !Number.isFinite(numero) || numero <= 0) continue;

    expenses.push({
      dataISO,
      mes: dataISO.slice(0, 7),
      responsavel: String(responsavel ?? '').trim() || 'Não informado',
      valor: numero,
      categoria: String(categoria ?? '').trim() || 'Outros',
      formaPagamento: String(formaPagamento ?? '').trim() || 'Não informado',
      descricao: String(descricao ?? '').trim(),
    });
  }

  return expenses;
}
