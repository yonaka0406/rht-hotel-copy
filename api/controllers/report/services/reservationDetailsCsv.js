const { format } = require("@fast-csv/format");
const { formatDate, translateStatus, translateType, translatePlanType, translatePaymentTiming } = require('../../../utils/reportUtils');

const generateReservationDetailsCsv = (res, result, startDate, endDate) => {
    // Edit totals
    const processedReservations = [];
    const seenReservationIds = new Set();
    const seenReservationDetailIds = new Set();

    result.forEach((reservation) => {
        const reservationId = reservation.reservation_id;
        const reservationDetailId = reservation.id;
        const isFirstOccurrence = !seenReservationIds.has(reservationId);
        const isFirstDetailOccurrence = !seenReservationDetailIds.has(reservationDetailId);

        if (isFirstOccurrence) {
            seenReservationIds.add(reservationId);
        }
        if (isFirstDetailOccurrence) {
            seenReservationDetailIds.add(reservationDetailId);
        }

        processedReservations.push({
            ...reservation,
            plan_price: isFirstDetailOccurrence
                ? Math.floor(parseFloat(reservation.plan_price) || 0)
                : null,
            plan_net_price: isFirstDetailOccurrence
                ? Math.floor(parseFloat(reservation.plan_net_price) || 0)
                : null,
            plan_price_accom: isFirstDetailOccurrence
                ? Math.floor(parseFloat(reservation.plan_price_accom) || 0)
                : null,
            plan_net_price_accom: isFirstDetailOccurrence
                ? Math.floor(parseFloat(reservation.plan_net_price_accom) || 0)
                : null,
            plan_price_other: isFirstDetailOccurrence
                ? Math.floor(parseFloat(reservation.plan_price_other) || 0)
                : null,
            plan_net_price_other: isFirstDetailOccurrence
                ? Math.floor(parseFloat(reservation.plan_net_price_other) || 0)
                : null,
            payments: isFirstOccurrence
                ? Math.floor(parseFloat(reservation.payments) || 0)
                : null,
        });
    });

    // CSV

    res.setHeader("Content-Disposition", "attachment; filename=reservation_details.csv");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.write("\uFEFF");

    const csvStream = format({ headers: true });
    csvStream.pipe(res);

    processedReservations.forEach((reservation) => {
        const clients = reservation.clients_json ? JSON.parse(reservation.clients_json) : [];
        const clientNames = clients.map(client => client.name).join(", ");  // Join all client names into one string

        // Calculate sales amounts
        // Use plan_price and addon_value (from reservation_details - edited values) when is_accommodation is true
        // Use plan_price_accom/other (from reservation_rates - raw values) for split calculations
        const planPrice = reservation.plan_price || 0;
        const planNetPrice = reservation.plan_net_price || 0;
        const addonValue = Math.floor(parseFloat(reservation.addon_value) || 0);
        const addonNetValue = Math.floor(parseFloat(reservation.addon_net_value) || 0);

        // For split sales (accommodation vs other)
        const isAddonAccom = !reservation.addon_sales_category || reservation.addon_sales_category === 'accommodation';
        const addonPriceAccom = isAddonAccom ? addonValue : 0;
        const addonNetPriceAccom = isAddonAccom ? addonNetValue : 0;

        const isAddonOther = reservation.addon_sales_category === 'other';
        const addonPriceOther = isAddonOther ? addonValue : 0;
        const addonNetPriceOther = isAddonOther ? addonNetValue : 0;

        const planPriceAccom = reservation.plan_price_accom || 0;
        const planNetPriceAccom = reservation.plan_net_price_accom || 0;
        const planPriceOther = reservation.plan_price_other || 0;
        const planNetPriceOther = reservation.plan_net_price_other || 0;

        // Process each reservation and write to CSV
        // Note on pricing: 
        // - plan_price comes from reservation_details (sometimes rounded to nearest 100, what client pays)
        // - plan_net_price comes from reservation_rates (actual net value based on gross value before rounding)
        // - This discrepancy means the net value of sales and plan calculations may not be accurate
        // - due to rounding differences between what's charged and what's recorded in the system
        csvStream.write({
            ホテルID: reservation.hotel_id,
            ホテル名称: reservation.formal_name,
            レポート期間: `${startDate} ～ ${endDate}`,
            ステータス: translateStatus(reservation.reservation_status),
            予約種類: translateType(reservation.reservation_type),
            エージェント: reservation.agent,
            OTA_ID: reservation.ota_reservation_id,
            予約者: reservation.booker_name,
            予約者カナ: reservation.booker_kana,
            チェックイン: formatDate(new Date(reservation.check_in)),
            チェックアウト: formatDate(new Date(reservation.check_out)),
            宿泊日数: reservation.number_of_nights,
            予約人数: reservation.reservation_number_of_people,
            販売用部屋: reservation.for_sale ? 'はい' : 'いいえ',
            建物階: reservation.floor,
            部屋番号: reservation.room_number,
            部屋タイプ: reservation.room_type_name,
            喫煙部屋: reservation.smoking ? 'はい' : 'いいえ',
            部屋容量: reservation.capacity,
            滞在人数: reservation.number_of_people,
            宿泊日: formatDate(new Date(reservation.date)),
            プラン名: reservation.plan_name,
            プランタイプ: translatePlanType(reservation.plan_type),
            プラン料金: reservation.plan_price,
            "プラン料金(税抜き)": reservation.plan_net_price,
            アドオン名: reservation.addon_name,
            アドオン数量: reservation.addon_quantity,
            アドオン単価: reservation.addon_price,
            アドオン料金: Math.floor(parseFloat(reservation.addon_value)),
            "アドオン料金(税抜き)": Math.floor(parseFloat(reservation.addon_net_value)),
            請求対象: reservation.billable ? 'はい' : 'いいえ',
            宿泊対象: reservation.is_accommodation ? 'はい' : 'いいえ',
            売上高: reservation.billable ? (reservation.is_accommodation ? planPrice + addonValue : planPriceAccom + addonPriceAccom) : 0,
            "売上高(税抜き)": reservation.billable ? (reservation.is_accommodation ? planNetPrice + addonNetValue : planNetPriceAccom + addonNetPriceAccom) : 0,
            "売上高(宿泊外)": reservation.billable ? planPriceOther + addonPriceOther : 0,
            "売上高(宿泊外・税抜き)": reservation.billable ? planNetPriceOther + addonNetPriceOther : 0,
            支払い: translatePaymentTiming(reservation.payment_timing),
            予約ID: reservation.reservation_id,
            予約詳細ID: reservation.id,
            詳細キャンセル: reservation.cancelled ? 'キャンセル' : '',
        });
    });
    csvStream.end();
};

module.exports = {
    generateReservationDetailsCsv
};
