'use server';

import { revalidatePath } from 'next/cache';
import { updateGoal } from '@/lib/goals';

export async function updateGoalAction(formData: FormData): Promise<void> {
  const responsavel = String(formData.get('responsavel') ?? '').trim();
  const categoria = String(formData.get('categoria') ?? '').trim();
  if (!responsavel || !categoria) return;

  const raw = String(formData.get('valorMeta') ?? '0').replace(',', '.');
  const valorMeta = Math.max(0, parseFloat(raw) || 0);

  await updateGoal(responsavel, categoria, valorMeta);
  revalidatePath('/metas');
  revalidatePath('/');
}
