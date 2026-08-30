import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { Expense, Financing, FinancingType, FixedExpense, ResumoPeriodo } from './types';

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

// Remove o gasto mais recente lançado por esse responsável específico (não
// mexe em gastos do outro usuário, mesmo que sejam mais recentes na planilha).
export async function removerUltimoGasto(responsavel: string): Promise<Expense | null> {
  const spreadsheet = await getSheet();
  const sheetName = process.env.GOOGLE_SHEET_NAME ?? 'Gastos';
  const sheet = spreadsheet.sheetsByTitle[sheetName];

  if (!sheet) {
    throw new Error(`Aba "${sheetName}" não encontrada na planilha.`);
  }

  const rows = await sheet.getRows();
  const alvoResp = normalize(responsavel);

  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (normalize(String(row.get('Responsavel') ?? '')) !== alvoResp) continue;

    const expense: Expense = {
      valor: parseNumber(row.get('Valor')),
      categoria: String(row.get('Categoria') ?? ''),
      formaPagamento: String(row.get('FormaPagamento') ?? ''),
      descricao: String(row.get('Descricao') ?? ''),
      responsavel: String(row.get('Responsavel') ?? ''),
      data: String(row.get('Data') ?? ''),
    };

    await row.delete();
    return expense;
  }

  return null;
}

const FINANCING_SHEET_NAME = 'Financiamentos';

