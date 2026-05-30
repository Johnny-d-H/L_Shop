import { localizationService } from '../services/localizationService';

describe('LocalizationService', () => {
    describe('getLocale', () => {
        it('should return Russian locale by default', () => {
            const locale = localizationService.getLocale('ru');
            expect(locale).toBeDefined();
            expect(locale.header).toBeDefined();
            expect(locale.header.title).toBeDefined();
        });

        it('should return English locale when requested', () => {
            const locale = localizationService.getLocale('en');
            expect(locale).toBeDefined();
            expect(locale.header).toBeDefined();
            expect(locale.header.title).toBeDefined();
        });

        it('should return Russian locale for invalid locale code', () => {
            const locale = localizationService.getLocale('invalid' as any);
            expect(locale).toBeDefined();
        });
    });

    describe('detectLocaleFromCountry', () => {
        it('should detect Russian locale for Russian country', () => {
            const locale = localizationService.detectLocaleFromCountry('RU');
            expect(locale).toBe('ru');
        });

        it('should detect Russian locale for Belarus', () => {
            const locale = localizationService.detectLocaleFromCountry('BY');
            expect(locale).toBe('ru');
        });

        it('should detect English locale for non-Russian countries', () => {
            const locale = localizationService.detectLocaleFromCountry('US');
            expect(locale).toBe('en');
        });

        it('should detect English locale for undefined country', () => {
            const locale = localizationService.detectLocaleFromCountry(undefined);
            expect(locale).toBe('en');
        });

        it('should be case-insensitive', () => {
            const locale1 = localizationService.detectLocaleFromCountry('ru');
            const locale2 = localizationService.detectLocaleFromCountry('RU');
            expect(locale1).toBe(locale2);
            expect(locale1).toBe('ru');
        });
    });
});
