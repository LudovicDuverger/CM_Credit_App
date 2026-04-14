import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CaseDetail } from '../../services/cases';
import { formatAmount } from '../../utils/caseFormatters';

interface Props {
  credit?: CaseDetail['credit'];
}

const CaseCreditInfo: React.FC<Props> = ({ credit }) => {
  const { t } = useTranslation();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="compact-info-title font-semibold text-slate-900">{t('caseDetail.credit')}</h3>
      <div className="compact-info-grid grid grid-cols-1 md:grid-cols-2 gap-y-3 text-sm text-slate-700">
        <div><span className="font-semibold">{t('caseDetail.type')}</span> {credit?.creditType || '-'}</div>
        <div><span className="font-semibold">{t('caseDetail.amount')}</span> {formatAmount(credit?.requestedAmount)}</div>
        <div><span className="font-semibold">{t('caseDetail.duration')}</span> {credit?.duration || '-'} {t('caseDetail.durationSuffix')}</div>
        <div><span className="font-semibold">{t('caseDetail.decision')}</span> {credit?.finalDecision || '-'}</div>
        <div><span className="font-semibold">{t('caseDetail.disbursement')}</span> {credit?.paymentDate || '-'}</div>
      </div>
    </section>
  );
};

export default CaseCreditInfo;
