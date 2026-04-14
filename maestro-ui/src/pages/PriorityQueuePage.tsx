import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Clock3, ShieldCheck, TrendingUp } from 'lucide-react';

const PriorityQueuePage: React.FC = () => {
  const { t } = useTranslation();

  const criticalCases = [
    { id: 'PRIO-2041', client: 'Mme L. Bernard', produit: 'Crédit Immo', montant: '310 000 €', sla: '3h', motif: 'Signature notaire aujourd\'hui' },
    { id: 'PRIO-2042', client: 'M. P. Mercier', produit: 'Prêt Pro', montant: '95 000 €', sla: '5h', motif: 'Décaissement urgent fournisseur' },
    { id: 'PRIO-2048', client: 'Mme S. Renaud', produit: 'Crédit Travaux', montant: '42 500 €', sla: '8h', motif: 'Document conformité manquant' },
    { id: 'PRIO-2051', client: 'M. A. Duval', produit: 'Prêt Auto', montant: '27 900 €', sla: '11h', motif: 'Offre à échéance ce soir' },
  ];

  const processingCapacity = [
    { team: 'Équipe A', value: 86 },
    { team: 'Équipe B', value: 74 },
    { team: 'Équipe C', value: 61 },
  ];

  return (
    <div className="detail-page">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('priorityQueue.title')}</h1>
        <p className="text-slate-600">{t('priorityQueue.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0"><AlertTriangle size={18} /></div>
            <div>
              <p className="text-sm text-slate-500">{t('priorityQueue.criticalCases')}</p>
              <p className="text-2xl font-bold text-slate-900">{criticalCases.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0"><Clock3 size={18} /></div>
            <div>
              <p className="text-sm text-slate-500">{t('priorityQueue.averageSla')}</p>
              <p className="text-2xl font-bold text-slate-900">6h 45</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0"><ShieldCheck size={18} /></div>
            <div>
              <p className="text-sm text-slate-500">{t('priorityQueue.priorityConformity')}</p>
              <p className="text-2xl font-bold text-slate-900">94%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900">{t('priorityQueue.immediateEscalation')}</h2>
          <span className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600 flex items-center"><TrendingUp size={13} /> {t('priorityQueue.realTime')}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead>
              <tr className="text-left border-b border-slate-200">
                <th className="py-3 px-3 text-xs uppercase tracking-wider text-slate-500">{t('priorityQueue.colId')}</th>
                <th className="py-3 px-3 text-xs uppercase tracking-wider text-slate-500">{t('priorityQueue.colClient')}</th>
                <th className="py-3 px-3 text-xs uppercase tracking-wider text-slate-500">{t('priorityQueue.colProduct')}</th>
                <th className="py-3 px-3 text-xs uppercase tracking-wider text-slate-500">{t('priorityQueue.colAmount')}</th>
                <th className="py-3 px-3 text-xs uppercase tracking-wider text-slate-500">{t('priorityQueue.colSla')}</th>
                <th className="py-3 px-3 text-xs uppercase tracking-wider text-slate-500">{t('priorityQueue.colReason')}</th>
              </tr>
            </thead>
            <tbody>
              {criticalCases.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-4 px-3 font-semibold text-[#102330]">{item.id}</td>
                  <td className="py-4 px-3 text-slate-700">{item.client}</td>
                  <td className="py-4 px-3 text-slate-700">{item.produit}</td>
                  <td className="py-4 px-3 font-semibold text-slate-900">{item.montant}</td>
                  <td className="py-4 px-3"><span className="px-2 py-1 rounded-md text-xs bg-amber-100 text-amber-700 font-semibold">{item.sla}</span></td>
                  <td className="py-4 px-3 text-slate-600">{item.motif}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="font-bold text-slate-900 mb-4">{t('priorityQueue.processingCapacity')}</h3>
          <div className="space-y-4">
            {processingCapacity.map((row) => (
              <div key={row.team}>
                <div className="flex justify-between text-sm mb-1 text-slate-600"><span>{row.team}</span><span className="font-semibold text-slate-900">{row.value}%</span></div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-[#ff4d14] rounded-full" style={{ width: `${row.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="font-bold text-slate-900 mb-4">{t('priorityQueue.recommendedActions')}</h3>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">{t('priorityQueue.action1')}</div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">{t('priorityQueue.action2')}</div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">{t('priorityQueue.action3')}</div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">{t('priorityQueue.action4')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriorityQueuePage;
