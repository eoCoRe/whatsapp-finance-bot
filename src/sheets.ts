import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { Expense } from './types';

let doc: GoogleSpreadsheet | null = null;

async function getSheet() {
  if (doc) return doc;

  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID!, serviceAccountAuth);
  await doc.loadInfo();
  return doc;
}

export async function appendExpenseRow(expense: Expense): Promise<void> {
  const spreadsheet = await getSheet();
  const sheetName = process.env.GOOGLE_SHEET_NAME ?? 'Gastos';
  const sheet = spreadsheet.sheetsByTitle[sheetName];

  if (!sheet) {
    throw new Error(`Aba "${sheetName}" não encontrada na planilha.`);
  }

  await sheet.addRow({
    Data: expense.data,
    Responsavel: expense.responsavel,
    Valor: expense.valor,
    Categoria: expense.categoria,
    FormaPagamento: expense.formaPagamento,
    Descricao: expense.descricao,
  });
}
