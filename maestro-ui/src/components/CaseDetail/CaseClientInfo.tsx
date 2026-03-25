import React from 'react';
import type { CaseDetail } from '../../services/cases';
import { formatAmount } from '../../utils/caseFormatters';

interface Props {
  client?: CaseDetail['client'];
}

const CaseClientInfo: React.FC<Props> = ({ client }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-6">
    <h3 className="compact-info-title font-semibold text-slate-900">Client</h3>
    <div className="compact-info-grid grid grid-cols-1 md:grid-cols-2 gap-y-3 text-sm text-slate-700">
      <div className="flex flex-col gap-0.5"><span className="font-semibold">Nom:</span><span>{client?.name || '-'}</span></div>
      <div className="flex flex-col gap-0.5"><span className="font-semibold">Date naissance:</span><span>{client?.birthDate || '-'}</span></div>
      <div className="flex flex-col gap-0.5"><span className="font-semibold">Taux endettement:</span><span>{client?.debtRatio || '-'}</span></div>
      <div className="flex flex-col gap-0.5"><span className="font-semibold">Scoring:</span><span>{client?.scoring || '-'}</span></div>
      <div className="flex flex-col gap-0.5"><span className="font-semibold">Revenus:</span><span>{formatAmount(client?.incomes)}</span></div>
      <div className="flex flex-col gap-0.5"><span className="font-semibold">Charges:</span><span>{formatAmount(client?.expenses)}</span></div>
    </div>
  </section>
);

export default CaseClientInfo;
