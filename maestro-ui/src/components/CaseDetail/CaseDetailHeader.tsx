import React from 'react';
import { ArrowLeft, ExternalLink, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CaseDetail } from '../../services/cases';

interface Props {
  detail: CaseDetail;
}

const CaseDetailHeader: React.FC<Props> = ({ detail }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const adminUrl = String(detail?.adminUrl || '').trim();

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/submissions')}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 text-slate-700 hover:bg-slate-50"
          style={{ paddingLeft: '16px', paddingRight: '16px' }}
        >
          <ArrowLeft size={16} />
          {t('caseDetail.backToList')}
        </button>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          {t('caseDetail.caseDetailTitle')} {detail.caseId || detail.id}
          <button
            type="button"
            title={t('caseDetail.openAdminTitle')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400 bg-amber-50 py-1.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ paddingLeft: '16px', paddingRight: '16px' }}
            disabled={!adminUrl}
            onClick={() => {
              if (!adminUrl) return;
              window.open(adminUrl, 'admin_popup', 'width=1200,height=900,noopener');
            }}
          >
            <Shield size={14} />
            {t('caseDetail.adminLink')}
            <ExternalLink size={14} />
          </button>
        </h1>
      </div>
    </div>
  );
};

export default CaseDetailHeader;
