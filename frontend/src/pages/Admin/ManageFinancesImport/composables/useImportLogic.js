
import { onMounted } from 'vue';
import { useHotelStore } from '@/composables/useHotelStore';
import { useImportStore } from '@/composables/useImportStore';
import { usePlansStore } from '@/composables/usePlansStore';
import { useToast } from 'primevue/usetoast';

export function useImportLogic() {
    const toast = useToast();
    const { hotels, fetchHotels } = useHotelStore();
    const { forecastAddData, accountingAddData, getPrefilledTemplateData } = useImportStore();
    const { plans, fetchPlansGlobal } = usePlansStore();

    onMounted(async () => {
        await fetchHotels();
        await fetchPlansGlobal();
    });

    const maxFileSize = 5000000; // 5MB
    const budgetItems = ['宿泊売上', '営業日数', '客室数', '販売客室数'];
    const budgetItemKeyMap = {
        '宿泊売上': 'accommodation_revenue',
        '営業日数': 'operating_days',
        '客室数': 'available_room_nights',
        '販売客室数': 'rooms_sold_nights'
    };

    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const generateCSVData = (type, date, prefilledData = null) => {
        const csvRows = [];
        const currentDate = date;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth(); // 0-indexed

        const monthHeaders = [];
        if (type === 'accounting') {
            for (let i = 0; i < 12; i++) {
                const d = new Date(year, month - 12 + i, 1);
                monthHeaders.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
            }
        } else { // 'forecast' or other types
            for (let i = 0; i < 12; i++) {
                const d = new Date(year, month + i, 1);
                monthHeaders.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
            }
        }

        let itemsForProcessing;
        let itemColumnTitle;
        if (type === 'accounting') {
            itemColumnTitle = '会計項目'; // Set column title for accounting
            itemsForProcessing = budgetItems; // Use all budget items for accounting
        } else {
            itemColumnTitle = '予算項目'; // Default column title
            itemsForProcessing = budgetItems; // Use all budget items for other types (e.g., 'forecast')
        }

        csvRows.push(['ID', '施設', 'プランID', 'プラン名', itemColumnTitle, ...monthHeaders].join(','));

        if (!hotels.value || hotels.value.length === 0) {
            console.warn('CSV生成のためのホテルデータが利用できません。');
            return "";
        }
        if (!plans.value || plans.value.length === 0) {
            console.warn('CSV生成のためのプランデータが利用できません。');
            return "";
        }
        // Add a 'No Plan' option to the plans array in the frontend, only if it doesn't already exist
        if (!plans.value.some(plan => plan.id === null)) {
            plans.value.unshift({ id: null, name: 'プランなし' });
        }

        const sortedHotels = [...hotels.value].sort((a, b) => a.id - b.id);
        const sortedPlans = [...plans.value].sort((a, b) => {
            if (a.id === null) return -1; // 'No Plan' comes first
            if (b.id === null) return 1;  // 'No Plan' comes first
            return a.id - b.id;
        });

        sortedHotels.forEach(hotel => {
            sortedPlans.forEach(plan => {
                itemsForProcessing.forEach(item => {
                    const row = [hotel.id, hotel.name, plan.id, plan.name, item];
                    monthHeaders.forEach(header => {
                        const [hYear, hMonth] = header.split('-').map(Number);
                        const prefilledRow = prefilledData ? prefilledData.find(row => {
                            const isMonthMatch = new Date(row.month).getFullYear() === hYear && new Date(row.month).getMonth() + 1 === hMonth;
                            const isHotelMatch = Number(row.hotel_id) === hotel.id;
                            const isPlanMatch = (row.plan_global_id === null && plan.id === null) || (row.plan_global_id === plan.id);

                            return isMonthMatch && isHotelMatch && isPlanMatch;
                        }) : null;

                        if (item === '営業日数') {
                            row.push(prefilledRow ? prefilledRow.operating_days : getDaysInMonth(hYear, hMonth - 1));
                        } else if (item === '客室数') {
                            const daysInCurrentMonth = getDaysInMonth(hYear, hMonth - 1);
                            const totalRoomsForMonth = (hotel.total_rooms && typeof hotel.total_rooms === 'number')
                                ? hotel.total_rooms * daysInCurrentMonth
                                : 0;
                            row.push(prefilledRow ? prefilledRow.available_room_nights : totalRoomsForMonth);
                        } else if (item === '宿泊売上') {
                            const valueToPush = prefilledRow ? prefilledRow.accommodation_revenue : '';
                            row.push(valueToPush);
                        } else if (item === '販売客室数') {
                            const valueToPush = prefilledRow ? prefilledRow.rooms_sold_nights : '';
                            row.push(valueToPush);
                        } else {
                            row.push('');
                        }
                    });
                    csvRows.push(row.join(','));
                });
            });
        });

        return csvRows.join('\n');
    };

    const downloadTemplate = async (type, date) => {
        if (!date) {
            toast.add({ severity: 'warn', summary: '注意', detail: '日付を選択してください。', life: 3000 });
            return;
        }
        if (!hotels.value || hotels.value.length === 0 || !plans.value || plans.value.length === 0) {
            try {
                await fetchHotels();
                await fetchPlansGlobal();
                if (!hotels.value || hotels.value.length === 0) {
                    toast.add({ severity: 'warn', summary: '注意', detail: 'ホテルデータが利用できません。テンプレートを生成できません。', life: 3000 });
                    return;
                }
                if (!plans.value || plans.value.length === 0) {
                    toast.add({ severity: 'warn', summary: '注意', detail: 'プランデータが利用できません。テンプレートを生成できません。', life: 3000 });
                    return;
                }
            } catch (error) {
                console.error("Error fetching hotels or plans for template:", error);
                toast.add({ severity: 'error', summary: 'エラー', detail: 'ホテルまたはプランデータの取得に失敗しました。', life: 3000 });
                return;
            }
        }
        const csvContent = generateCSVData(type, date);
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${type}_template_${new Date().toISOString().slice(0,10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.add({ severity: 'success', summary: '成功', detail: `${type === 'forecast' ? '予算' : '実績'}テンプレートがダウンロードされました。`, life: 3000 });
        } else {
            toast.add({ severity: 'error', summary: 'エラー', detail: 'お使いのブラウザはダウンロードに対応していません。', life: 3000 });
        }
    };

    const downloadPrefilledTemplate = async (type, date) => {
        if (!date) {
            toast.add({ severity: 'warn', summary: '注意', detail: '日付を選択してください。', life: 3000 });
            return;
        }

        let month1 = new Date(date);
        let month2 = new Date(date);

        if (type === 'forecast') {
            month2.setMonth(month1.getMonth() + 12);
        } else {
            // For accounting, we want past 12 months ending with the selected month
            // If user selects Dec 2025, we want data from Dec 2024 to Dec 2025
            const selectedMonth = month2.getMonth();
            const selectedYear = month2.getFullYear();
            
            // Set month1 to 12 months before the selected month (same month, previous year)
            month1 = new Date(selectedYear - 1, selectedMonth, 1);
            // Set month2 to the month after selected month (for exclusive upper bound)
            month2 = new Date(selectedYear, selectedMonth + 1, 1);
        }

        try {
            const prefilledCsv = await getPrefilledTemplateData(type, month1, month2);
            const prefilledData = parseCSVtoJSON(prefilledCsv);

            const csvContent = generateCSVData(type, date, prefilledData);
            const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `${type}_prefilled_template_${new Date().toISOString().slice(0,10)}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                toast.add({ severity: 'success', summary: '成功', detail: `${type === 'forecast' ? '予算' : '実績'}テンプレートがダウンロードされました。`, life: 3000 });
            } else {
                toast.add({ severity: 'error', summary: 'エラー', detail: 'お使いのブラウザはダウンロードに対応していません。', life: 3000 });
            }
        } catch (error) {
            console.error(`Error downloading prefilled ${type} template:`, error);
            toast.add({ severity: 'error', summary: 'エラー', detail: 'テンプレートのダウンロードに失敗しました。', life: 3000 });
        }
    };

    const parseCSVtoJSON = (csvText) => {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            throw new Error("CSVデータが短すぎるか、無効です。");
        }

        const headerLine = lines[0].trim();
        const parseCsvRow = (rowString) => {
            const result = [];
            let currentField = '';
            let inQuotes = false;
            for (let i = 0; i < rowString.length; i++) {
                const char = rowString[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(currentField.trim());
                    currentField = '';
                } else {
                    currentField += char;
                }
            }
            result.push(currentField.trim());
            return result;
        };

        const headers = parseCsvRow(headerLine);
        const monthDateHeaders = headers.slice(5);
        const hotelMonthDataMap = {};

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = parseCsvRow(line);
            if (parts.length !== headers.length) {
                console.warn(`不正な形式の行をスキップします: ${line}. ${headers.length}列必要ですが、${parts.length}列でした。`);
                continue;
            }

            const hotelId = parts[0];
            const hotelName = parts[1].replace(/^"|"$/g, '');
            const planGlobalId = parts[2];
            const planName = parts[3];
            const budgetItemFromCsv = parts[4];

            monthDateHeaders.forEach((monthString, monthIndex) => {
                const valueString = parts[monthIndex + 5];
                const value = valueString && valueString.trim() !== '' ? parseFloat(valueString) : 0;
                const parsedPlanGlobalId = planGlobalId && planGlobalId.trim() !== '' ? parseInt(planGlobalId, 10) : null;
                const mapKey = `${hotelId}_${monthString}_${parsedPlanGlobalId}`;

                if (!hotelMonthDataMap[mapKey]) {
                    hotelMonthDataMap[mapKey] = {
                        hotel_id: hotelId,
                        hotel_name: hotelName,
                        month: formatToFirstDayOfMonth(monthString),
                        plan_global_id: parsedPlanGlobalId,
                        plan_name: planName,
                        accommodation_revenue: null,
                        operating_days: null,
                        available_room_nights: null,
                        rooms_sold_nights: null,
                    };
                }

                const englishKey = budgetItemKeyMap[budgetItemFromCsv];
                if (englishKey) {
                    hotelMonthDataMap[mapKey][englishKey] = value;
                } else {
                    console.warn(`CSVからの不明な予算項目: '${budgetItemFromCsv}' ホテルID ${hotelId}, 月 ${monthString}. 対応する英語キーが見つかりません。`);
                }
            });
        }
        return Object.values(hotelMonthDataMap);
    };

    const formatToFirstDayOfMonth = (input) => {
        const parsed = new Date(input);
        if (isNaN(parsed)) {
            console.warn(`無効な月文字列: ${input}`);
            return input;
        }
        parsed.setDate(1);
        return parsed.getFullYear() + '-' +
            String(parsed.getMonth() + 1).padStart(2, '0') + '-' +
            String(parsed.getDate()).padStart(2, '0');
    };

    const handleFileUpload = (event, type, statusRef) => {
        const file = event.files[0];
        const typeText = type === 'forecast' ? '予算' : '実績';

        return new Promise((resolvePromise, rejectPromise) => {
            if (!file) {
                statusRef.value = { message: 'ファイルが選択されていません。', type: 'warn' };
                if (event.options && typeof event.options.clear === 'function') {
                    event.options.clear();
                }
                rejectPromise(new Error('ファイルが選択されていません。'));
                return;
            }

            statusRef.value = { message: `${file.name} を処理中...`, type: 'info' };
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const csvText = e.target.result;
                    const jsonData = parseCSVtoJSON(csvText);

                    if (jsonData.length === 0) {
                        statusRef.value = { message: 'CSVファイルに処理可能なデータが見つかりませんでした。', type: 'warn' };
                        toast.add({ severity: 'warn', summary: '注意', detail: 'データが見つかりません。', life: 3000 });
                        resolvePromise();
                        return;
                    }

                    statusRef.value = { message: `${jsonData.length}件のデータをアップロード中...`, type: 'info' };

                    let result = null;
                    if (type === 'forecast') {
                        result = await forecastAddData(jsonData);
                    } else {
                        result = await accountingAddData(jsonData);
                    }

                    if (result && result.success) {
                        statusRef.value = { message: `${typeText}データ「${file.name}」(${jsonData.length}件)が正常にインポートされました。`, type: 'success' };
                        toast.add({ severity: 'success', summary: '成功', detail: `${typeText}データがアップロードされました。`, life: 3000 });
                        resolvePromise();
                    } else {
                        throw new Error("APIアップロードに失敗しました");
                    }
                } catch (error) {
                    console.error(`${type}ファイルの処理中またはアップロード中にエラーが発生しました:`, error);
                    statusRef.value = { message: `${typeText}データ「${file.name}」の処理中またはアップロード中にエラーが発生しました: ${error.message}`, type: 'error' };
                    toast.add({ severity: 'error', summary: 'エラー', detail: 'アップロードに失敗しました。', life: 5000 });
                    rejectPromise(error);
                }
            };

            reader.onerror = (error) => {
                console.error("ファイル読み取りエラー:", error);
                statusRef.value = { message: `ファイル読み取りエラー: ${file.name}`, type: 'error' };
                toast.add({ severity: 'error', summary: 'ファイルエラー', detail: 'ファイルの読み取りに失敗しました。', life: 3000 });
                if (event.options && typeof event.options.clear === 'function') {
                    event.options.clear();
                }
                rejectPromise(error);
            };

            reader.readAsText(file);
        });
    };



    return {
        maxFileSize,
        downloadTemplate,
        handleFileUpload,
        downloadPrefilledTemplate,
    };
}
