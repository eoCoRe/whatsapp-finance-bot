import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

export interface FixedExpense {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  responsavel: string;
  diaVencimento: number;
  ultimoMesLancado: string;
  dataCadastro: string;
}

const FIXED_EXPENSES_SHEET_NAME = 'GastosFixos';

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

async function getFixedExpensesSheet() {
  const spreadsheet = await getDoc();
  const sheet = spreadsheet.sheetsByTitle[FIXED_EXPENSES_SHEET_NAME];
  if (!sheet) {
    throw new Error(`Aba "${FIXED_EXPENSES_SHEET_NAME}" não encontrada na planilha.`);
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

export async function listFixedExpenses(): Promise<FixedExpense[]> {
  const sheet = await getFixedExpensesSheet();
  const rows = await sheet.getRows();

  return rows
    .map(row => ({
      id: String(row.get('ID') ?? ''),
      descricao: String(row.get('Descricao') ?? ''),
      categoria: String(row.get('Categoria') ?? ''),
      valor: parseNumber(row.get('Valor')),
      responsavel: String(row.get('Responsavel') ?? ''),
      diaVencimento: Number(row.get('DiaVencimento')) || 1,
      ultimoMesLancado: String(row.get('UltimoMesLancado') ?? ''),
      dataCadastro: String(row.get('DataCadastro') ?? ''),
    }))
    .filter(f => f.id);
}

export interface FixedExpenseInput {
  descricao: string;
  categoria: string;
  valor: number;
  responsavel: string;
  diaVencimento: number;
}

export async function createFixedExpense(data: FixedExpenseInput): Promise<void> {
  const sheet = await getFixedExpensesSheet();
  const id = `fix_${Date.now().toString(36)}`;

  await sheet.addRow({
    ID: id,
    Descricao: data.descricao,
    Categoria: data.categoria,
    Valor: data.valor,
    Responsavel: data.responsavel,
    DiaVencimento: data.diaVencimento,
    UltimoMesLancado: '',
    DataCadastro: new Date().toLocaleDateString('pt-BR'),
  });
}

export async function updateFixedExpense(id: string, data: FixedExpenseInput): Promise<void> {
  const sheet = await getFixedExpensesSheet();
  const rows = await sheet.getRows();
  const row = rows.find(r => String(r.get('ID')) === id);

  if (!row) throw new Error('Gasto fixo não encontrado.');

  row.set('Descricao', data.descricao);
  row.set('Categoria', data.categoria);
  row.set('Valor', data.valor);
  row.set('Responsavel', data.responsavel);
  row.set('DiaVencimento', data.diaVencimento);
  await row.save();
}

export async function deleteFixedExpense(id: string): Promise<void> {
  const sheet = await getFixedExpensesSheet();
  const rows = await sheet.getRows();
  const row = rows.find(r => String(r.get('ID')) === id);

  if (row) await row.delete();
}
