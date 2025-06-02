const { processNameStringWithSubstitutions } = require('../../../../api/models/clients');

describe('processNameStringWithSubstitutions', () => {
    it('should return the original name if no substitutions apply', () => {
        expect(processNameStringWithSubstitutions('Test Company', 'テスト会社')).toEqual('Test Company');
    });

    it('should substitute "kabushikigaisha" with "K.K"', () => {
        expect(processNameStringWithSubstitutions('my company kabushikigaisha', 'マイ会社株式会社')).toEqual('My Company K.K');
    });

    it('should apply multiple substitution rules: hokkaidou kensetsu kabushikigaisha', () => {
        expect(processNameStringWithSubstitutions('hokkaidou kensetsu kabushikigaisha', '北海道建設株式会社')).toEqual('Hokkaido Kensetsu K.K');
    });

    it('should be case-insensitive for pattern matching', () => {
        expect(processNameStringWithSubstitutions('MY COMPANY KABUSHIKIGAISHA', 'マイ会社株式会社')).toEqual('My Company K.K');
    });

    it('should not substitute if kanji_match fails, even if pattern matches', () => {
        expect(processNameStringWithSubstitutions('test kabushikigaisha', 'テストカイシャ')).toEqual('Test Kabushikigaisha');
    });

    it('should trim leading/trailing spaces and normalize multiple internal spaces', () => {
        expect(processNameStringWithSubstitutions('  extra   space  kabushikigaisha  ', '株式会社')).toEqual('Extra Space K.K');
    });

    it('should apply INITCAP to words not part of a substitution', () => {
        expect(processNameStringWithSubstitutions('another word', '別の言葉')).toEqual('Another Word');
    });

    it('should preserve "K.K" during INITCAP transformation', () => {
        expect(processNameStringWithSubstitutions('kabushikigaisha test', '株式会社テスト')).toEqual('K.K Test');
    });

    describe('empty string inputs', () => {
        it('should return an empty string if both name and nameKanji are empty', () => {
            expect(processNameStringWithSubstitutions('', '')).toEqual('');
        });

        it('should process name if nameKanji is empty (no substitutions possible)', () => {
            expect(processNameStringWithSubstitutions('test', '')).toEqual('Test');
        });

        it('should return an empty string if name is empty, even with matching nameKanji', () => {
            // If name is empty, substitutions on an empty string won't make sense,
            // and INITCAP on empty string is empty.
            expect(processNameStringWithSubstitutions('', '株式会社')).toEqual('');
        });
    });

    describe('more examples from SQL table', () => {
        it('should correctly process "sapporo kensetsu"', () => {
            expect(processNameStringWithSubstitutions('sapporo kensetsu', '札幌建設')).toEqual('Sapporo Kensetsu');
        });

        it('should correctly process "nihon sangyou"', () => {
            expect(processNameStringWithSubstitutions('nihon sangyou', '日本産業')).toEqual('Nihon Sangyo');
        });

        it('should correctly process "tokyo kensetsu" (Kensetsu should apply)', () => {
            expect(processNameStringWithSubstitutions('tokyo kensetsu', '東京建設')).toEqual('Tokyo Kensetsu');
        });
    });

    describe('substring and specific pattern tests', () => {
        it('should correctly substitute "kougyou" when it is part of the name', () => {
            expect(processNameStringWithSubstitutions('kougyou abc', '工業')).toEqual('Kogyo Abc');
        });

        it('should correctly substitute "denkou" specifically', () => {
            expect(processNameStringWithSubstitutions('my denkou company', '私の電工会社')).toEqual('My Denkou Company');
        });

        // This test considers if "denkou" exists as a pattern and "kougyou" also exists.
        // "denkou" is more specific for "denkougyou" if "denkou" itself is a defined pattern.
        // Based on the provided substitutions list, "denkou" is one, and "kougyou" is another.
        // The function iterates through substitutions in order.
        // If 'denkou' is before 'kougyou' and matches 'denkougyou', 'denkou' replacement happens.
        // If 'kougyou' is before 'denkou', it might replace the 'kougyou' part of 'denkougyou'.
        // Let's assume current order and test "denkougyou" where "denkou" is a pattern.
        it('should handle "denkougyou" correctly if "denkou" is a pattern', () => {
            // If "denkou" is a pattern: "Denkougyou Abc" -> "Denkou Gyou Abc" (if "gyou" becomes a word) or "Denkou Abc" if "gyou" is not capitalized.
            // The provided JS code replaces the matched pattern. "denkougyou" with pattern "denkou" would become " Denkou gyou" then INITCAP "Denkou Gyou"
            expect(processNameStringWithSubstitutions('denkougyou abc', '電工業')).toEqual('Denkougyou Abc');
            // The above expectation is based on "denkougyou" NOT being a pattern itself, but "電工業" suggests "den" + "kougyou" or "denkou" + "gyou".
            // The current list has: { pattern: 'denkou', replacement: ' Denkou ', kanji_match: '電工' }
            // And multiple for kougyou e.g. { pattern: 'kougyou', replacement: ' Kogyo ', kanji_match: '工業' }
            // If nameKanji is "電工業", the "電工" rule will match first if name contains "denkou".
            // If name is "denkougyou", and nameKanji is "電工業", "denkou" rule will match nameKanji.
            // Then `new RegExp('denkou', 'gi')` will match "denkougyou", replacing it with " Denkou ", resulting in " Denkou gyou abc"
            // Then trimming and INITCAP: "Denkou Gyou Abc"
            // This seems more accurate based on the function logic.
            expect(processNameStringWithSubstitutions('denkougyou abc', '電工業')).toEqual('Denkou Gyou Abc');
        });

        it('should handle "kougyou" within a larger word if "kougyou" kanji matches', () => {
            // Example: "shinkougyou" with kanji "新工業"
            // "kougyou" pattern will match "shinkougyou" -> "shin Kogyo "
            // After processing: "Shin Kogyo"
            expect(processNameStringWithSubstitutions('shinkougyou company', '新工業')).toEqual('Shin Kogyo Company');
        });
    });
});
