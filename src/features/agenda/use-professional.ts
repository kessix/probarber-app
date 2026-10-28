import { useCallback } from 'react';

import { supabase } from '@/lib/supabase';
import { useRemote } from '@/lib/use-remote';

export type Professional = { id: string; slotIntervalMinutes: number };

/** O profissional do dono da barbearia. Equipe com vários profissionais entra numa próxima etapa. */
export function useProfessional(shopId: string) {
  const load = useCallback(async (): Promise<Professional> => {
    const { data, error } = await supabase
      .from('professionals')
      .select('id, slot_interval_minutes')
      .eq('barbershop_id', shopId)
      .eq('is_owner', true)
      .single();
    if (error) throw error;
    return { id: data.id, slotIntervalMinutes: data.slot_interval_minutes };
  }, [shopId]);
  return useRemote(load);
}
