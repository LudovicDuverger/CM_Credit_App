import React from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTaskData } from '../hooks/useTaskData';
import CompletenessTaskPage from './CompletenessTaskPage';
import InsuranceDelegationPage from './InsuranceDelegationPage';

/**
 * Dispatcher: loads task data, then renders the appropriate page component
 * based on the task type (Completeness vs Insurance Delegation).
 */
const TaskDetailPage: React.FC = () => {
  const taskData = useTaskData();
  const { loading, error, task, taskForm, isCompletenessTask, handleReturnToCase } = taskData;
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="detail-page">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-700 flex items-center gap-3">
          <Loader2 size={18} className="animate-spin" />
          {t('taskDetail.loadingTask')}
        </div>
      </div>
    );
  }

  if (error && !taskForm && !task) {
    return (
      <div className="detail-page">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-700">{error}</div>
        <button
          type="button"
          onClick={handleReturnToCase}
          className="inline-flex min-h-12 min-w-[170px] items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-slate-700 hover:bg-slate-50"
        >
          {t('taskDetail.returnToCase')}
        </button>
      </div>
    );
  }

  return isCompletenessTask
    ? <CompletenessTaskPage {...taskData} />
    : <InsuranceDelegationPage {...taskData} />;
};

export default TaskDetailPage;
