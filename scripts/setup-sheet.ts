import 'dotenv/config';
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;
const USER1_NAME = process.env.USER1_NAME ?? 'Usuário 1';
const USER2_NAME = process.env.USER2_NAME ?? 'Usuário 2';

const CATEGORIES = [
  'Alimentação', 'Mercado', 'Transporte', 'Saúde', 'Lazer',
  'Moradia', 'Educação', 'Vestuário', 'Beleza', 'Pets', 'Assinaturas', 'Outros',
];

const PAYMENT_METHODS = ['Débito', 'Crédito', 'Pix', 'Dinheiro', 'Boleto'];

function hex(color: string) {
  const r = parseInt(color.slice(1, 3), 16) / 255;
  const g = parseInt(color.slice(3, 5), 16) / 255;
  const b = parseInt(color.slice(5, 7), 16) / 255;
  return { red: r, green: g, blue: b };
}

function currencyFmt() {
  return { type: 'CURRENCY', pattern: 'R$ #,##0.00' };
}

function headerCell(bgColor: string, textColor = '#ffffff', fontSize = 11) {
  return {
    userEnteredFormat: {
      backgroundColor: hex(bgColor),
      textFormat: { foregroundColor: hex(textColor), bold: true, fontSize },
      horizontalAlignment: 'CENTER',
      verticalAlignment: 'MIDDLE',
    },
  };
}

