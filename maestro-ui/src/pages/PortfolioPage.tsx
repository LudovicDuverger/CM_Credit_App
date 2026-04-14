import React from 'react';
import { useTranslation } from 'react-i18next';
import { Briefcase, CircleDollarSign, Percent } from 'lucide-react';

const PortfolioPage: React.FC = () => {
  const { t } = useTranslation();

  const segments = [
    { nameKey: 'portfolio.segmentMortgage', exposition: '18.2 M€', part: '46%', riskKey: 'portfolio.riskLow' },
    { nameKey: 'portfolio.segmentConsumer', exposition: '11.5 M€', part: '29%', riskKey: 'portfolio.riskMedium' },
    { nameKey: 'portfolio.segmentPro', exposition: '6.8 M€', part: '17%', riskKey: 'portfolio.riskMedium' },
    { nameKey: 'portfolio.segmentAuto', exposition: '3.1 M€', part: '8%', riskKey: 'portfolio.riskLow' },
  ];

  const quarterlyGoals = [
    { labelKey: 'portfolio.goalDefaultReduction', value: 68 },
    { labelKey: 'portfolio.goalOutstandingGrowth', value: 74 },
    { labelKey: 'portfolio.goalMarginOptimization', value: 57 },
  ];

  const stressTests = [
    { labelKey: 'portfolio.stressRateHike', impactKey: 'portfolio.stressRateHikeImpact', positive: false },
    { labelKey: 'portfolio.stressIncomeDrop', impactKey: 'portfolio.stressIncomeDropImpact', positive: false },
    { labelKey: 'portfolio.stressOptimistic', impactKey: 'portfolio.stressOptimisticImpact', positive: true },
  ];

  return (
    <div className="detail-page">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('portfolio.title')}</h1>
        <p className="text-slate-600">{t('portfolio.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center"><Briefcase size={18} /></div>
          <div><p className="text-sm text-slate-500">{t('portfolio.totalOutstanding')}</p><p className="text-2xl font-bold text-slate-900">39.6 M€</p></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Percent size={18} /></div>
          <div><p className="text-sm text-slate-500">{t('portfolio.defaultRate')}</p><p className="text-2xl font-bold text-slate-900">1.42%</p></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center"><CircleDollarSign size={18} /></div>
          <div><p className="text-sm text-slate-500">{t('portfolio.netMargin')}</p><p className="text-2xl font-bold text-slate-900">2.18%</p></div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="font-bold text-slate-900 mb-4">{t('portfolio.outstandingDistribution')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="text-left border-b border-slate-200">
                <th className="py-3 px-3 text-xs uppercase text-slate-500">{t('portfolio.colSegment')}</th>
                <th className="py-3 px-3 text-xs uppercase text-slate-500">{t('portfolio.colExposition')}</th>
                <th className="py-3 px-3 text-xs uppercase text-slate-500">{t('portfolio.colShare')}</th>
                <th className="py-3 px-3 text-xs uppercase text-slate-500">{t('portfolio.colRisk')}</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((s) => {
                const riskLabel = t(s.riskKey);
                const isLow = s.riskKey === 'portfolio.riskLow';
                return (
                  <tr key={s.nameKey} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 px-3 font-semibold text-slate-900">{t(s.nameKey)}</td>
                    <td className="py-4 px-3 text-slate-700">{s.exposition}</td>
                    <td className="py-4 px-3 text-slate-700">{s.part}</td>
                    <td className="py-4 px-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold ${isLow ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {riskLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="font-bold text-slate-900 mb-4">{t('portfolio.stressTest')}</h3>
          <div className="space-y-3 text-sm text-slate-700">
            {stressTests.map((item) => (
              <div key={item.labelKey} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span>{t(item.labelKey)}</span>
                <span className={`font-semibold ${item.positive ? 'text-emerald-700' : 'text-amber-700'}`}>{t(item.impactKey)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="font-bold text-slate-900 mb-4">{t('portfolio.quarterlyGoals')}</h3>
          <div className="space-y-4">
            {quarterlyGoals.map((item) => (
              <div key={item.labelKey}>
                <div className="flex justify-between text-sm mb-1 text-slate-600"><span>{t(item.labelKey)}</span><span className="font-semibold text-slate-900">{item.value}%</span></div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[#102330] rounded-full" style={{ width: `${item.value}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioPage;
