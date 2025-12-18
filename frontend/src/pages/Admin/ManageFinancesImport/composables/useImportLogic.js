
import { onMounted } from 'vue';
import { useHotelStore } from '@/composables/useHotelStore';
import { useImportStore } from '@/composables/useImportStore';
import { usePlansStore } from '@/composables/usePlansStore';
import { useToast } from 'primevue/usetoast';

export function useImportLogic() {
    const toast = useToast();
    const { hotels, fetchHotels } = useHotelStore();
    const { forecastAddData, accountingAddData, getPrefilledTemplateData } = useImportStore();
    const { fetchPlanTypeCategories, fetchPlanPackageCategories } = usePlansStore();

    let typeCategories = [];
    let packageCategories = [];

    onMounted(async () => {
        await fetchHotels();
        typeCategories = await fetchPlanTypeCategories();
        packageCategories = await fetchPlanPackageCategories();
    });

    const maxFileSize = 5000000; // 5MB
    const budgetItems = ['売上', '販売客室数', '営業日数', '客室数'];
    const salesCategories = [
        { id: 0, name: '宿泊' },
        { id: 1, name: '宿泊外' }
    ];
    const budgetItemKeyMap = {
        '売上': { accommodation: 'accommodation_revenue', non_accommodation: 'non_accommodation_revenue' },
        '販売客室数': { accommodation: 'rooms_sold_nights', non_accommodation: 'non_accommodation_sold_rooms' },
        '営業日数': 'operating_days',
        '客室数': 'available_room_nights'
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

        csvRows.push(['ID', '施設', 'タイプカテゴリーID', 'タイプカテゴリー名', 'パッケージカテゴリーID', 'パッケージカテゴリー名', '売上区分', itemColumnTitle, ...monthHeaders].join(','));

        if (!hotels.value || hotels.value.length === 0) {
            console.warn('CSV生成のためのホテルデータが利用できません。');
            return "";
        }
        if (!typeCategories || typeCategories.length === 0) {
            console.warn('CSV生成のためのタイプカテゴリーデータが利用できません。');
            return "";
        }
        if (!packageCategories || packageCategories.length === 0) {
            console.warn('CSV生成のためのパッケージカテゴリーデータが利用できません。');
            return "";
        }

        const sortedHotels = [...hotels.value].sort((a, b) => a.id - b.id);
        const sortedTypeCategories = [...typeCategories].sort((a, b) => a.display_order - b.display_order || a.id - b.id);
        const sortedPackageCategories = [...packageCategories].sort((a, b) => a.display_order - b.display_order || a.id - b.id);

        // For regular template, only show accommodation (売上区分=0)
        // For prefilled template, show both accommodation and non-accommodation
        const categoriesToShow = prefilledData ? salesCategories : [salesCategories[0]]; // Only accommodation for regular template
        
        // Helper function to check if there's any non-zero data for a sales category
        const hasNonZeroDataFrontend = (hotel, typeCategory, packageCategory, salesCategory, item) => {
            if (!prefilledData) return true; // For regular templates, always include
            
            return monthHeaders.some(header => {
                const [hYear, hMonth] = header.split('-').map(Number);
                const prefilledRow = prefilledData.find(row => {
                    const isMonthMatch = new Date(row.month).getFullYear() === hYear && new Date(row.month).getMonth() + 1 === hMonth;
                    const isHotelMatch = Number(row.hotel_id) === hotel.id;
                    const isTypeCategoryMatch = row.plan_type_category_id === typeCategory.id;
                    const isPackageCategoryMatch = row.plan_package_category_id === packageCategory.id;
                    return isMonthMatch && isHotelMatch && isTypeCategoryMatch && isPackageCategoryMatch;
                });

                if (!prefilledRow) return false;

                if (item === '売上') {
                    const value = salesCategory.id === 0 ? prefilledRow.accommodation_revenue : prefilledRow.non_accommodation_revenue;
                    return value && parseFloat(value) !== 0;
                } else if (item === '販売客室数') {
                    const value = salesCategory.id === 0 ? prefilledRow.rooms_sold_nights : prefilledRow.non_accommodation_sold_rooms;
                    return value && parseFloat(value) !== 0;
                }
                return false;
            });
        };
        
        // Generate rows for 売上区分=0 (accommodation) first, then 売上区分=1 (non-accommodation)
        categoriesToShow.forEach(salesCategory => {
            sortedHotels.forEach(hotel => {
                sortedTypeCategories.forEach(typeCategory => {
                    sortedPackageCategories.forEach(packageCategory => {
                        itemsForProcessing.forEach(item => {
                            // For '売上' and '販売客室数', create rows for current sales category
                            if (item === '売上' || item === '販売客室数') {
                                // For 売上区分=1 (non-accommodation), only create row if there's non-zero data
                                if (salesCategory.id === 1 && !hasNonZeroDataFrontend(hotel, typeCategory, packageCategory, salesCategory, item)) {
                                    return; // Skip this row if no non-zero data
                                }

                                const row = [hotel.id, hotel.name, typeCategory.id, typeCategory.name, packageCategory.id, packageCategory.name, salesCategory.id, item];
                                monthHeaders.forEach(header => {
                                    const [hYear, hMonth] = header.split('-').map(Number);
                                    const prefilledRow = prefilledData ? prefilledData.find(row => {
                                        const isMonthMatch = new Date(row.month).getFullYear() === hYear && new Date(row.month).getMonth() + 1 === hMonth;
                                        const isHotelMatch = Number(row.hotel_id) === hotel.id;
                                        const isTypeCategoryMatch = row.plan_type_category_id === typeCategory.id;
                                        const isPackageCategoryMatch = row.plan_package_category_id === packageCategory.id;

                                        return isMonthMatch && isHotelMatch && isTypeCategoryMatch && isPackageCategoryMatch;
                                    }) : null;

                                    if (item === '売上') {
                                        const valueToPush = prefilledRow ? 
                                            (salesCategory.id === 0 ? prefilledRow.accommodation_revenue : prefilledRow.non_accommodation_revenue) : '';
                                        row.push(valueToPush);
                                    } else if (item === '販売客室数') {
                                        const valueToPush = prefilledRow ? 
                                            (salesCategory.id === 0 ? prefilledRow.rooms_sold_nights : prefilledRow.non_accommodation_sold_rooms) : '';
                                        row.push(valueToPush);
                                    }
                                });
                                csvRows.push(row.join(','));
                            } else if (salesCategory.id === 0) {
                                // For '営業日数' and '客室数', only create rows for sales_category = 0 (accommodation)
                                const row = [hotel.id, hotel.name, typeCategory.id, typeCategory.name, packageCategory.id, packageCategory.name, 0, item];
                                monthHeaders.forEach(header => {
                                    const [hYear, hMonth] = header.split('-').map(Number);
                                    const prefilledRow = prefilledData ? prefilledData.find(row => {
                                        const isMonthMatch = new Date(row.month).getFullYear() === hYear && new Date(row.month).getMonth() + 1 === hMonth;
                                        const isHotelMatch = Number(row.hotel_id) === hotel.id;
                                        const isTypeCategoryMatch = row.plan_type_category_id === typeCategory.id;
                                        const isPackageCategoryMatch = row.plan_package_category_id === packageCategory.id;

                                        return isMonthMatch && isHotelMatch && isTypeCategoryMatch && isPackageCategoryMatch;
                                    }) : null;

                                    if (item === '営業日数') {
                                        row.push(prefilledRow ? prefilledRow.operating_days : getDaysInMonth(hYear, hMonth - 1));
                                    } else if (item === '客室数') {
                                        const daysInCurrentMonth = getDaysInMonth(hYear, hMonth - 1);
                                        const totalRoomsForMonth = (hotel.total_rooms && typeof hotel.total_rooms === 'number')
                                            ? hotel.total_rooms * daysInCurrentMonth
                                            : 0;
                                        row.push(prefilledRow ? prefilledRow.available_room_nights : totalRoomsForMonth);
                                    }
                                });
                                csvRows.push(row.join(','));
                            }
                        });
                    });
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
        if (!hotels.value || hotels.value.length === 0 || !typeCategories || typeCategories.length === 0 || !packageCategories || packageCategories.length === 0) {
            try {
                await fetchHotels();
                if (!typeCategories || typeCategories.length === 0) {
                    typeCategories = await fetchPlanTypeCategories();
                }
                if (!packageCategories || packageCategories.length === 0) {
                    packageCategories = await fetchPlanPackageCategories();
                }
                if (!hotels.value || hotels.value.length === 0) {
                    toast.add({ severity: 'warn', summary: '注意', detail: 'ホテルデータが利用できません。テンプレートを生成できません。', life: 3000 });
                    return;
                }
                if (!typeCategories || typeCategories.length === 0) {
                    toast.add({ severity: 'warn', summary: '注意', detail: 'タイプカテゴリーデータが利用できません。テンプレートを生成できません。', life: 3000 });
                    return;
                }
                if (!packageCategories || packageCategories.length === 0) {
                    toast.add({ severity: 'warn', summary: '注意', detail: 'パッケージカテゴリーデータが利用できません。テンプレートを生成できません。', life: 3000 });
                    return;
                }
            } catch (error) {
                console.error("Error fetching hotels or categories for template:", error);
                toast.add({ severity: 'error', summary: 'エラー', detail: 'ホテルまたはカテゴリーデータの取得に失敗しました。', life: 3000 });
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
        // New CSV format: ['ID', '施設', 'タイプカテゴリーID', 'タイプカテゴリー名', 'パッケージカテゴリーID', 'パッケージカテゴリー名', '売上区分', '予算項目/会計項目', ...monthHeaders]
        const monthDateHeaders = headers.slice(8); // Skip first 8 columns
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
            const typeCategoryId = parts[2] && parts[2].trim() !== '' ? parseInt(parts[2], 10) : null;
            const typeCategoryName = parts[3];
            const packageCategoryId = parts[4] && parts[4].trim() !== '' ? parseInt(parts[4], 10) : null;
            const packageCategoryName = parts[5];
            const salesCategory = parts[6] && parts[6].trim() !== '' ? parseInt(parts[6], 10) : 0; // 0=accommodation, 1=non_accommodation
            const budgetItemFromCsv = parts[7];

            monthDateHeaders.forEach((monthString, monthIndex) => {
                const valueString = parts[monthIndex + 8]; // Skip first 8 columns
                const value = valueString && valueString.trim() !== '' ? parseFloat(valueString) : 0;
                
                // Skip processing if value is 0 or empty to avoid unnecessary records
                if (value === 0 && (budgetItemFromCsv === '売上' || budgetItemFromCsv === '販売客室数')) {
                    return;
                }
                
                // Use the same key for all sales categories to aggregate them into one record
                const mapKey = `${hotelId}_${monthString}_${typeCategoryId}_${packageCategoryId}`;

                if (!hotelMonthDataMap[mapKey]) {
                    hotelMonthDataMap[mapKey] = {
                        hotel_id: hotelId,
                        hotel_name: hotelName,
                        month: formatToFirstDayOfMonth(monthString),
                        plan_type_category_id: typeCategoryId,
                        plan_type_category_name: typeCategoryName,
                        plan_package_category_id: packageCategoryId,
                        plan_package_category_name: packageCategoryName,
                        accommodation_revenue: null,
                        non_accommodation_revenue: null,
                        operating_days: null,
                        available_room_nights: null,
                        rooms_sold_nights: null,
                        non_accommodation_sold_rooms: null,
                    };
                }

                // Map budget items to database fields based on sales category
                if (budgetItemFromCsv === '売上') {
                    if (salesCategory === 0) {
                        hotelMonthDataMap[mapKey]['accommodation_revenue'] = value;
                    } else if (salesCategory === 1) {
                        hotelMonthDataMap[mapKey]['non_accommodation_revenue'] = value;
                    }
                } else if (budgetItemFromCsv === '販売客室数') {
                    if (salesCategory === 0) {
                        hotelMonthDataMap[mapKey]['rooms_sold_nights'] = value;
                    } else if (salesCategory === 1) {
                        hotelMonthDataMap[mapKey]['non_accommodation_sold_rooms'] = value;
                    }
                } else {
                    // For '営業日数' and '客室数', use the direct mapping (these are always sales_category=0)
                    // Only process these for sales_category=0 to avoid duplicates
                    if (salesCategory === 0) {
                        const englishKey = budgetItemKeyMap[budgetItemFromCsv];
                        if (englishKey) {
                            hotelMonthDataMap[mapKey][englishKey] = value;
                        } else {
                            console.warn(`CSVからの不明な予算項目: '${budgetItemFromCsv}' ホテルID ${hotelId}, 月 ${monthString}. 対応する英語キーが見つかりません。`);
                        }
                    }
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



    const getCategoriesDictionary = async () => {
        try {
            if (!typeCategories || typeCategories.length === 0) {
                typeCategories = await fetchPlanTypeCategories();
            }
            if (!packageCategories || packageCategories.length === 0) {
                packageCategories = await fetchPlanPackageCategories();
            }
            
            return {
                typeCategories: typeCategories.map(cat => ({ id: cat.id, name: cat.name, description: cat.description })),
                packageCategories: packageCategories.map(cat => ({ id: cat.id, name: cat.name, description: cat.description })),
                salesCategories: [
                    { id: 0, name: '宿泊', description: '宿泊売上・販売客室数' },
                    { id: 1, name: '宿泊外', description: '宿泊外売上・販売客室数' }
                ]
            };
        } catch (error) {
            console.error('Error fetching categories dictionary:', error);
            return {
                typeCategories: [],
                packageCategories: [],
                salesCategories: []
            };
        }
    };

    return {
        maxFileSize,
        downloadTemplate,
        handleFileUpload,
        downloadPrefilledTemplate,
        getCategoriesDictionary,
    };
}
