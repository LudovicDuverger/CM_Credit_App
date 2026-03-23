import React from 'react';
import { BarChart3, Download, FileText } from 'lucide-react';

const ReportsPage: React.FC = () => {
  const reports = [
    { titre: 'Performance Crédit Mensuelle', periode: 'Fév 2026', format: 'PDF', maj: '20/03/2026 08:15', statut: 'Disponible' },
    { titre: 'Risque par Segment', periode: 'T1 2026', format: 'XLSX', maj: '19/03/2026 18:42', statut: 'Disponible' },
    { titre: 'SLA Traitement Dossiers', periode: 'S11', format: 'PDF', maj: '19/03/2026 07:50', statut: 'Disponible' },
    { titre: 'Conformité KYC / KYB', periode: 'Mars 2026', format: 'PDF', maj: '18/03/2026 21:03', statut: 'En préparation' },
  ];

  return (
    <div className="detail-page">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Rapports</h1>
        <p className="text-slate-600">Bibliothèque de reporting crédit (données factices)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm text-slate-500">Rapports publiés (30j)</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">27</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm text-slate-500">Exports téléchargés</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">143</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm text-slate-500">Temps moyen génération</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">42s</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900">Derniers rapports générés</h2>
          <div className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600 flex items-center"><BarChart3 size={13} /> Actualisé</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead>
              <tr className="text-left border-b border-slate-200">
                <th className="py-3 px-3 text-xs uppercase tracking-wider text-slate-500">Rapport</th>
                <th className="py-3 px-3 text-xs uppercase tracking-wider text-slate-500">Période</th>
                <th className="py-3 px-3 text-xs uppercase tracking-wider text-slate-500">Format</th>
                <th className="py-3 px-3 text-xs uppercase tracking-wider text-slate-500">Dernière MAJ</th>
                <th className="py-3 px-3 text-xs uppercase tracking-wider text-slate-500">Statut</th>
                <th className="py-3 px-3 text-xs uppercase tracking-wider text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.titre} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-4 px-3 font-semibold text-slate-900 flex items-center"><FileText size={15} className="text-slate-500" /> {r.titre}</td>
                  <td className="py-4 px-3 text-slate-700">{r.periode}</td>
                  <td className="py-4 px-3 text-slate-700">{r.format}</td>
                  <td className="py-4 px-3 text-slate-600">{r.maj}</td>
                  <td className="py-4 px-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${r.statut === 'Disponible' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {r.statut}
                    </span>
                  </td>
                  <td className="py-4 px-3"><button className="text-cyan-600 hover:text-cyan-500 font-semibold text-sm inline-flex items-center"><Download size={14} /> Export</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 pt-10 mt-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 min-h-[320px]">
          <h3 className="font-bold text-slate-900 mb-4">Cadence de publication</h3>
          <div className="space-y-4">
            {[
              { label: 'Risque', value: 82 },
              { label: 'Performance commerciale', value: 91 },
              { label: 'Conformité', value: 76 },
              { label: 'SLA opérationnels', value: 88 },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-sm mb-1 text-slate-600"><span>{row.label}</span><span className="font-semibold text-slate-900">{row.value}%</span></div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[#1fa3b3] rounded-full" style={{ width: `${row.value}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 min-h-[320px]">
          <h3 className="font-bold text-slate-900 mb-4">Plan de diffusion</h3>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">09:00 — Rapport KPI quotidien envoyé direction réseau</div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">11:30 — Export segment risque transmis cellule conformité</div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">15:00 — Synthèse hebdo distribuée aux conseillers</div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">18:00 — Archivage automatique dans SharePoint crédit</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
