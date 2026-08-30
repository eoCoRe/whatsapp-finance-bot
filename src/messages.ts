import { Expense, Financing, ResumoPeriodo, ConsultaGeral } from './types';

function pick<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2)}`;
}

// ---------- Gasto registrado com sucesso ----------

const GASTO_CONFIRMADO = [
  (parent: string) => `🐶💰 Au au, ${parent}! Anotei aqui:`,
  (parent: string) => `📝🐷 Beleza, ${parent}! Botei na planilha:`,
  (parent: string) => `🎮 Leitãozinho gamer registrando o boss fight financeiro, ${parent}:`,
  (parent: string) => `🐾 Recebido, ${parent}! Já era pra tá anotado:`,
  (parent: string) => `😋🦴 Nham, ${parent}, mais um gasto pro meu potinho de dados:`,
  (parent: string) => `✅🐽 Fechou, ${parent}! Registrei certinho:`,
];

const GASTO_SIGN_OFFS = [
  'Continuo de plantão de olho no dinheirinho! 🐾',
  'Leitãozinho gamer sempre no controle da economia da casa! 🎮🐶',
  'Auau, missão registrada com sucesso! 🐽',
  'Rosnado de aprovação registrado nos livros! 🦴',
  'Balançando o rabinho de felicidade, gasto anotado! 🐾',
  'Sempre alerta com o focinho na planilha! 🐷',
  'Missão cumprida, voltando a patrulhar os gastos! 🕵️‍♂️🐶',
  'Cofrinho de porquinho sempre de olho aberto! 🐖',
];

export function gastoConfirmado(
  parent: string,
  expense: { valor: number; categoria: string; formaPagamento: string; descricao: string },
  extraLines: (string | null | undefined)[] = []
): string {
  const extras = extraLines.filter(Boolean).join('\n');
  return (
    `${pick(GASTO_CONFIRMADO)(parent)}\n` +
    `💸 ${formatBRL(expense.valor)} em *${expense.categoria}*\n` +
    `💳 ${expense.formaPagamento} | 📝 ${expense.descricao}\n` +
    (extras ? `${extras}\n` : '') +
    `\n${pick(GASTO_SIGN_OFFS)}`
  );
}

// ---------- Erros ao interpretar mensagem ----------

const ERRO_INTERPRETAR = [
  (parent: string) => `😵💫 Eita, ${parent}! Meu cerebrinho de leitão engasgou tentando entender isso. Manda de novo? 🐷`,
  (parent: string) => `🤯🐽 Ops ${parent}, deu ruim aqui no meu processador de ração. Tenta de novo? 🐾`,
  (parent: string) => `😴💤 ${parent}, acho que cochilei no meio da mensagem. Manda de novo pra mim? 🐶`,
  (parent: string) => `🐷🔌 Xii, ${parent}, minha internet de leitãozinho engasgou. Manda de novo? 🐾`,
  (parent: string) => `😬🦴 Deu zebra aqui, ${parent}! Tenta mandar essa mensagem de novo? 🐽`,
];

export function erroInterpretar(parent: string): string {
  return pick(ERRO_INTERPRETAR)(parent);
}

// ---------- Mensagem não identificada ----------

const NAO_IDENTIFICADO = [
  (parent: string) =>
    `🤔🐽 Hmm, ${parent}, não captei nada aí! Tenta algo como:\n` +
    `• "gastei 50 reais no mercado no crédito"\n` +
    `• "financiamento do carro, 60 parcelas de 800, já paguei 12"\n` +
    `• "comprei uma TV em 10x de 150 no cartão"\n` +
    `• "paguei a parcela do carro"\n` +
    `• "meta de 540 por mês no mercado"\n` +
    `• "meu salário é 5000 por mês"\n` +
    `• "a internet é 120, vence dia 10"\n` +
    `• "apaga o último gasto"\n` +
    `• "como estão as finanças?" 🐾`,
  (parent: string) =>
    `🐶❓ Xiii ${parent}, essa eu não entendi! Pode ser algo tipo:\n` +
    `• "gastei 30 na farmácia no pix"\n` +
    `• "financiamento da moto, 24 parcelas de 300, já paguei 5"\n` +
    `• "parcelei o celular em 12x de 200"\n` +
    `• "paguei a parcela da moto"\n` +
    `• "quero gastar no máximo 300 em lazer por mês" 🐾`,
  (parent: string) =>
    `🐷🧐 Fiquei confuso, ${parent}! Manda de um jeito tipo:\n` +
    `• "50 reais de gasolina no débito"\n` +
    `• "financiamento do carro, 60 parcelas de 800"\n` +
    `• "paguei a parcela do carro" 🐾`,
];

export function naoIdentificado(parent: string): string {
  return pick(NAO_IDENTIFICADO)(parent);
}

// ---------- Erro ao salvar gasto na planilha ----------

const ERRO_SALVAR_GASTO = [
  (parent: string) => `😥 Entendi o gasto, ${parent}, mas não consegui anotar na planilha... dá uma olhadinha na configuração pra mim? 🐾`,
  (parent: string) => `😖🐷 Entendi tudo, ${parent}, mas a planilha me mordeu e não deixou salvar. Confere aí? 🐾`,
  (parent: string) => `🙈 ${parent}, entendi o gasto mas travei tentando salvar na planilha. Dá uma checada? 🐾`,
];

export function erroSalvarGasto(parent: string): string {
  return pick(ERRO_SALVAR_GASTO)(parent);
}

// ---------- Financiamento cadastrado ----------

const FINANCIAMENTO_CADASTRADO = [
  (parent: string, f: Financing) => `📋🐷 Cadastrado, ${parent}! *${f.descricao}*`,
  (parent: string, f: Financing) => `🐶📎 Anotado na coleira, ${parent}! *${f.descricao}* já tá na lista:`,
  (parent: string, f: Financing) => `🎮🐾 Nova missão registrada, ${parent}! *${f.descricao}*:`,
  (parent: string, f: Financing) => `🐽📌 Beleza ${parent}, cadastrei *${f.descricao}* aqui:`,
];

export function financiamentoCadastrado(parent: string, financing: Financing): string {
  const restante = (financing.parcelasTotais - financing.parcelasPagas) * financing.valorParcela;
  const apelido = financing.descricao.split(' ').pop();
  const tag = financing.tipo === 'Parcelamento' ? '💳 Parcelamento' : '🏦 Financiamento';
  return (
    `${pick(FINANCIAMENTO_CADASTRADO)(parent, financing)}\n` +
    `${tag}\n` +
    `✅ ${financing.parcelasPagas}/${financing.parcelasTotais} parcelas pagas\n` +
    `💰 Falta ${formatBRL(restante)} (${formatBRL(financing.valorParcela)}/parcela)\n\n` +
    `Quando pagar mais uma, é só me falar "paguei a parcela do ${apelido}"! 🐾`
  );
}

// ---------- Erro ao cadastrar financiamento ----------

const ERRO_CADASTRAR_FINANCIAMENTO = [
  (parent: string) => `😥 Entendi o financiamento, ${parent}, mas não consegui salvar na planilha. Confere se a aba "Financiamentos" existe! 🐾`,
  (parent: string) => `🙈🐷 ${parent}, travei tentando cadastrar esse financiamento. Confere a aba "Financiamentos" pra mim? 🐾`,
];

export function erroCadastrarFinanciamento(parent: string): string {
  return pick(ERRO_CADASTRAR_FINANCIAMENTO)(parent);
}

// ---------- Pagamento de financiamento: não encontrado ----------

const FINANCIAMENTO_NAO_ENCONTRADO = [
  (parent: string, desc: string) =>
    `🐽❓ Não achei nenhum financiamento chamado "${desc}", ${parent}. Cadastra primeiro, tipo: "financiamento do carro, 60 parcelas de 800, já paguei 0" 🐾`,
  (parent: string, desc: string) =>
    `🐶🔍 Procurei, procurei e não achei "${desc}" na minha lista, ${parent}. Cadastra esse financiamento primeiro! 🐾`,
  (parent: string, desc: string) =>
    `🤷‍♂️🐷 Hmm ${parent}, "${desc}" não tá na minha coleira de financiamentos. Cadastra primeiro? 🐾`,
];

export function financiamentoNaoEncontrado(parent: string, descricao: string): string {
  return pick(FINANCIAMENTO_NAO_ENCONTRADO)(parent, descricao);
}

// ---------- Pagamento de financiamento: ambíguo ----------

const FINANCIAMENTO_AMBIGUO = [
  (parent: string, opcoes: string) => `🐷🤔 Achei mais de um financiamento parecido, ${parent}: ${opcoes}. Manda de novo especificando melhor qual! 🐾`,
  (parent: string, opcoes: string) => `🐶❔ Opa ${parent}, tenho mais de um que combina: ${opcoes}. Qual dos dois você quer dizer? 🐾`,
];

export function financiamentoAmbiguo(parent: string, opcoes: string[]): string {
  return pick(FINANCIAMENTO_AMBIGUO)(parent, opcoes.join(', '));
}

// ---------- Pagamento registrado (não quitado) ----------

const PAGAMENTO_REGISTRADO = [
  (parent: string, f: Financing) => `🐾✅ Parcela registrada, ${parent}! *${f.descricao}*`,
  (parent: string, f: Financing) => `🐶💪 Mais uma pro peito, ${parent}! *${f.descricao}* atualizado:`,
  (parent: string, f: Financing) => `🐷🎯 Acertou em cheio, ${parent}! *${f.descricao}*:`,
  (parent: string, f: Financing) => `🦴📉 Dívida encolhendo, ${parent}! *${f.descricao}*:`,
];

export function pagamentoRegistrado(parent: string, financing: Financing): string {
  const restante = (financing.parcelasTotais - financing.parcelasPagas) * financing.valorParcela;
  return (
    `${pick(PAGAMENTO_REGISTRADO)(parent, financing)}\n` +
    `${financing.parcelasPagas}/${financing.parcelasTotais} parcelas pagas\n` +
    `💰 Falta ${formatBRL(restante)}\n\n` +
    `${pick(GASTO_SIGN_OFFS)}`
  );
}

// ---------- Financiamento quitado ----------

const FINANCIAMENTO_QUITADO = [
  (parent: string, f: Financing) => `🎉🐶🎊 UAU, ${parent}! *${f.descricao}* foi QUITADO! Última parcela registrada, chega de boletos disso! 🦴🐾`,
  (parent: string, f: Financing) => `🏆🐷 ${parent}, ACABOU! *${f.descricao}* tá 100% pago! Bora comemorar! 🎉🐾`,
  (parent: string, f: Financing) => `🐶🎆 Missão cumprida, ${parent}! *${f.descricao}* quitado de vez! Nem lembro mais dessa dívida! 🦴`,
];

export function financiamentoQuitado(parent: string, financing: Financing): string {
  return pick(FINANCIAMENTO_QUITADO)(parent, financing);
}

// ---------- Erro ao registrar pagamento de financiamento ----------

const ERRO_PAGAMENTO_FINANCIAMENTO = [
  (parent: string) => `😥 Deu ruim tentando registrar esse pagamento, ${parent}. Confere se a aba "Financiamentos" existe! 🐾`,
  (parent: string) => `🙈🐷 ${parent}, travei tentando registrar essa parcela. Confere a planilha pra mim? 🐾`,
];

export function erroPagamentoFinanciamento(parent: string): string {
  return pick(ERRO_PAGAMENTO_FINANCIAMENTO)(parent);
}

// ---------- Meta definida ----------

const META_DEFINIDA = [
  (parent: string, categoria: string, valor: number) =>
    `🎯🐶 Combinado, ${parent}! Meta de *${categoria}* agora é ${formatBRL(valor)} por mês.`,
  (parent: string, categoria: string, valor: number) =>
    `🐷📏 Anotado, ${parent}! Vou de olho em *${categoria}*: limite de ${formatBRL(valor)}/mês.`,
  (parent: string, categoria: string, valor: number) =>
    `🎮🐾 Missão aceita, ${parent}! *${categoria}* com teto de ${formatBRL(valor)} por mês. Vou fiscalizar! 🕵️‍♂️`,
];

export function metaDefinida(parent: string, categoria: string, valor: number): string {
  return pick(META_DEFINIDA)(parent, categoria, valor);
}

// ---------- Erro ao definir meta ----------

const ERRO_DEFINIR_META = [
  (parent: string) => `😥 Entendi a meta, ${parent}, mas não consegui salvar na planilha. Confere se a aba "Metas" existe! 🐾`,
  (parent: string) => `🙈🐷 ${parent}, travei tentando salvar essa meta. Dá uma olhada na planilha pra mim? 🐾`,
];

export function erroDefinirMeta(parent: string): string {
  return pick(ERRO_DEFINIR_META)(parent);
}

// ---------- Linha de progresso de meta (anexada à confirmação de gasto) ----------

export function progressoMeta(categoria: string, gastoNoMes: number, meta: number): string | null {
  if (meta <= 0) return null;

  const pct = (gastoNoMes / meta) * 100;

  if (pct >= 100) {
    return `🚨 Estourou a meta de *${categoria}*! ${formatBRL(gastoNoMes)} de ${formatBRL(meta)} esse mês 😬`;
  }

  if (pct >= 80) {
    return `⚠️ Cuidado! Já foi ${formatBRL(gastoNoMes)} de ${formatBRL(meta)} (${pct.toFixed(0)}%) em *${categoria}* esse mês.`;
  }

  return `🎯 ${categoria}: ${formatBRL(gastoNoMes)}/${formatBRL(meta)} esse mês (${pct.toFixed(0)}%)`;
}

// ---------- Renda cadastrada ----------

const RENDA_DEFINIDA = [
  (parent: string, descricao: string, valor: number) =>
    `💵🐶 Anotado, ${parent}! *${descricao}*: ${formatBRL(valor)} por mês.`,
  (parent: string, descricao: string, valor: number) =>
    `🐷💰 Beleza, ${parent}! Renda de *${descricao}* (${formatBRL(valor)}/mês) registrada.`,
  (parent: string, descricao: string, valor: number) =>
    `🎯🐾 Combinado, ${parent}! *${descricao}* = ${formatBRL(valor)} por mês entrando no orçamento.`,
];

export function rendaDefinida(parent: string, descricao: string, valor: number): string {
  return pick(RENDA_DEFINIDA)(parent, descricao, valor);
}

// ---------- Erro ao definir renda ----------

const ERRO_DEFINIR_RENDA = [
  (parent: string) => `😥 Entendi a renda, ${parent}, mas não consegui salvar na planilha. Confere se a aba "Renda" existe! 🐾`,
  (parent: string) => `🙈🐷 ${parent}, travei tentando salvar essa renda. Dá uma olhada na planilha pra mim? 🐾`,
];

export function erroDefinirRenda(parent: string): string {
  return pick(ERRO_DEFINIR_RENDA)(parent);
}

// ---------- Gasto fixo cadastrado ----------

const GASTO_FIXO_CADASTRADO = [
  (parent: string, descricao: string, valor: number, dia: number) =>
    `🔁🐶 Combinado, ${parent}! Vou lançar *${descricao}* (${formatBRL(valor)}) sozinho todo dia ${dia} do mês.`,
  (parent: string, descricao: string, valor: number, dia: number) =>
    `🐷🗓️ Anotado, ${parent}! *${descricao}* de ${formatBRL(valor)} entra automático todo dia ${dia}. Pode deixar comigo!`,
  (parent: string, descricao: string, valor: number, dia: number) =>
    `🎮🔁 Missão recorrente aceita, ${parent}! *${descricao}* (${formatBRL(valor)}) lançado sozinho todo dia ${dia}.`,
];

export function gastoFixoCadastrado(parent: string, descricao: string, valor: number, dia: number): string {
  return pick(GASTO_FIXO_CADASTRADO)(parent, descricao, valor, dia);
}

// ---------- Erro ao cadastrar gasto fixo ----------

const ERRO_GASTO_FIXO = [
  (parent: string) => `😥 Entendi o gasto fixo, ${parent}, mas não consegui salvar na planilha. Confere se a aba "GastosFixos" existe! 🐾`,
  (parent: string) => `🙈🐷 ${parent}, travei tentando cadastrar esse gasto fixo. Dá uma olhada na planilha pra mim? 🐾`,
];

export function erroGastoFixo(parent: string): string {
  return pick(ERRO_GASTO_FIXO)(parent);
}

// ---------- Gasto fixo lançado automaticamente (notificação proativa) ----------

const GASTO_FIXO_AUTO_LANCADO = [
  (descricao: string, valor: number) =>
    `🐶🔁 Oi! Lancei sozinho o gasto fixo de hoje: *${descricao}* — ${formatBRL(valor)}. Já tá tudo na planilha! 🐾`,
  (descricao: string, valor: number) =>
    `🐷🗓️ Passando aqui pra avisar: registrei *${descricao}* (${formatBRL(valor)}) automaticamente esse mês! 🐾`,
  (descricao: string, valor: number) =>
    `🎮🔁 Leitãozinho gamer cumprindo a missão recorrente: *${descricao}* de ${formatBRL(valor)} lançado sozinho! 🐾`,
];

export function gastoFixoAutoLancado(descricao: string, valor: number): string {
  return pick(GASTO_FIXO_AUTO_LANCADO)(descricao, valor);
}

// ---------- Desfazer último gasto ----------

const GASTO_REMOVIDO = [
  (parent: string, e: Expense) => `🗑️🐶 Prontinho, ${parent}! Apaguei o último gasto:`,
  (parent: string, e: Expense) => `🐷✂️ Beleza, ${parent}! Desfiz esse lançamento aqui:`,
  (parent: string, e: Expense) => `🐾↩️ Feito, ${parent}! Tirei da planilha:`,
];

export function gastoRemovido(parent: string, expense: Expense): string {
  return (
    `${pick(GASTO_REMOVIDO)(parent, expense)}\n` +
    `💸 ${formatBRL(expense.valor)} em *${expense.categoria}*\n` +
    `💳 ${expense.formaPagamento} | 📝 ${expense.descricao}\n\n` +
    `Pode mandar de novo certinho quando quiser! 🐾`
  );
}

const NADA_PARA_REMOVER = [
  (parent: string) => `🤔🐽 Não achei nenhum gasto seu recente pra apagar, ${parent}. 🐾`,
  (parent: string) => `🐶❓ Hmm ${parent}, não tenho nenhum gasto seu registrado pra desfazer. 🐾`,
];

export function nadaParaRemover(parent: string): string {
  return pick(NADA_PARA_REMOVER)(parent);
}

const ERRO_REMOVER_GASTO = [
  (parent: string) => `😥 Quis apagar o gasto, ${parent}, mas travei tentando mexer na planilha. Confere aí? 🐾`,
  (parent: string) => `🙈🐷 ${parent}, travei tentando desfazer esse gasto. Dá uma olhada na planilha pra mim? 🐾`,
];

export function erroRemoverGasto(parent: string): string {
  return pick(ERRO_REMOVER_GASTO)(parent);
}

// ---------- Resumos periódicos (proativos) ----------

function listaPorResponsavel(porResponsavel: Record<string, number>): string {
  return Object.entries(porResponsavel)
    .sort((a, b) => b[1] - a[1])
    .map(([nome, valor]) => `   • ${nome}: ${formatBRL(valor)}`)
    .join('\n');
}

function listaTopCategorias(porCategoria: { categoria: string; total: number }[]): string {
  return porCategoria
    .slice(0, 3)
    .map(c => `   • ${c.categoria}: ${formatBRL(c.total)}`)
    .join('\n');
}

export function resumoSemanal(resumo: ResumoPeriodo): string {
  const porPessoa = listaPorResponsavel(resumo.porResponsavel);
  const topCategorias = listaTopCategorias(resumo.porCategoria);

  return (
    `📊🐷 Resumo dos últimos 7 dias, gente!\n\n` +
    `💰 Total gasto: ${formatBRL(resumo.totalGeral)}\n` +
    (porPessoa ? `\n👥 Por pessoa:\n${porPessoa}\n` : '') +
    (topCategorias ? `\n🏷️ Top categorias:\n${topCategorias}\n` : '') +
    `\nBora fechar mais uma semana no azul! 🐾`
  );
}

export function resumoMensal(resumo: ResumoPeriodo, rendaTotal: number): string {
  const porPessoa = listaPorResponsavel(resumo.porResponsavel);
  const topCategorias = listaTopCategorias(resumo.porCategoria);
  const saldoLine =
    rendaTotal > 0
      ? `\n📈 Renda do mês: ${formatBRL(rendaTotal)} | Saldo: ${formatBRL(rendaTotal - resumo.totalGeral)}\n`
      : '';

  return (
    `📅🐷 Fechamento do mês passado!\n\n` +
    `💰 Total gasto: ${formatBRL(resumo.totalGeral)}\n` +
    saldoLine +
    (porPessoa ? `\n👥 Por pessoa:\n${porPessoa}\n` : '') +
    (topCategorias ? `\n🏷️ Top categorias:\n${topCategorias}\n` : '') +
    `\nMais um mês registrado com sucesso! 🐾`
  );
}

// ---------- Alerta de orçamento geral (renda x gasto do mês) ----------

export function orcamentoGeralAlerta(gastoTotal: number, rendaTotal: number): string | null {
  if (rendaTotal <= 0) return null;

  const pct = (gastoTotal / rendaTotal) * 100;

  if (pct >= 100) {
    return `🚨🏠 Orçamento geral estourado! Já foi ${formatBRL(gastoTotal)} de ${formatBRL(rendaTotal)} de renda esse mês.`;
  }

  if (pct >= 80) {
    return `⚠️🏠 Atenção! O gasto geral do mês já é ${pct.toFixed(0)}% da renda (${formatBRL(gastoTotal)} de ${formatBRL(rendaTotal)}).`;
  }

  return null;
}

// ---------- Consulta por texto ----------

export function consultaCategoria(parent: string, categoria: string, gasto: number, meta: number): string {
  const metaLine = meta > 0 ? progressoMeta(categoria, gasto, meta) : null;
  return (
    `📊🐷 Aqui está, ${parent}!\n\n` +
    `💸 *${categoria}*: ${formatBRL(gasto)} gastos esse mês\n` +
    (metaLine ? `${metaLine}\n` : `(sem meta definida pra essa categoria)\n`) +
    `\n${pick(GASTO_SIGN_OFFS)}`
  );
}

export function consultaGeral(parent: string, c: ConsultaGeral): string {
  const variacao =
    c.gastoMesAnteriorMesmoDia > 0
      ? (((c.gastoMesAtual - c.gastoMesAnteriorMesmoDia) / c.gastoMesAnteriorMesmoDia) * 100).toFixed(0)
      : null;

  const comparativoLine =
    variacao !== null
      ? `📈 ${Number(variacao) >= 0 ? 'Gastando' : 'Economizando'} ${Math.abs(Number(variacao))}% ${Number(variacao) >= 0 ? 'a mais' : 'a menos'} que no mesmo período do mês passado (${formatBRL(c.gastoMesAnteriorMesmoDia)}).\n`
      : '';

  const saldoLine =
    c.rendaTotal > 0
      ? `📈 Renda: ${formatBRL(c.rendaTotal)} | Saldo do mês: ${formatBRL(c.saldoMes)}\n`
      : '';

  const compromissoLine =
    c.compromissoMensalFixo > 0
      ? `🔁 Compromisso mensal fixo (financiamentos + gastos fixos): ${formatBRL(c.compromissoMensalFixo)}\n`
      : '';

  const metasLines = c.metas
    .map(m => `   ${progressoMeta(m.categoria, m.gasto, m.meta)}`)
    .join('\n');

  return (
    `📊🐷 Situação das finanças, ${parent}!\n\n` +
    `💸 Gasto esse mês: ${formatBRL(c.gastoMesAtual)}\n` +
    comparativoLine +
    saldoLine +
    compromissoLine +
    (metasLines ? `\n🎯 Suas metas:\n${metasLines}\n` : '') +
    `\n${pick(GASTO_SIGN_OFFS)}`
  );
}

const ERRO_CONSULTA = [
  (parent: string) => `😥 Quis responder, ${parent}, mas travei tentando ler a planilha. Confere aí? 🐾`,
  (parent: string) => `🙈🐷 ${parent}, travei tentando consultar as finanças. Dá uma olhada na planilha pra mim? 🐾`,
];

export function erroConsulta(parent: string): string {
  return pick(ERRO_CONSULTA)(parent);
}

// ---------- Erro no backup automático ----------

export function erroBackup(): string {
  return '⚠️🐷 O backup automático da planilha falhou essa semana. Vale a pena checar as permissões da Service Account no Google Drive. 🐾';
}
