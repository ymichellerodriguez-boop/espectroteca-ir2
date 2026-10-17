import { useEffect, useState } from 'react';

export interface AsyncState<T> {
  data?: T;
  error?: string;
  loading: boolean;
}

/** Ejecuta una promesa y expone su estado; los errores se muestran, no cierran la aplicación. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [s, setS] = useState<AsyncState<T>>({ loading: true });
  useEffect(() => {
    let alive = true;
    setS({ loading: true });
    fn()
      .then((data) => alive && setS({ data, loading: false }))
      .catch((e: Error) => alive && setS({ error: e.message, loading: false }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return s;
}
