import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CaseDetail } from '../../services/cases';
import { badgeClassForStatus, badgeClassForSla, translateStatus, formatDate } from '../../utils/caseFormatters';

interface Props {
  detail: CaseDetail;
}

const CaseGeneralInfo: React.FC<Props> = ({ detail }) => {
  const { t } = useTranslation();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-900 leading-tight">{t('caseDetail.generalInfo')}</h2>
        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${badgeClassForStatus(detail.status)}`}>
          {translateStatus(detail.status)}
        </span>
        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${badgeClassForSla(detail.slaStatus)}`}>
          SLA: {translateStatus(detail.slaStatus || 'N/A')}
        </span>
      </div>
      <div className="compact-info-grid compact-info-content grid grid-cols-1 md:grid-cols-2 text-sm text-slate-700">
        <div><span className="font-semibold">{t('caseDetail.instanceId')}</span> {detail.id}</div>
        <div><span className="font-semibold">{t('caseDetail.caseId')}</span> {detail.caseId || '-'}</div>
        <div><span className="font-semibold">{t('caseDetail.currentStage')}</span> {translateStatus(detail.currentStage || '-')}</div>
        <div><span className="font-semibold">{t('caseDetail.createdAt')}</span> {formatDate(detail.createdTime || detail.startedTime)}</div>
      </div>
    </section>
  );
};

export default CaseGeneralInfo;
