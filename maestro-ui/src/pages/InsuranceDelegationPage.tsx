import React, { useMemo, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from '../utils/caseFormatters';
import ReadOnlyField from '../components/ReadOnlyField';
import type { TaskDataProps } from '../hooks/useTaskData';

const fieldLabels: Record<string, string> = {
  CustomerOfferCompliant: 'Assurance cliente est valide (Y/N)',
  CommercialOfferMoreAdvantageous: 'Offre UiBank est meilleure (Y/N)',
};

const unlabeledFields = new Set(['RemediationAgentAnalysisResult', 'CommercialArgument']);

const InsuranceDelegationPage: React.FC<TaskDataProps> = ({
  caseId,
  taskId,
  task,
  taskForm,
  submitting,
  error,
  businessCaseId,
  handleReturnToCase,
  handleComplete,
}) => {
  const [comment, setComment] = useState('');

  const inputEntries = useMemo(
    () => Object.entries(taskForm?.data || {}),
    [taskForm],
  );

  return (
    <div className="detail-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{taskForm?.title || task?.Title || `Tâche ${taskId}`}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>Dossier: {businessCaseId || caseId || '-'}</span>
            <span>Créée le {formatDate(task?.CreationTime || taskForm?.creationTime)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReturnToCase}
          className="inline-flex min-h-12 min-w-[170px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Retour au dossier
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          {!inputEntries.length ? (
            <p className="text-sm text-slate-500">Aucune donnée disponible pour cette tâche.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {inputEntries.map(([key, value]) => (
                <ReadOnlyField
                  key={key}
                  label={unlabeledFields.has(key) ? '' : (fieldLabels[key] || key)}
                  value={value}
                />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 h-fit">
          <p className="mt-2 text-sm text-slate-500">
            Les données d&apos;entrée sont affichées en lecture seule. Le commentaire est conservé à l&apos;écran pour la saisie, mais n&apos;est pas encore transmis à UiPath tant qu&apos;une route de commentaire dédiée n&apos;est pas branchée.
          </p>

          <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="task-comment">
            Commentaire
          </label>
          <textarea
            id="task-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={8}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            placeholder="Saisir un commentaire de décision"
          />

          <div className="mt-5 grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={handleReturnToCase}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Mise en attente nouvelle assurance client
            </button>
            <button
              type="button"
              onClick={() => handleComplete('Submit')}
              disabled={submitting}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-teal-700 bg-teal-700 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              Offre UiBank acceptée
            </button>
          </div>

          <div className="mt-4">
            <Link to={caseId ? `/cases/${caseId}` : '/cases'} className="text-sm font-medium text-cyan-700 hover:text-cyan-900">
              Retour au dossier
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default InsuranceDelegationPage;