async function getFinancingSheet() {
  const spreadsheet = await getSheet();
  const sheet = spreadsheet.sheetsByTitle[FINANCING_SHEET_NAME];

  if (!sheet) {
    throw new Error(`Aba "${FINANCING_SHEET_NAME}" não encontrada na planilha.`);
  }

  return sheet;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

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

export async function appendFinancing(data: {
  descricao: string;
  tipo: FinancingType;
  responsavel: string;
  valorParcela: number;
  parcelasPagas: number;
  parcelasTotais: number;
}): Promise<Financing> {
  const sheet = await getFinancingSheet();
  const id = `fin_${Date.now().toString(36)}`;
  const dataCadastro = new Date().toLocaleDateString('pt-BR');

  await sheet.addRow({
    ID: id,
    Descricao: data.descricao,
    Tipo: data.tipo,
    Responsavel: data.responsavel,
    ValorParcela: data.valorParcela,
    ParcelasPagas: data.parcelasPagas,
    ParcelasTotais: data.parcelasTotais,
    DataCadastro: dataCadastro,
  });

  return { id, dataCadastro, ...data };
}

export async function listFinancings(): Promise<Financing[]> {
  const sheet = await getFinancingSheet();
  const rows = await sheet.getRows();

  return rows.map(row => ({
    id: String(row.get('ID') ?? ''),
    descricao: String(row.get('Descricao') ?? ''),
    tipo: (row.get('Tipo') === 'Parcelamento' ? 'Parcelamento' : 'Financiamento') as FinancingType,
    responsavel: String(row.get('Responsavel') ?? ''),
    valorParcela: parseNumber(row.get('ValorParcela')),
    parcelasPagas: Number(row.get('ParcelasPagas')) || 0,
    parcelasTotais: Number(row.get('ParcelasTotais')) || 0,
    dataCadastro: String(row.get('DataCadastro') ?? ''),
  }));
}

export type RegistrarPagamentoResult =
  | { status: 'nao_encontrado' }
  | { status: 'ambiguo'; opcoes: string[] }
  | { status: 'ok'; financing: Financing; quitado: boolean };

export async function registrarPagamentoFinanciamento(
  descricaoBusca: string,
  parcelas: number
): Promise<RegistrarPagamentoResult> {
  const sheet = await getFinancingSheet();
  const rows = await sheet.getRows();

  const busca = normalize(descricaoBusca);
  const buscaWords = busca.split(/\s+/).filter(Boolean);

  const scored = rows
    .map(row => {
      const desc = normalize(String(row.get('Descricao') ?? ''));
      const descWords = desc.split(/\s+/).filter(Boolean);
      let score = 0;
      if (desc && busca && (desc.includes(busca) || busca.includes(desc))) score += 2;
      score += buscaWords.filter(w => descWords.includes(w)).length;
      return { row, score };
    })
    .filter(r => r.score > 0);

  if (scored.length === 0) {
    return { status: 'nao_encontrado' };
  }

  scored.sort((a, b) => b.score - a.score);
  const topScore = scored[0].score;
  const topMatches = scored.filter(r => r.score === topScore);

  if (topMatches.length > 1) {
    return {
      status: 'ambiguo',
      opcoes: topMatches.map(m => String(m.row.get('Descricao'))),
    };
  }

  const row = topMatches[0].row;
  const parcelasTotais = Number(row.get('ParcelasTotais')) || 0;
  const parcelasPagasAtual = Number(row.get('ParcelasPagas')) || 0;
  const novasParcelasPagas = Math.min(parcelasPagasAtual + parcelas, parcelasTotais);

  row.set('ParcelasPagas', novasParcelasPagas);
  await row.save();

  const financing: Financing = {
    id: String(row.get('ID') ?? ''),
    descricao: String(row.get('Descricao') ?? ''),
    tipo: (row.get('Tipo') === 'Parcelamento' ? 'Parcelamento' : 'Financiamento') as FinancingType,
    responsavel: String(row.get('Responsavel') ?? ''),
    valorParcela: parseNumber(row.get('ValorParcela')),
    parcelasPagas: novasParcelasPagas,
    parcelasTotais,
    dataCadastro: String(row.get('DataCadastro') ?? ''),
  };

  return { status: 'ok', financing, quitado: novasParcelasPagas >= parcelasTotais && parcelasTotais > 0 };
}

const METAS_SHEET_NAME = 'Metas';

async function getMetasSheet() {
  const spreadsheet = await getSheet();
  const sheet = spreadsheet.sheetsByTitle[METAS_SHEET_NAME];

  if (!sheet) {
    throw new Error(`Aba "${METAS_SHEET_NAME}" não encontrada na planilha.`);
  }

  return sheet;
}

export async function setMeta(categoria: string, valor: number, responsavel: string): Promise<void> {
  const sheet = await getMetasSheet();
  const rows = await sheet.getRows();
  const alvoCat = normalize(categoria);
  const alvoResp = normalize(responsavel);

  const row = rows.find(
    r => normalize(String(r.get('Categoria') ?? '')) === alvoCat && normalize(String(r.get('Responsavel') ?? '')) === alvoResp
  );

  if (row) {
    row.set('ValorMeta', valor);
    await row.save();
  } else {
    await sheet.addRow({ Responsavel: responsavel, Categoria: categoria, ValorMeta: valor });
  }
}

export async function getMetaCategoria(categoria: string, responsavel: string): Promise<number> {
  const sheet = await getMetasSheet();
  const rows = await sheet.getRows();
  const alvoCat = normalize(categoria);
  const alvoResp = normalize(responsavel);

  const row = rows.find(
    r => normalize(String(r.get('Categoria') ?? '')) === alvoCat && normalize(String(r.get('Responsavel') ?? '')) === alvoResp
  );
  return row ? parseNumber(row.get('ValorMeta')) : 0;
}

export async function getGastoMesPorCategoria(categoria: string, responsavel: string): Promise<number> {
  const spreadsheet = await getSheet();
  const sheetName = process.env.GOOGLE_SHEET_NAME ?? 'Gastos';
  const sheet = spreadsheet.sheetsByTitle[sheetName];

  if (!sheet) {
    throw new Error(`Aba "${sheetName}" não encontrada na planilha.`);
  }

  const rows = await sheet.getRows();
  const alvoCat = normalize(categoria);
  const alvoResp = normalize(responsavel);
  const now = new Date();
  const mesAtual = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  let total = 0;
  for (const row of rows) {
    const cat = normalize(String(row.get('Categoria') ?? ''));
    const resp = normalize(String(row.get('Responsavel') ?? ''));
    if (cat !== alvoCat || resp !== alvoResp) continue;

    const data = String(row.get('Data') ?? '');
    const match = data.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) continue;

    const [, , mm, yyyy] = match;
    if (`${mm}/${yyyy}` !== mesAtual) continue;

    total += parseNumber(row.get('Valor'));
  }

  return total;
}

export async function getGastoMesTotal(): Promise<number> {
  const spreadsheet = await getSheet();
  const sheetName = process.env.GOOGLE_SHEET_NAME ?? 'Gastos';
  const sheet = spreadsheet.sheetsByTitle[sheetName];

  if (!sheet) {
    throw new Error(`Aba "${sheetName}" não encontrada na planilha.`);
  }

  const rows = await sheet.getRows();
  const now = new Date();
  const mesAtual = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  let total = 0;
  for (const row of rows) {
    const data = String(row.get('Data') ?? '');
    const match = data.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) continue;

    const [, , mm, yyyy] = match;
    if (`${mm}/${yyyy}` !== mesAtual) continue;

    total += parseNumber(row.get('Valor'));
  }

  return total;
}

