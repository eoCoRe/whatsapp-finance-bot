'use server';

import { revalidatePath } from 'next/cache';
import { upsertIncome, deleteIncome } from '@/lib/income';
import { createFixedExpense, updateFixedExpense, deleteFixedExpense } from '@/lib/fixedExpenses';

function num(formData: FormData, key: string): number {
  const parsed = parseFloat(String(formData.get(key) ?? '0').replace(',', '.'));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

export async function upsertIncomeAction(formData: FormData): Promise<void> {
  const responsavel = str(formData, 'responsavel');
  const descricao = str(formData, 'descricao');
  if (!responsavel || !descricao) return;

  await upsertIncome(responsavel, descricao, num(formData, 'valor'));
  revalidatePath('/orcamento');
}

export async function deleteIncomeAction(formData: FormData): Promise<void> {
  const responsavel = str(formData, 'responsavel');
  const descricao = str(formData, 'descricao');
  if (!responsavel || !descricao) return;

  await deleteIncome(responsavel, descricao);
  revalidatePath('/orcamento');
}

export async function createFixedExpenseAction(formData: FormData): Promise<void> {
  const descricao = str(formData, 'descricao');
  if (!descricao) return;

  await createFixedExpense({
    descricao,
    categoria: str(formData, 'categoria'),
    valor: num(formData, 'valor'),
    responsavel: str(formData, 'responsavel'),
    diaVencimento: Math.min(31, Math.max(1, num(formData, 'diaVencimento') || 1)),
  });
  revalidatePath('/orcamento');
}

export async function updateFixedExpenseAction(formData: FormData): Promise<void> {
  const id = str(formData, 'id');
  const descricao = str(formData, 'descricao');
  if (!id || !descricao) return;

  await updateFixedExpense(id, {
    descricao,
    categoria: str(formData, 'categoria'),
    valor: num(formData, 'valor'),
    responsavel: str(formData, 'responsavel'),
    diaVencimento: Math.min(31, Math.max(1, num(formData, 'diaVencimento') || 1)),
  });
  revalidatePath('/orcamento');
}

export async function deleteFixedExpenseAction(formData: FormData): Promise<void> {
  const id = str(formData, 'id');
  if (!id) return;

  await deleteFixedExpense(id);
  revalidatePath('/orcamento');
}
