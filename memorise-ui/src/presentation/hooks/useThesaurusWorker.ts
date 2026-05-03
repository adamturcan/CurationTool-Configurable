import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { ThesaurusIndexItem } from '../../types';
import { logAppError } from '../../shared/errors';

/** Outgoing message from main thread to the thesaurus worker. */
type WorkerRequest = {
  type: 'SEARCH';
  requestId: number;
  query: string;
  limit: number;
};

/** Incoming message from the thesaurus worker. */
type WorkerResponse =
  | { type: 'READY' }
  | { type: 'ERROR'; error: string }
  | { type: 'RESULTS'; requestId: number; results: ThesaurusIndexItem[] };

/**
 * Wraps the thesaurus Web Worker. Owns its lifetime and exposes a `search` function with `ready` and `error` flags.
 * Each search times out after 5 seconds. Concurrent searches are matched by a per-request id so a fast second
 * search cannot resolve the first call's promise with its own results.
 */
export function useThesaurusWorker() {
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL('../../workers/thesaurusWorker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.type === 'READY') {
        setReady(true);
      } else if (e.data.type === 'ERROR') {
        setError(e.data.error);
        logAppError(new Error(e.data.error), { source: 'thesaurusWorker' });
      }
    };

    worker.onerror = (err) => {
      setError(err.message);
      logAppError(err, { source: 'thesaurusWorker' });
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const search = useCallback(
    (query: string, limit = 20): Promise<ThesaurusIndexItem[]> => {
      return new Promise((resolve) => {
        const worker = workerRef.current;
        if (!worker || !ready || error) {
          resolve([]);
          return;
        }

        const requestId = ++requestIdRef.current;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const handler = (e: MessageEvent<WorkerResponse>) => {
          if (e.data.type !== 'RESULTS' || e.data.requestId !== requestId) return;
          worker.removeEventListener('message', handler);
          if (timeoutId !== null) clearTimeout(timeoutId);
          resolve(e.data.results || []);
        };

        worker.addEventListener('message', handler);

        const request: WorkerRequest = { type: 'SEARCH', requestId, query, limit };
        worker.postMessage(request);

        timeoutId = setTimeout(() => {
          worker.removeEventListener('message', handler);
          resolve([]);
        }, 5000);
      });
    },
    [ready, error]
  );

  return useMemo(() => ({
    search,
    ready,
    error,
  }), [search, ready, error]);
}
