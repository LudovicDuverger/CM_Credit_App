import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { tasksService, type TaskDetailsResponse, type TaskFormResponse } from '../services/tasks';
import { casesService, type CaseDetail } from '../services/cases';

const COMPLETENESS_TASK_NAME = 'vérification complétude dossier crédit';

export function useTaskData() {
  const { id: caseId, taskId } = useParams<{ id: string; taskId: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<TaskDetailsResponse | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormResponse | null>(null);
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        await tasksService.assignTaskToSelf(taskId);
        const [taskResponse, formResponse] = await Promise.all([
          tasksService.getTask(taskId),
          tasksService.getTaskForm(taskId),
        ]);
        if (cancelled) return;
        setTask(taskResponse);
        setTaskForm(formResponse);
        if (caseId) {
          const detailResponse = await casesService.getCaseById(caseId);
          if (cancelled) return;
          setCaseDetail(detailResponse);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Impossible de charger la tâche');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [taskId, caseId]);

  const normalizedTaskTitle = String(taskForm?.title || task?.Title || '').trim().toLowerCase();
  const isCompletenessTask = normalizedTaskTitle === COMPLETENESS_TASK_NAME;
  const businessCaseId = String(caseDetail?.caseId || '').trim();

  const handleReturnToCase = () => navigate(caseId ? `/cases/${caseId}` : '/cases');

  const handleComplete = async (action = 'Submit') => {
    if (!taskId) return;
    setSubmitting(true);
    setError(null);
    const payload = { action, data: taskForm?.data || {} };
    try {
      await tasksService.completeTask(taskId, payload);
      handleReturnToCase();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de compléter la tâche');
      setSubmitting(false);
    }
  };

  return {
    caseId,
    taskId,
    task,
    taskForm,
    caseDetail,
    setCaseDetail,
    loading,
    submitting,
    error,
    setError,
    isCompletenessTask,
    businessCaseId,
    handleReturnToCase,
    handleComplete,
  };
}

export type TaskDataProps = ReturnType<typeof useTaskData>;
