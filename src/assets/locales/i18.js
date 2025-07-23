import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import * as Localization from 'react-native-localize';
import {I18nManager} from 'react-native';

import en from './en.json';
import ar from './ar.json';

const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: callback => {
    const locales = Localization.getLocales();
    console.log('locales', locales);
    const languageCode = locales[0]?.languageCode || 'ar';

    if (languageCode === 'ar') {
      console.log('AR AR AR');
      I18nManager.forceRTL(true);
      I18nManager.allowRTL(true);
    } else {
      console.log('EN EN EN');
      I18nManager.forceRTL(false);
      I18nManager.allowRTL(false);
    }

    callback(languageCode);
  },
  init: () => {},
  cacheUserLanguage: () => {},
};

const resources = {
  en: {
    translation: en,
  },
  ar: {
    translation: ar,
  },
};

i18n
  .use(initReactI18next)
  .use(languageDetector)
  .init({
    resources,
    compatibilityJSON: 'v3',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