async function main() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  console.log('🔍 Conectando à planilha...');
  const { data } = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existing = data.sheets ?? [];

  // --- Criar abas que não existem ---
  const toCreate = [];
  if (!existing.find(s => s.properties?.title === 'Gastos'))
    toCreate.push({ addSheet: { properties: { title: 'Gastos', index: 0 } } });
  if (!existing.find(s => s.properties?.title === 'Resumo'))
    toCreate.push({ addSheet: { properties: { title: 'Resumo', index: 1 } } });
  if (!existing.find(s => s.properties?.title === 'Financiamentos'))
    toCreate.push({ addSheet: { properties: { title: 'Financiamentos', index: 2 } } });
  if (!existing.find(s => s.properties?.title === 'Metas'))
    toCreate.push({ addSheet: { properties: { title: 'Metas', index: 3 } } });
  if (!existing.find(s => s.properties?.title === 'Renda'))
    toCreate.push({ addSheet: { properties: { title: 'Renda', index: 4 } } });
  if (!existing.find(s => s.properties?.title === 'GastosFixos'))
    toCreate.push({ addSheet: { properties: { title: 'GastosFixos', index: 5 } } });

  if (toCreate.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: toCreate },
    });
  }

  // Re-fetch para pegar os IDs corretos
  const refreshed = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const allSheets = refreshed.data.sheets ?? [];
  const gastosId = allSheets.find(s => s.properties?.title === 'Gastos')!.properties!.sheetId!;
  const resumoId = allSheets.find(s => s.properties?.title === 'Resumo')!.properties!.sheetId!;
  const financiamentosId = allSheets.find(s => s.properties?.title === 'Financiamentos')!.properties!.sheetId!;
  const metasId = allSheets.find(s => s.properties?.title === 'Metas')!.properties!.sheetId!;
  const rendaId = allSheets.find(s => s.properties?.title === 'Renda')!.properties!.sheetId!;
  const gastosFixosId = allSheets.find(s => s.properties?.title === 'GastosFixos')!.properties!.sheetId!;

  // =========================================================
  // ABA: GASTOS
  // =========================================================
  console.log('📊 Formatando aba Gastos...');

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Gastos!A1:F1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [['Data', 'Responsavel', 'Valor', 'Categoria', 'FormaPagamento', 'Descricao']],
    },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        // Congelar linha de cabeçalho
        {
          updateSheetProperties: {
            properties: { sheetId: gastosId, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
        // Cor do cabeçalho
        {
          repeatCell: {
            range: { sheetId: gastosId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 6 },
            cell: headerCell('#1b5e20'),
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
          },
        },
        // Altura da linha de cabeçalho
        {
          updateDimensionProperties: {
            range: { sheetId: gastosId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
            properties: { pixelSize: 42 },
            fields: 'pixelSize',
          },
        },
        // Larguras das colunas
        ...[110, 160, 110, 145, 155, 290].map((px, i) => ({
          updateDimensionProperties: {
            range: { sheetId: gastosId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
            properties: { pixelSize: px },
            fields: 'pixelSize',
          },
        })),
        // Coluna Valor → formato moeda
        {
          repeatCell: {
            range: { sheetId: gastosId, startRowIndex: 1, endRowIndex: 5000, startColumnIndex: 2, endColumnIndex: 3 },
            cell: { userEnteredFormat: { numberFormat: currencyFmt() } },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        // Bordas no cabeçalho
        {
          updateBorders: {
            range: { sheetId: gastosId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 6 },
            bottom: { style: 'SOLID_MEDIUM', color: hex('#ffffff') },
          },
        },
      ],
    },
  });

  // =========================================================
  // ABA: RESUMO
  // =========================================================
  console.log('📈 Configurando aba Resumo...');

  // Planilhas em locale pt_BR exigem ";" como separador de argumentos (a vírgula é o separador decimal).
  const mthFormula = (col: string, filter?: string) => {
    const baseFilter = `(TEXT(Gastos!A2:A5000;"MM/YYYY")=TEXT(TODAY();"MM/YYYY"))`;
    const extra = filter ? `*(${filter})` : '';
    return `=SUMPRODUCT(${baseFilter}${extra}*(ISNUMBER(Gastos!C2:C5000))*Gastos!${col}2:${col}5000)`;
  };

  const resumoData = [
    ['💰 RESUMO DE GASTOS DO CASAL', '', ''],
    ['', '', ''],
    ['Mês de referência:', '=TEXT(TODAY();"MMMM/YYYY")', ''],
    ['', '', ''],
    ['👥 POR PESSOA', 'Valor (mês atual)', ''],
    ['Total Geral', mthFormula('C'), ''],
    [USER1_NAME, mthFormula('C', `Gastos!B2:B5000="${USER1_NAME}"`), ''],
    [USER2_NAME, mthFormula('C', `Gastos!B2:B5000="${USER2_NAME}"`), ''],
    ['', '', ''],
    ['🏷️ POR CATEGORIA', 'Valor (mês atual)', ''],
    ...CATEGORIES.map(cat => [cat, mthFormula('C', `Gastos!D2:D5000="${cat}"`), '']),
    ['', '', ''],
    ['💳 POR FORMA DE PAGAMENTO', 'Valor (mês atual)', ''],
    ...PAYMENT_METHODS.map(m => [m, mthFormula('C', `Gastos!E2:E5000="${m}"`), '']),
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Resumo!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: resumoData },
  });

  // Índices das linhas de seção no Resumo (0-indexed)
  const titleRow = 0;
  const mesRow = 2;
  const pessoaHeaderRow = 4;
  const catHeaderRow = 9;
  const pgtoHeaderRow = 9 + 1 + CATEGORIES.length + 1;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        // Coluna A largura
        {
          updateDimensionProperties: {
            range: { sheetId: resumoId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 },
            properties: { pixelSize: 220 },
            fields: 'pixelSize',
          },
        },
        // Coluna B largura
        {
          updateDimensionProperties: {
            range: { sheetId: resumoId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 },
            properties: { pixelSize: 180 },
            fields: 'pixelSize',
          },
        },
        // Título principal
        {
          repeatCell: {
            range: { sheetId: resumoId, startRowIndex: titleRow, endRowIndex: titleRow + 1, startColumnIndex: 0, endColumnIndex: 2 },
            cell: {
              userEnteredFormat: {
                backgroundColor: hex('#1b5e20'),
                textFormat: { foregroundColor: hex('#ffffff'), bold: true, fontSize: 14 },
                horizontalAlignment: 'LEFT',
                verticalAlignment: 'MIDDLE',
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
          },
        },
        // Altura do título
        {
          updateDimensionProperties: {
            range: { sheetId: resumoId, dimension: 'ROWS', startIndex: titleRow, endIndex: titleRow + 1 },
            properties: { pixelSize: 50 },
            fields: 'pixelSize',
          },
        },
        // Linha "Mês de referência"
        {
          repeatCell: {
            range: { sheetId: resumoId, startRowIndex: mesRow, endRowIndex: mesRow + 1, startColumnIndex: 0, endColumnIndex: 2 },
            cell: {
              userEnteredFormat: {
                backgroundColor: hex('#e8f5e9'),
                textFormat: { bold: true, fontSize: 11 },
                verticalAlignment: 'MIDDLE',
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)',
          },
        },
        // Headers das seções (POR PESSOA, POR CATEGORIA, POR PAGAMENTO)
        ...[pessoaHeaderRow, catHeaderRow, pgtoHeaderRow].map(row => ({
          repeatCell: {
            range: { sheetId: resumoId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 0, endColumnIndex: 2 },
            cell: headerCell('#2e7d32', '#ffffff', 11),
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
          },
        })),
        // Formato moeda em todas as células da coluna B a partir da linha 5
        {
          repeatCell: {
            range: { sheetId: resumoId, startRowIndex: 5, endRowIndex: 100, startColumnIndex: 1, endColumnIndex: 2 },
            cell: { userEnteredFormat: { numberFormat: currencyFmt() } },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
      ],
    },
  });

  // =========================================================
  // ABA: FINANCIAMENTOS
  // =========================================================
  console.log('🚗 Formatando aba Financiamentos...');

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Financiamentos!A1:H1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [['ID', 'Descricao', 'Tipo', 'Responsavel', 'ValorParcela', 'ParcelasPagas', 'ParcelasTotais', 'DataCadastro']],
    },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: { sheetId: financiamentosId, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
        {
          repeatCell: {
            range: { sheetId: financiamentosId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 },
            cell: headerCell('#1b5e20'),
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
          },
        },
        {
          updateDimensionProperties: {
            range: { sheetId: financiamentosId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
            properties: { pixelSize: 42 },
            fields: 'pixelSize',
          },
        },
        ...[110, 220, 140, 160, 130, 130, 130, 130].map((px, i) => ({
          updateDimensionProperties: {
            range: { sheetId: financiamentosId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
            properties: { pixelSize: px },
            fields: 'pixelSize',
          },
        })),
        // Coluna ValorParcela → formato moeda
        {
          repeatCell: {
            range: { sheetId: financiamentosId, startRowIndex: 1, endRowIndex: 5000, startColumnIndex: 4, endColumnIndex: 5 },
            cell: { userEnteredFormat: { numberFormat: currencyFmt() } },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        {
          updateBorders: {
            range: { sheetId: financiamentosId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 },
            bottom: { style: 'SOLID_MEDIUM', color: hex('#ffffff') },
          },
        },
      ],
    },
  });

  // =========================================================
  // ABA: METAS
  // =========================================================
  console.log('🎯 Formatando aba Metas...');

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Metas!A1:C1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [['Responsavel', 'Categoria', 'ValorMeta']],
    },
  });

  // Só preenche as combinações se a aba ainda estiver vazia (não sobrescreve metas já definidas)
  const metasAtuais = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Metas!A2:A',
  });

  if (!metasAtuais.data.values || metasAtuais.data.values.length === 0) {
    const seedRows = [USER1_NAME, USER2_NAME].flatMap(pessoa =>
      CATEGORIES.map(cat => [pessoa, cat, 0])
    );
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Metas!A2',
      valueInputOption: 'RAW',
      requestBody: { values: seedRows },
    });
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: { sheetId: metasId, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
        {
          repeatCell: {
            range: { sheetId: metasId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 3 },
            cell: headerCell('#1b5e20'),
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
          },
        },
        ...[160, 220, 160].map((px, i) => ({
          updateDimensionProperties: {
            range: { sheetId: metasId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
            properties: { pixelSize: px },
            fields: 'pixelSize',
          },
        })),
        {
          repeatCell: {
            range: { sheetId: metasId, startRowIndex: 1, endRowIndex: 5000, startColumnIndex: 2, endColumnIndex: 3 },
            cell: { userEnteredFormat: { numberFormat: currencyFmt() } },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        {
          updateBorders: {
            range: { sheetId: metasId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 3 },
            bottom: { style: 'SOLID_MEDIUM', color: hex('#ffffff') },
          },
        },
      ],
    },
  });

  // =========================================================
  // ABA: RENDA
  // =========================================================
  console.log('💵 Formatando aba Renda...');

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Renda!A1:D1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [['Responsavel', 'Descricao', 'Valor', 'DataCadastro']],
    },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: { sheetId: rendaId, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
        {
          repeatCell: {
            range: { sheetId: rendaId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 4 },
            cell: headerCell('#1b5e20'),
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
          },
        },
        ...[160, 200, 130, 130].map((px, i) => ({
          updateDimensionProperties: {
            range: { sheetId: rendaId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
            properties: { pixelSize: px },
            fields: 'pixelSize',
          },
        })),
        {
          repeatCell: {
            range: { sheetId: rendaId, startRowIndex: 1, endRowIndex: 5000, startColumnIndex: 2, endColumnIndex: 3 },
            cell: { userEnteredFormat: { numberFormat: currencyFmt() } },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        {
          updateBorders: {
            range: { sheetId: rendaId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 4 },
            bottom: { style: 'SOLID_MEDIUM', color: hex('#ffffff') },
          },
        },
      ],
    },
  });

  // =========================================================
  // ABA: GASTOS FIXOS
  // =========================================================
  console.log('🔁 Formatando aba GastosFixos...');

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'GastosFixos!A1:H1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [['ID', 'Descricao', 'Categoria', 'Valor', 'Responsavel', 'DiaVencimento', 'UltimoMesLancado', 'DataCadastro']],
    },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: { sheetId: gastosFixosId, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
        {
          repeatCell: {
            range: { sheetId: gastosFixosId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 },
            cell: headerCell('#1b5e20'),
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
          },
        },
        ...[110, 200, 140, 110, 160, 130, 150, 130].map((px, i) => ({
          updateDimensionProperties: {
            range: { sheetId: gastosFixosId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
            properties: { pixelSize: px },
            fields: 'pixelSize',
          },
        })),
        {
          repeatCell: {
            range: { sheetId: gastosFixosId, startRowIndex: 1, endRowIndex: 5000, startColumnIndex: 3, endColumnIndex: 4 },
            cell: { userEnteredFormat: { numberFormat: currencyFmt() } },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        {
          updateBorders: {
            range: { sheetId: gastosFixosId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 },
            bottom: { style: 'SOLID_MEDIUM', color: hex('#ffffff') },
          },
        },
      ],
    },
  });

  console.log('\n✅ Planilha configurada com sucesso!');
  console.log('📋 Abas criadas: Gastos | Resumo | Financiamentos | Metas | Renda | GastosFixos');
  console.log('🔗 Acesse: https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID);
}

main().catch(err => {
  console.error('❌ Erro:', err.message ?? err);
  process.exit(1);
});
