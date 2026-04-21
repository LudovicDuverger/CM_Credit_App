import React from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Timer, Users } from 'lucide-react';

const AgentsPage: React.FC = () => {
  const { t } = useTranslation();

  const agents = [
    { nom: 'Julien Martin', role: 'Senior', dossiers: 28, delai: '3.8 j', conformite: '98%' },
    { nom: 'Camille Roche', role: 'Analyste', dossiers: 22, delai: '4.1 j', conformite: '96%' },
    { nom: 'Nora Petit', role: 'Analyste', dossiers: 19, delai: '4.7 j', conformite: '94%' },
    { nom: 'Thomas Leroy', role: 'Junior', dossiers: 14, delai: '5.2 j', conformite: '92%' },
  ];

  const skills = [
    { labelKey: 'agents.skillMortgage', value: 88 },
    { labelKey: 'agents.skillConsumer', value: 76 },
    { labelKey: 'agents.skillPro', value: 59 },
    { labelKey: 'agents.skillCompliance', value: 71 },
  ];

  return (
    <div className="detail-page">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('agents.title')}</h1>
        <p className="text-slate-600">{t('agents.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center"><Users size={18} /></div>
          <div><p className="text-sm text-slate-500">{t('agents.activeAdvisors')}</p><p className="text-2xl font-bold text-slate-900">12</p></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center"><Timer size={18} /></div>
          <div><p className="text-sm text-slate-500">{t('agents.averageDelay')}</p><p className="text-2xl font-bold text-slate-900">4.3 j</p></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><BadgeCheck size={18} /></div>
          <div><p className="text-sm text-slate-500">{t('agents.fileQuality')}</p><p className="text-2xl font-bold text-slate-900">95%</p></div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="font-bold text-slate-900 mb-4">{t('agents.workload')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="text-left border-b border-slate-200">
                <th className="py-3 px-3 text-xs uppercase text-slate-500">{t('agents.colName')}</th>
                <th className="py-3 px-3 text-xs uppercase text-slate-500">{t('agents.colLevel')}</th>
                <th className="py-3 px-3 text-xs uppercase text-slate-500">{t('agents.colOpenFiles')}</th>
                <th className="py-3 px-3 text-xs uppercase text-slate-500">{t('agents.colAverageDelay')}</th>
                <th className="py-3 px-3 text-xs uppercase text-slate-500">{t('agents.colConformity')}</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.nom} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-4 px-3 font-semibold text-slate-900">{a.nom}</td>
                  <td className="py-4 px-3 text-slate-700">{a.role}</td>
                  <td className="py-4 px-3 text-slate-700">{a.dossiers}</td>
                  <td className="py-4 px-3 text-slate-700">{a.delai}</td>
                  <td className="py-4 px-3"><span className="px-2 py-1 rounded-md text-xs bg-emerald-100 text-emerald-700 font-semibold">{a.conformite}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="font-bold text-slate-900 mb-4">{t('agents.skillsDistribution')}</h3>
          <div className="space-y-4">
            {skills.map((item) => (
              <div key={item.labelKey}>
                <div className="flex justify-between text-sm mb-1 text-slate-600"><span>{t(item.labelKey)}</span><span className="font-semibold text-slate-900">{item.value}%</span></div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[#1fa3b3] rounded-full" style={{ width: `${item.value}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="font-bold text-slate-900 mb-4">{t('agents.coachingTitle')}</h3>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">Camille Roche: accompagnement &quot;dossiers pro&quot; (vendredi 10h)</div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">Thomas Leroy: revue qualité sur 5 dossiers (mentor: Julien)</div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">Nora Petit: atelier réduction délais (objectif: -0.5 jour)</div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">Point équipe mensuel prévu lundi 9h30</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentsPage;
