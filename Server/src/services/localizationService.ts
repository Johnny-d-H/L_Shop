import fs from 'fs';
import path from 'path';

type Locale = 'ru' | 'en';

interface LocaleData {
    [key: string]: any;
}

class LocalizationService {
    private locales: Map<Locale, LocaleData> = new Map();
    private localeDir: string;

    constructor() {
        this.localeDir = path.join(__dirname, '..', 'locales');
        this.loadLocales();
    }

    private loadLocales() {
        const localeFiles: Locale[] = ['ru', 'en'];
        for (const locale of localeFiles) {
            const filePath = path.join(this.localeDir, `${locale}.json`);
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                this.locales.set(locale, JSON.parse(content));
            } catch (err) {
                console.error(`Failed to load locale ${locale}:`, err);
            }
        }
    }

    getLocale(locale: Locale = 'ru'): LocaleData {
        return this.locales.get(locale) || this.locales.get('ru') || {};
    }

    detectLocaleFromCountry(country?: string): Locale {
        const ruCountries = ['RU', 'BY', 'KZ', 'UA', 'MD'];
        if (country && ruCountries.includes(country.toUpperCase())) {
            return 'ru';
        }
        return 'en';
    }
}

export const localizationService = new LocalizationService();
export type { Locale, LocaleData };
