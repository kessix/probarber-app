import { useCallback, useEffect, useState } from 'react';

/**
 * Carrega dados do servidor ao abrir a tela. `load` precisa ser estável (useCallback),
 * senão recarrega a cada render. `reload()` busca de novo; `setData` ajusta a tela sem ir ao servidor.
 */
export function useRemote<T>(load: () => Promise<T>) {
  const [state, setState] = useState<{ data: T | null; error: boolean }>({ data: null, error: false });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    load()
      .then((data) => active && setState({ data, error: false }))
      .catch(() => active && setState({ data: null, error: true }));
    return () => {
      active = false;
    };
  }, [load, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData = useCallback((data: T) => setState({ data, error: false }), []);

  return { data: state.data, error: state.error, loading: state.data === null && !state.error, reload, setData };
}
