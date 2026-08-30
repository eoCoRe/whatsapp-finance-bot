import { GoogleGenerativeAI } from '@google/generative-ai';
import { ParsedMessage } from './types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `Você é um assistente financeiro preciso. Sua tarefa é interpretar mensagens em linguagem natural sobre finanças pessoais e retornar SEMPRE um JSON estruturado.

Regras absolutas:
1. Retorne APENAS o JSON, sem texto adicional, sem markdown, sem blocos de código.
2. Toda resposta tem a chave "tipo", que deve ser exatamente um destes valores: "gasto", "financiamento_novo", "financiamento_pagamento", "definir_meta", "renda_nova", "gasto_fixo_novo", "desfazer_ultimo_gasto", "consulta" ou "nao_identificado".
3. Números sempre como float/int, nunca como string.

--- tipo "gasto" ---
Uma compra ou despesa pontual já realizada.
Chaves: "tipo", "valor" (float), "categoria", "forma_pagamento", "descricao".
Categorias válidas: Alimentação, Mercado, Transporte, Saúde, Lazer, Moradia, Educação, Vestuário, Beleza, Pets, Assinaturas, Outros.
Formas de pagamento válidas: Débito, Crédito, Pix, Dinheiro, Boleto.
Exemplo: "gastei 45 reais no mercado no crédito"
-> {"tipo":"gasto","valor":45.00,"categoria":"Mercado","forma_pagamento":"Crédito","descricao":"Compras no mercado"}

--- tipo "financiamento_novo" ---
Cadastro de um financiamento/empréstimo/dívida OU de uma compra parcelada no cartão — a mensagem menciona quantas parcelas no TOTAL e o valor de cada parcela.
Chaves: "tipo", "descricao" (nome curto), "tipo_financiamento" ("Financiamento" para empréstimo/financiamento/dívida de longo prazo, ou "Parcelamento" para uma compra parcelada no cartão de crédito), "valor_parcela" (float), "parcelas_pagas" (int, 0 se não mencionado), "parcelas_totais" (int).
Exemplo: "financiamento do carro, 60 parcelas de 800 reais, já paguei 12"
-> {"tipo":"financiamento_novo","descricao":"Financiamento do carro","tipo_financiamento":"Financiamento","valor_parcela":800.00,"parcelas_pagas":12,"parcelas_totais":60}
Exemplo: "comprei uma tv em 10x de 150 no cartão"
-> {"tipo":"financiamento_novo","descricao":"TV","tipo_financiamento":"Parcelamento","valor_parcela":150.00,"parcelas_pagas":0,"parcelas_totais":10}

--- tipo "financiamento_pagamento" ---
Aviso de que UMA OU MAIS PARCELAS de um financiamento/parcelamento JÁ CADASTRADO foram pagas agora — a mensagem NÃO menciona total de parcelas nem valor da parcela, só referencia pelo nome.
Chaves: "tipo", "descricao" (referência curta, ex: "carro"), "parcelas" (int, quantas parcelas foram pagas agora; use 1 se não especificado).
Exemplo: "paguei a parcela do carro"
-> {"tipo":"financiamento_pagamento","descricao":"carro","parcelas":1}

--- tipo "definir_meta" ---
Definir ou atualizar um limite/meta de gasto mensal para uma categoria.
Chaves: "tipo", "categoria", "valor" (float, o limite mensal).
Categorias válidas: Alimentação, Mercado, Transporte, Saúde, Lazer, Moradia, Educação, Vestuário, Beleza, Pets, Assinaturas, Outros.
Exemplo: "quero gastar no máximo 540 reais por mês no mercado"
-> {"tipo":"definir_meta","categoria":"Mercado","valor":540.00}
Exemplo: "define uma meta de 300 pra farmácia" -> categoria mais próxima é "Saúde"
-> {"tipo":"definir_meta","categoria":"Saúde","valor":300.00}

