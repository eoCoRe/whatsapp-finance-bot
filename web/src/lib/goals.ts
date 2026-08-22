import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

export interface Goal {
  responsavel: string;
  categoria: string;
  valorMeta: number;
}

const GOALS_SHEET_NAME = 'Metas';

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

async function getGoalsSheet() {
  const spreadsheet = await getDoc();
  const sheet = spreadsheet.sheetsByTitle[GOALS_SHEET_NAME];
  if (!sheet) {
    throw new Error(`Aba "${GOALS_SHEET_NAME}" não encontrada na planilha.`);
  }
  return sheet;
}

// A coluna ValorMeta tem formato de moeda na planilha; a lib retorna o
// valor já formatado como texto (ex: "R$ 540,00"), então precisa parsear de volta.
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

export async function listGoals(): Promise<Goal[]> {
  const sheet = await getGoalsSheet();
  const rows = await sheet.getRows();

  return rows
    .map(row => ({
      responsavel: String(row.get('Responsavel') ?? ''),
      categoria: String(row.get('Categoria') ?? ''),
      valorMeta: parseNumber(row.get('ValorMeta')),
    }))
    .filter(g => g.categoria && g.responsavel);
}

export async function updateGoal(responsavel: string, categoria: string, valorMeta: number): Promise<void> {
  const sheet = await getGoalsSheet();
  const rows = await sheet.getRows();
  const row = rows.find(
    r => String(r.get('Responsavel')) === responsavel && String(r.get('Categoria')) === categoria
  );

  if (row) {
    row.set('ValorMeta', valorMeta);
    await row.save();
  } else {
    await sheet.addRow({ Responsavel: responsavel, Categoria: categoria, ValorMeta: valorMeta });
  }
}