// Agrega os gastos de todos os responsáveis dentro de uma janela de datas
// [desde, ate) — usado pelos resumos periódicos (semanal/mensal).
export async function getResumoPeriodo(desde: Date, ate: Date): Promise<ResumoPeriodo> {
  const spreadsheet = await getSheet();
  const sheetName = process.env.GOOGLE_SHEET_NAME ?? 'Gastos';
  const sheet = spreadsheet.sheetsByTitle[sheetName];

  if (!sheet) {
    throw new Error(`Aba "${sheetName}" não encontrada na planilha.`);
  }

  const rows = await sheet.getRows();
  let totalGeral = 0;
  const porResponsavel: Record<string, number> = {};
  const porCategoriaMap: Record<string, number> = {};

  for (const row of rows) {
    const data = String(row.get('Data') ?? '');
    const match = data.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) continue;

    const [, dd, mm, yyyy] = match;
    const rowDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (rowDate < desde || rowDate >= ate) continue;

    const valor = parseNumber(row.get('Valor'));
    const responsavel = String(row.get('Responsavel') ?? '');
    const categoria = String(row.get('Categoria') ?? '');

    totalGeral += valor;
    porResponsavel[responsavel] = (porResponsavel[responsavel] ?? 0) + valor;
    porCategoriaMap[categoria] = (porCategoriaMap[categoria] ?? 0) + valor;
  }

  const porCategoria = Object.entries(porCategoriaMap)
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);

  return { totalGeral, porResponsavel, porCategoria };
}

const RENDA_SHEET_NAME = 'Renda';

async function getRendaSheet() {
  const spreadsheet = await getSheet();
  const sheet = spreadsheet.sheetsByTitle[RENDA_SHEET_NAME];

  if (!sheet) {
    throw new Error(`Aba "${RENDA_SHEET_NAME}" não encontrada na planilha.`);
  }

  return sheet;
}

export async function setRenda(descricao: string, valor: number, responsavel: string): Promise<void> {
  const sheet = await getRendaSheet();
  const rows = await sheet.getRows();
  const alvoDesc = normalize(descricao);
  const alvoResp = normalize(responsavel);

  const row = rows.find(
    r => normalize(String(r.get('Descricao') ?? '')) === alvoDesc && normalize(String(r.get('Responsavel') ?? '')) === alvoResp
  );

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

export async function getRendaTotal(responsavel: string): Promise<number> {
  const sheet = await getRendaSheet();
  const rows = await sheet.getRows();
  const alvoResp = normalize(responsavel);

  let total = 0;
  for (const row of rows) {
    if (normalize(String(row.get('Responsavel') ?? '')) !== alvoResp) continue;
    total += parseNumber(row.get('Valor'));
  }
  return total;
}

export async function getRendaTotalGeral(): Promise<number> {
  const sheet = await getRendaSheet();
  const rows = await sheet.getRows();

  let total = 0;
  for (const row of rows) {
    total += parseNumber(row.get('Valor'));
  }
  return total;
}

const GASTOS_FIXOS_SHEET_NAME = 'GastosFixos';

async function getGastosFixosSheet() {
  const spreadsheet = await getSheet();
  const sheet = spreadsheet.sheetsByTitle[GASTOS_FIXOS_SHEET_NAME];

  if (!sheet) {
    throw new Error(`Aba "${GASTOS_FIXOS_SHEET_NAME}" não encontrada na planilha.`);
  }

  return sheet;
}

export async function appendGastoFixo(data: {
  descricao: string;
  categoria: string;
  valor: number;
  responsavel: string;
  diaVencimento: number;
}): Promise<FixedExpense> {
  const sheet = await getGastosFixosSheet();
  const id = `fix_${Date.now().toString(36)}`;
  const dataCadastro = new Date().toLocaleDateString('pt-BR');

  await sheet.addRow({
    ID: id,
    Descricao: data.descricao,
    Categoria: data.categoria,
    Valor: data.valor,
    Responsavel: data.responsavel,
    DiaVencimento: data.diaVencimento,
    UltimoMesLancado: '',
    DataCadastro: dataCadastro,
  });

  return { id, ultimoMesLancado: '', dataCadastro, ...data };
}

export async function listGastosFixos(): Promise<FixedExpense[]> {
  const sheet = await getGastosFixosSheet();
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

export async function marcarGastoFixoLancado(id: string, mesLancado: string): Promise<void> {
  const sheet = await getGastosFixosSheet();
  const rows = await sheet.getRows();
  const row = rows.find(r => String(r.get('ID')) === id);

  if (row) {
    row.set('UltimoMesLancado', mesLancado);
    await row.save();
  }
}
