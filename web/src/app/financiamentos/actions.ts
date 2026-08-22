'use server';

import { revalidatePath } from 'next/cache';
import { createFinancing, deleteFinancing, FinancingType, registerPayment, updateFinancing } from '@/lib/financing';

function tipoFrom(formData: FormData): FinancingType {
  return formData.get('tipo') === 'Parcelamento' ? 'Parcelamento' : 'Financiamento';
}

function num(formData: FormData, key: string): number {
  const raw = formData.get(key);
  const parsed = parseFloat(String(raw ?? '0').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

export async function createFinancingAction(formData: FormData): Promise<void> {
  const descricao = str(formData, 'descricao');
  if (!descricao) return;

  await createFinancing({
    descricao,
    tipo: tipoFrom(formData),
    responsavel: str(formData, 'responsavel'),
    valorParcela: num(formData, 'valorParcela'),
    parcelasPagas: num(formData, 'parcelasPagas'),
    parcelasTotais: num(formData, 'parcelasTotais'),
  });

  revalidatePath('/financiamentos');
}

export async function updateFinancingAction(formData: FormData): Promise<void> {
  const id = str(formData, 'id');
  const descricao = str(formData, 'descricao');
  if (!id || !descricao) return;

  await updateFinancing(id, {
    descricao,
    tipo: tipoFrom(formData),
    responsavel: str(formData, 'responsavel'),
    valorParcela: num(formData, 'valorParcela'),
    parcelasPagas: num(formData, 'parcelasPagas'),
    parcelasTotais: num(formData, 'parcelasTotais'),
  });

  revalidatePath('/financiamentos');
}

export async function registerPaymentAction(formData: FormData): Promise<void> {
  const id = str(formData, 'id');
  if (!id) return;

  await registerPayment(id, 1);
  revalidatePath('/financiamentos');
}

export async function deleteFinancingAction(formData: FormData): Promise<void> {
  const id = str(formData, 'id');
  if (!id) return;

  await deleteFinancing(id);
  revalidatePath('/financiamentos');
}
