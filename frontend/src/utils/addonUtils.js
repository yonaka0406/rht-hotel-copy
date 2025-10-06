export function translateAddonType(addonType) {
    switch (addonType) {
        case 'breakfast': return '朝食';
        case 'lunch': return '昼食';
        case 'dinner': return '夕食';
        case 'parking': return '駐車場';
        case 'other': return 'その他';
        default: return addonType;
    }
}
