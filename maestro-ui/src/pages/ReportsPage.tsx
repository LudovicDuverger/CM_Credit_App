import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, Download, FileText } from 'lucide-react';

const ReportsPage: React.FC = () => {
  const { t } = useTranslation();

  const reports = [
    { titre: 'Performance Crédit Mensuelle', periode: 'Fév 2026', format: 'PDF', maj: '20/03/2026 08:15', statusKey: 'reports.statusAvailable' },
    { titre: 'Risque par Segment', periode: 'T1 2026', format: 'XLSX', maj: '19/03/2026 18:42', statusKey: 'reports.statusAvailable' },
    { titre: 'SLA Traitement Dossiers', periode: 'S11', format: 'PDF', maj: '19/03/2026 07:50', statusKey: 'reports.statusAvailable' },
    { titre: 'Conformité KYC / KYB', periode: 'Mars 2026', format: 'PDF', maj: '18/03/2026 21:03', statusKey: 'reports.statusPreparing' },
  ];

  const cadenceItems = [
    { labelKey: 'reports.cadenceRisk', value: 82 },
    { labelKey: 'reports.cadencePerf', value: 91 },
    { labelKey: 'reports.cadenceConformity', value: 76 },
    { labelKey: 'reports.cadenceSLA', value: 88 },
  ];

  return (
    <div className="detail-page">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('reports.title')}</h1>
        <p className="text-slate-600">{t('reports.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm text-slate-500">{t('reports.published30d')}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">27</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm text-slate-500">{t('reports.downloadsCount')}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">143</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm text-slate-500">{t('reports.avgGenTime')}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">42s</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900">{t('reports.latestReports')}</h2>
          <div className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600 flex items-center"><BarChart3 size={13} /> {t('reports.updated')}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead>
              <tr className="text-left border-b border-slate-200">
                <th className="py-3 px-3 text-xs uppercase tracking-wider text-slate-500">{t('reports.colReport')}</th>
                <th className="py-3 px-3 text-xs uppercase tracking-wider text-slate-500">{t('reports.colPeriod')}</th>
                <th className="py-3 px-3 text-xs uppercase tracking-wider text-slate-500">{t('reports.colFormat')}</th>
                <th className="py-3 px-3 text-xs uppercase tracking-wider text-slate-500">{t('reports.colLastUpdate')}</th>
                <th className="py-3 px-3 text-xs uppercase tracking-wider text-slate-500">{t('reports.colStatus')}</th>
                <th className="py-3 px-3 text-xs uppercase tracking-wider text-slate-500">{t('reports.colAction')}</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
                const isAvailable = r.statusKey === 'reports.statusAvailable';
                return (
                  <tr key={r.titre} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 px-3 font-semibold text-slate-900 flex items-center"><FileText size={15} className="text-slate-500" /> {r.titre}</td>
                    <td className="py-4 px-3 text-slate-700">{r.periode}</td>
                    <td className="py-4 px-3 text-slate-700">{r.format}</td>
                    <td className="py-4 px-3 text-slate-600">{r.maj}</td>
                    <td className="py-4 px-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold ${isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {t(r.statusKey)}
                      </span>
                    </td>
                    <td className="py-4 px-3"><button className="text-cyan-600 hover:text-cyan-500 font-semibold text-sm inline-flex items-center"><Download size={14} /> {t('reports.exportAction')}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 pt-10 mt-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 min-h-[320px]">
          <h3 className="font-bold text-slate-900 mb-4">{t('reports.publicationFrequency')}</h3>
          <div className="space-y-4">
            {cadenceItems.map((row) => (
              <div key={row.labelKey}>
                <div className="flex justify-between text-sm mb-1 text-slate-600"><span>{t(row.labelKey)}</span><span className="font-semibold text-slate-900">{row.value}%</span></div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[#1fa3b3] rounded-full" style={{ width: `${row.value}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 min-h-[320px]">
          <h3 className="font-bold text-slate-900 mb-4">{t('reports.distributionPlan')}</h3>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">{t('reports.diffusion1')}</div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">{t('reports.diffusion2')}</div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">{t('reports.diffusion3')}</div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">{t('reports.diffusion4')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
