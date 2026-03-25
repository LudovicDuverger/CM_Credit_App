import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CaseDetail } from '../../services/cases';

interface Props {
  detail: CaseDetail;
  prevCaseId?: string;
  nextCaseId?: string;
}

const CaseDetailHeader: React.FC<Props> = ({ detail, prevCaseId, nextCaseId }) => {
  const navigate = useNavigate();
  const adminUrl = String(detail?.adminUrl || '').trim();

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/submissions')}
          className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Retour liste
        </button>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          Détail dossier {detail.caseId || detail.id}
          <button
            type="button"
            title="Ouvrir la fiche Admin UiPath"
            className="ml-2 px-2 py-1 rounded-lg border border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-1 text-xs font-semibold"
            disabled={!adminUrl}
            onClick={() => {
              if (!adminUrl) return;
              window.open(adminUrl, 'admin_popup', 'width=1200,height=900,noopener');
            }}
          >
            <Shield size={14} className="inline" />
            Admin (Accès au back-end UiPath)
          </button>
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => prevCaseId && navigate(`/cases/${prevCaseId}`)}
          disabled={!prevCaseId}
          className="px-8 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          style={{ paddingLeft: '26px', paddingRight: '26px' }}
        >
          Précédent
        </button>
        <button
          onClick={() => nextCaseId && navigate(`/cases/${nextCaseId}`)}
          disabled={!nextCaseId}
          className="px-8 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          style={{ paddingLeft: '26px', paddingRight: '26px' }}
        >
          Suivant
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default CaseDetailHeader;
