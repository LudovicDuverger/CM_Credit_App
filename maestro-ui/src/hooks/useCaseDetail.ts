import { useEffect, useRef, useState } from 'react';
import { casesService, type CaseDetail, type CaseListItem } from '../services/cases';

export function useCaseDetail(id: string | undefined, refreshKey?: number) {
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [allCases, setAllCases] = useState<CaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detailRef = useRef<CaseDetail | null>(null);

  useEffect(() => {
    detailRef.current = detail;
  }, [detail]);

  useEffect(() => {
    if (!id) return;

    let isCancelled = false;

    const load = async () => {
      const currentDetail = detailRef.current;
      const isInitialLoad = !currentDetail || currentDetail.id !== id;
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      try {
        const [detailResponse, listResponse] = await Promise.all([
          casesService.getCaseById(id),
          casesService.getCases(),
        ]);
        if (isCancelled) return;
        setDetail((currentDetail) => {
          if (!currentDetail || currentDetail.id !== id || isInitialLoad) {
            return detailResponse;
          }

          return {
            ...detailResponse,
            status: currentDetail.status,
            currentStage: currentDetail.currentStage,
            createdTime: currentDetail.createdTime,
            startedTime: currentDetail.startedTime,
            slaStatus: currentDetail.slaStatus,
            client: currentDetail.client,
            credit: currentDetail.credit,
          };
        });
        setAllCases(listResponse);
      } catch (err) {
        if (isCancelled) return;
        setError(err instanceof Error ? err.message : 'Erreur de chargement du dossier');
      } finally {
        if (!isCancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    load();
    return () => { isCancelled = true; };
  }, [id, refreshKey]);

  return { detail, allCases, loading, refreshing, error };
}
