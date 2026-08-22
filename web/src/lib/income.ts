import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

export interface Income {
  responsavel: string;
  descricao: string;
  valor: number;
  dataCadastro: string;
}

const INCOME_SHEET_NAME = 'Renda';

let doc: GoogleSpreadsheet | null = null;

async function getDoc() {
  if (doc) return doc;

  const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID!, auth);
  await doc.loadInfo();
  return doc;
}

async function getIncomeSheet() {
  const spreadsheet = await getDoc();
  const sheet = spreadsheet.sheetsByTitle[INCOME_SHEET_NAME];
  if (!sheet) {
    throw new Error(`Aba "${INCOME_SHEET_NAME}" não encontrada na planilha.`);
  }
  return sheet;
}

function parseNumber(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  const cleaned = String(raw ?? '').replace(/[^\d,.-]/g, '');
  if (!cleaned) return 0;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (cleaned.includes(',')) {
    return parseFloat(cleaned.replace(',', '.')) || 0;
  }
  return parseFloat(cleaned) || 0;
}

export async function listIncome(): Promise<Income[]> {
  const sheet = await getIncomeSheet();
  const rows = await sheet.getRows();

  return rows
    .map(row => ({
      responsavel: String(row.get('Responsavel') ?? ''),
      descricao: String(row.get('Descricao') ?? ''),
      valor: parseNumber(row.get('Valor')),
      dataCadastro: String(row.get('DataCadastro') ?? ''),
    }))
    .filter(i => i.responsavel && i.descricao);
}

export async function upsertIncome(responsavel: string, descricao: string, valor: number): Promise<void> {
  const sheet = await getIncomeSheet();
  const rows = await sheet.getRows();
  const row = rows.find(r => String(r.get('Responsavel')) === responsavel && String(r.get('Descricao')) === descricao);

  if (row) {
    row.set('Valor', valor);
    await row.save();
  } else {
    await sheet.addRow({
      Responsavel: responsavel,
      Descricao: descricao,
      Valor: valor,
      DataCadastro: new Date().toLocaleDateString('pt-BR'),
    });
  }
}

export async function deleteIncome(responsavel: string, descricao: string): Promise<void> {
  const sheet = await getIncomeSheet();
  const rows = await sheet.getRows();
  const row = rows.find(r => String(r.get('Responsavel')) === responsavel && String(r.get('Descricao')) === descricao);

  if (row) await row.delete();
}