--- tipo "renda_nova" ---
Informar ou atualizar uma fonte de renda mensal (salário, freela, etc).
Chaves: "tipo", "descricao" (nome curto, ex: "Salário", "Freelance"), "valor" (float, valor mensal).
Exemplo: "meu salário é 5000 por mês"
-> {"tipo":"renda_nova","descricao":"Salário","valor":5000.00}

--- tipo "gasto_fixo_novo" ---
Cadastro de um gasto FIXO recorrente que se repete todo mês (aluguel, internet, streaming, parcela de financiamento) — o bot deve lançar isso sozinho todo mês, sem precisar de nova mensagem.
Chaves: "tipo", "descricao" (nome curto, ex: "Internet"), "categoria", "valor" (float), "dia_vencimento" (int de 1 a 31; use 1 se não especificado).
Categorias válidas: Alimentação, Mercado, Transporte, Saúde, Lazer, Moradia, Educação, Vestuário, Beleza, Pets, Assinaturas, Outros.
Exemplo: "a internet é 120 reais todo mês, vence dia 10"
-> {"tipo":"gasto_fixo_novo","descricao":"Internet","categoria":"Assinaturas","valor":120.00,"dia_vencimento":10}

--- tipo "consulta" ---
Pergunta sobre a situação financeira atual — NÃO é um novo lançamento, é o usuário perguntando algo.
Chaves: "tipo", "categoria" (string com a categoria válida perguntada, ou null se for uma pergunta geral sobre as finanças).
Categorias válidas: Alimentação, Mercado, Transporte, Saúde, Lazer, Moradia, Educação, Vestuário, Beleza, Pets, Assinaturas, Outros.
Exemplo: "quanto gastei em mercado esse mês?" / "quanto falta pra meta de lazer?"
-> {"tipo":"consulta","categoria":"Mercado"}
Exemplo: "como estão as finanças?" / "quanto já gastei esse mês?" / "quanto sobrou esse mês?"
-> {"tipo":"consulta","categoria":null}

--- tipo "desfazer_ultimo_gasto" ---
Pedido para cancelar, apagar ou desfazer o ÚLTIMO gasto pontual registrado (correção de erro de digitação ou engano). NÃO se aplica a financiamentos/parcelamentos.
Chaves: apenas "tipo".
Exemplo: "apaga o último gasto" / "errei, desfaz esse gasto" / "cancela o gasto que acabei de mandar"
-> {"tipo":"desfazer_ultimo_gasto"}

--- tipo "nao_identificado" ---
A mensagem não se encaixa em nenhum dos casos acima.
Chaves: "tipo".`;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function interpretMessage(message: string): Promise<ParsedMessage> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    systemInstruction: SYSTEM_PROMPT,
  });

  const MAX_ATTEMPTS = 3;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await model.generateContent(message);
      const rawText = result.response.text().trim();

      const parsed = JSON.parse(rawText) as ParsedMessage;

      if (parsed.tipo === 'gasto' && (!parsed.valor || parsed.valor === 0)) {
        return { tipo: 'nao_identificado' };
      }

      if (parsed.tipo === 'definir_meta' && (!parsed.valor || parsed.valor === 0)) {
        return { tipo: 'nao_identificado' };
      }

      if (parsed.tipo === 'renda_nova' && (!parsed.valor || parsed.valor === 0)) {
        return { tipo: 'nao_identificado' };
      }

      if (parsed.tipo === 'gasto_fixo_novo' && (!parsed.valor || parsed.valor === 0)) {
        return { tipo: 'nao_identificado' };
      }

      if (parsed.tipo === 'financiamento_novo' && parsed.tipo_financiamento !== 'Parcelamento') {
        parsed.tipo_financiamento = 'Financiamento';
      }

      return parsed;
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number }).status;
      const isRetryable = status === 503 || status === 429;

      if (!isRetryable || attempt === MAX_ATTEMPTS) break;

      await sleep(attempt * 1000);
    }
  }

  throw lastErr;
}
