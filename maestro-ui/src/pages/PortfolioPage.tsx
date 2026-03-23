import React from 'react';
import { Briefcase, CircleDollarSign, Percent } from 'lucide-react';

const PortfolioPage: React.FC = () => {
  const segments = [
    { nom: 'Immobilier', exposition: '18.2 M€', part: '46%', risque: 'Faible' },
    { nom: 'Consommation', exposition: '11.5 M€', part: '29%', risque: 'Moyen' },
    { nom: 'Professionnel', exposition: '6.8 M€', part: '17%', risque: 'Moyen' },
    { nom: 'Automobile', exposition: '3.1 M€', part: '8%', risque: 'Faible' },
  ];

  return (
    <div className="detail-page">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mon portefeuille</h1>
        <p className="text-slate-600">Exposition, rendement et risque du portefeuille crédit (données factices)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center"><Briefcase size={18} /></div>
          <div><p className="text-sm text-slate-500">Encours total</p><p className="text-2xl font-bold text-slate-900">39.6 M€</p></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Percent size={18} /></div>
          <div><p className="text-sm text-slate-500">Taux défaut 90j</p><p className="text-2xl font-bold text-slate-900">1.42%</p></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center"><CircleDollarSign size={18} /></div>
          <div><p className="text-sm text-slate-500">Marge nette</p><p className="text-2xl font-bold text-slate-900">2.18%</p></div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="font-bold text-slate-900 mb-4">Répartition des encours</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="text-left border-b border-slate-200">
                <th className="py-3 px-3 text-xs uppercase text-slate-500">Segment</th>
                <th className="py-3 px-3 text-xs uppercase text-slate-500">Exposition</th>
                <th className="py-3 px-3 text-xs uppercase text-slate-500">Part</th>
                <th className="py-3 px-3 text-xs uppercase text-slate-500">Risque</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((s) => (
                <tr key={s.nom} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-4 px-3 font-semibold text-slate-900">{s.nom}</td>
                  <td className="py-4 px-3 text-slate-700">{s.exposition}</td>
                  <td className="py-4 px-3 text-slate-700">{s.part}</td>
                  <td className="py-4 px-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${s.risque === 'Faible' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {s.risque}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="font-bold text-slate-900 mb-4">Stress test portefeuille</h3>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"><span>Hausse taux +100 bps</span><span className="font-semibold text-amber-700">Impact: +0.21% défaut</span></div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"><span>Baisse revenus -5%</span><span className="font-semibold text-amber-700">Impact: +0.34% défaut</span></div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"><span>Scénario optimiste</span><span className="font-semibold text-emerald-700">Impact: -0.18% défaut</span></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="font-bold text-slate-900 mb-4">Objectifs trimestriels</h3>
          <div className="space-y-4">
            {[
              { label: 'Réduction défaut 90j', value: 68 },
              { label: 'Croissance encours', value: 74 },
              { label: 'Optimisation marge', value: 57 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1 text-slate-600"><span>{item.label}</span><span className="font-semibold text-slate-900">{item.value}%</span></div>
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
