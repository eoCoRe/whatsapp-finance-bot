import { GoogleGenerativeAI } from '@google/generative-ai';
import { ParsedExpense } from './types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `Você é um assistente financeiro preciso. Sua única tarefa é extrair informações de gastos de mensagens em linguagem natural e retornar um JSON estruturado.

Regras absolutas:
1. Retorne APENAS o JSON, sem texto adicional, sem markdown, sem blocos de código.
2. O JSON deve ter exatamente estas chaves: "valor", "categoria", "forma_pagamento", "descricao".
3. "valor" deve ser um número (float), nunca string.
4. Se não conseguir identificar algum campo, use null para strings e 0 para números.

Categorias válidas (use a mais próxima):
Alimentação, Mercado, Transporte, Saúde, Lazer, Moradia, Educação, Vestuário, Beleza, Pets, Assinaturas, Outros

Formas de pagamento válidas:
Débito, Crédito, Pix, Dinheiro, Boleto

Exemplo de entrada: "gastei 45 reais no mercado no cartão de crédito"
Exemplo de saída: {"valor":45.00,"categoria":"Mercado","forma_pagamento":"Crédito","descricao":"Compras no mercado"}`;

export async function parseExpenseFromMessage(message: string): Promise<ParsedExpense | null> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(message);
  const rawText = result.response.text().trim();

  const parsed: ParsedExpense = JSON.parse(rawText);

  if (!parsed.valor || parsed.valor === 0) return null;

  return parsed;
}
