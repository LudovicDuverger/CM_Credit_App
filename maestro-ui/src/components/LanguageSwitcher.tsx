import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const current = i18n.language;

  return (
    <div
      className="flex items-center rounded-lg border border-slate-200 overflow-hidden font-semibold"
      style={{ fontSize: '13px', marginLeft: '8px', marginRight: '8px' }}
    >
      <button
        onClick={() => i18n.changeLanguage('fr')}
        style={{ padding: '8px 16px', transition: 'background 0.15s' }}
        className={`transition-colors ${
          current === 'fr'
            ? 'bg-[#1fa3b3] text-white'
            : 'bg-white text-slate-500 hover:bg-slate-50'
        }`}
      >
        FR
      </button>
      <button
        onClick={() => i18n.changeLanguage('en')}
        style={{ padding: '8px 16px', transition: 'background 0.15s' }}
        className={`transition-colors ${
          current === 'en'
            ? 'bg-[#1fa3b3] text-white'
            : 'bg-white text-slate-500 hover:bg-slate-50'
        }`}
      >
        EN
      </button>
    </div>
  );
};

export default LanguageSwitcher;
