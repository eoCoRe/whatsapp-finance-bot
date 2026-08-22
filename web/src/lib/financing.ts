import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

export type FinancingType = 'Financiamento' | 'Parcelamento';

export interface Financing {
  id: string;
  descricao: string;
  tipo: FinancingType;
  responsavel: string;
  valorParcela: number;
  parcelasPagas: number;
  parcelasTotais: number;
  dataCadastro: string;
}

const FINANCING_SHEET_NAME = 'Financiamentos';

// A coluna ValorParcela tem formato de moeda na planilha; a lib retorna o
// valor já formatado como texto (ex: "R$ 800,00"), então precisa parsear de volta.
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

async function getFinancingSheet() {
  const spreadsheet = await getDoc();
  const sheet = spreadsheet.sheetsByTitle[FINANCING_SHEET_NAME];
  if (!sheet) {
    throw new Error(`Aba "${FINANCING_SHEET_NAME}" não encontrada na planilha.`);
  }
  return sheet;
}

export async function listFinancings(): Promise<Financing[]> {
  const sheet = await getFinancingSheet();
  const rows = await sheet.getRows();

  return rows
    .map(row => ({
      id: String(row.get('ID') ?? ''),
      descricao: String(row.get('Descricao') ?? ''),
      tipo: (row.get('Tipo') === 'Parcelamento' ? 'Parcelamento' : 'Financiamento') as FinancingType,
      responsavel: String(row.get('Responsavel') ?? ''),
      valorParcela: parseNumber(row.get('ValorParcela')),
      parcelasPagas: Number(row.get('ParcelasPagas')) || 0,
      parcelasTotais: Number(row.get('ParcelasTotais')) || 0,
      dataCadastro: String(row.get('DataCadastro') ?? ''),
    }))
    .filter(f => f.id);
}

export interface CreateFinancingInput {
  descricao: string;
  tipo: FinancingType;
  responsavel: string;
  valorParcela: number;
  parcelasPagas: number;
  parcelasTotais: number;
}

export async function createFinancing(data: CreateFinancingInput): Promise<void> {
  const sheet = await getFinancingSheet();
  const id = `fin_${Date.now().toString(36)}`;

  await sheet.addRow({
    ID: id,
    Descricao: data.descricao,
    Tipo: data.tipo,
    Responsavel: data.responsavel,
    ValorParcela: data.valorParcela,
    ParcelasPagas: data.parcelasPagas,
    ParcelasTotais: data.parcelasTotais,
    DataCadastro: new Date().toLocaleDateString('pt-BR'),
  });
}

export interface UpdateFinancingInput {
  descricao: string;
  tipo: FinancingType;
  responsavel: string;
  valorParcela: number;
  parcelasPagas: number;
  parcelasTotais: number;
}

export async function updateFinancing(id: string, data: UpdateFinancingInput): Promise<void> {
  const sheet = await getFinancingSheet();
  const rows = await sheet.getRows();
  const row = rows.find(r => String(r.get('ID')) === id);

  if (!row) throw new Error('Financiamento não encontrado.');

  row.set('Descricao', data.descricao);
  row.set('Tipo', data.tipo);
  row.set('Responsavel', data.responsavel);
  row.set('ValorParcela', data.valorParcela);
  row.set('ParcelasPagas', Math.min(data.parcelasPagas, data.parcelasTotais));
  row.set('ParcelasTotais', data.parcelasTotais);
  await row.save();
}

export async function registerPayment(id: string, parcelas: number): Promise<void> {
  const sheet = await getFinancingSheet();
  const rows = await sheet.getRows();
  const row = rows.find(r => String(r.get('ID')) === id);

  if (!row) throw new Error('Financiamento não encontrado.');

  const totais = Number(row.get('ParcelasTotais')) || 0;
  const atual = Number(row.get('ParcelasPagas')) || 0;
  row.set('ParcelasPagas', Math.min(atual + parcelas, totais));
  await row.save();
}

export async function deleteFinancing(id: string): Promise<void> {
  const sheet = await getFinancingSheet();
  const rows = await sheet.getRows();
  const row = rows.find(r => String(r.get('ID')) === id);

  if (!row) return;
  await row.delete();
}
