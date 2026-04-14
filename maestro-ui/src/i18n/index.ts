import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';
import en from './locales/en.json';

const savedLang = localStorage.getItem('lang') ?? 'fr';

i18n
  .use(initReactI18next)
  .init({
    lng: savedLang,
    fallbackLng: 'fr',
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('lang', lng);
});

export default i18n;
