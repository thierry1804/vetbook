import polyglotI18nProvider from 'ra-i18n-polyglot';
import french from 'ra-language-french';

export const i18nProvider = polyglotI18nProvider(() => french, 'fr', { allowMissing: true });
