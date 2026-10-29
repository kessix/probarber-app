import { useEffect, useState } from 'react';

import { slugError } from '@/lib/slug';
import { supabase } from '@/lib/supabase';

export type Availability = 'idle' | 'checking' | 'free' | 'taken';

/**
 * Confere no banco se o endereço do link está livre, esperando o barbeiro parar de digitar.
 * `current` é o endereço que já é dele (não conta como "em uso").
 */
export function useSlugAvailability(slug: string, current?: string): Availability {
  const [state, setState] = useState<{ slug: string; value: Availability }>({ slug: '', value: 'idle' });

  useEffect(() => {
    if (!slug || slugError(slug) || slug === current) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setState({ slug, value: 'checking' });
      const { data, error } = await supabase.from('barbershops').select('id').eq('slug', slug).maybeSingle();
      if (!cancelled) setState({ slug, value: error ? 'idle' : data ? 'taken' : 'free' });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slug, current]);

  // Resultado de outro texto digitado antes não vale para o atual.
  if (!slug || slugError(slug) || slug === current) return 'idle';
  return state.slug === slug ? state.value : 'checking';
}
