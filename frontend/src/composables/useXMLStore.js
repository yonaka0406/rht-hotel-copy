import { ref, watch } from 'vue';

const template = ref(null);
const responses = ref([]);

const sc_serviceLabels = ref([
    { id: "NetRoomTypeMasterSearchService", label: "部屋タイプマスタ検索(ネット販売)" },
    { id: "NetStockSearchService", label: "在庫状況照会(ネット販売)" },
    { id: "NetStockAdjustmentService", label: "在庫調整(ネット販売)" },
    { id: "NetStockAdjustmentResponseResendService", label: "在庫調整_回答再送(ネット販売)" },
    { id: "NetStockBulkAdjustmentService", label: "在庫調整(複数日指定)(ネット販売)" },
    { id: "NetStockBulkAdjustmentResponseResendService", label: "在庫調整_回答再送(複数日指定)(ネット販売)" },
    /*{ id: "NetPlanMasterSearchService", label: "プランマスタ検索(ネット販売)" },*/
    { id: "NetPlanMasterSearchR2Service", label: "プランマスタ検索(ネット販売)_ Ver2.0" },
    { id: "NetPriceAdjustmentService", label: "プラン料金調整(ネット販売)" },
    { id: "NetPriceAdjustmentResponseResendService", label: "プラン料金調整_回答再送(ネット販売)" },
    { id: "NetPriceBulkAdjustmentService", label: "プラン料金調整(複数日指定)(ネット販売)" },
    { id: "NetPriceBulkAdjustmentResponseResendService", label: "プラン料金調整(複数日指定)_回答再送(ネット販売)" },
    { id: "PlanSaleSituationSearchService", label: "プラン販売状況照会(ネット販売)" },
    { id: "NetRestrictionAdjustmentService", label: "リストリクション調整(ネット販売)" },
    { id: "NetRestrictionBulkAdjustmentService", label: "リストリクション調整(複数日指定)(ネット販売)" },
    { id: "RestrictionSearchService", label: "リストリクション状況照会(ネット販売)" },
    /*{ id: "RealRoomTypeMasterSearchService", label: "部屋タイプマスタ検索(旅行会社)" },
    { id: "RealStockSearchService", label: "在庫状況照会(旅行会社)" },
    { id: "RealStockAdjustmentService", label: "在庫調整(旅行会社)" },
    { id: "RealStockAdjustmentResponseResendService", label: "在庫調整_回答再送(旅行会社)" },*/
    { id: "BookingInfoOutputService", label: "予約出力" },
    { id: "OutputCompleteService", label: "予約出力_完了反映" }
]);

const sc_fieldLabels = ref([
    { id: "agtCode", label: "販売先コード" },
    { id: "adjustmentDate", label: "調整日付" },
    { id: "adjustmentDate1", label: "調整日付" },
    { id: "adjustmentProcedureCode", label: "調整方法" },
    { id: "adjustmentResult", label: "調整結果" },    
    { id: "errorDescription", label: "エラー内容" },
    { id: "extractionProcedureCode", label: "抽出方法" },
    { id: "failureReason", label: "失敗理由" },
    { id: "isStockAdjustable", label: "在庫調整操作可否" },
    { id: "isSuccess", label: "成功状態" },
    { id: "lincolnUseFlag", label: "リンカーン上で扱うフラグ" },
    { id: "netAgtRmTypeCode", label: "ネット販売先室タイプコード" },
    { id: "netAgtRmTypeDailyStockList", label: "ネット販売先室タイプ日別在庫" },    
    { id: "netAgtRmTypeName", label: "ネット販売先室タイプ名" },
    { id: "netAgtRmTypeList", label: "ネット販売先室タイプ" },
    { id: "netRmTypeGroupAndDailyStockStatusList", label: "ネット室タイプグループと在庫状況照会" },    
    { id: "netRmTypeGroupCode", label: "ネット室タイプグループコード" },
    { id: "netRmTypeGroupName", label: "ネット室タイプグループ名" },
    { id: "netRmTypeGroupList", label: "ネット室タイプグループ" },
    { id: "PMSOutputRmTypeCode", label: "PMS用出力名" },
    { id: "remainingCount", label: "残室数" },
    { id: "requestId", label: "要求ID" },
    { id: "rmTypeCode", label: "室タイプコード" },
    { id: "rmTypeName", label: "室タイプ名" },
    { id: "rmTypeList", label: "室タイプ名" },
    { id: "saleDate", label: "日付" },
    { id: "salesCount", label: "販売数" },
    { id: "salesStatus", label: "販売状態" },
    { id: "searchDurationFrom", label: "照会期間FROM" },
    { id: "searchDurationTo", label: "照会期間TO" },
    { id: "tejimaiDayCount", label: "手仕舞い日数" },
    { id: "tejimaiTime", label: "手仕舞い時刻" },
    { id: "updateDate", label: "更新日時" },
  ]);

export function useXMLStore() {
        
    const fetchServiceName = (name) => {
        const service = sc_serviceLabels.value.find(item => item.id === name);
        return service ? service.label : name;
    };
    const fetchFieldName = (name) => {
        const service = sc_fieldLabels.value.find(item => item.id === name);
        return service ? service.label : name;
    };

    const fetchXMLTemplate = async(name) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/xml/template/${name}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,                    
                },                
            });

            const data = await response.text();

            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }
            
            template.value = data;
            
        } catch (error) {
            template.value = null;
            console.error('Failed to fetch data', error);
        }
    };
    const fetchXMLRecentResponses = async(name) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/xml/responses/recent`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,                    
                },                
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }
            
            responses.value = data;
            
        } catch (error) {
            responses.value = [];
            console.error('Failed to fetch data', error);
        }
    };

    const insertXMLResponse = async(name, xml) => {
        console.log('insertXMLResponse', name, xml);
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/xml/response/${name}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'text/xml',
                },
                body: xml,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', response.status, response.statusText, errorText);
                throw new Error(`Failed to post data: ${response.status} ${response.statusText} ${errorText}`);
            }

            const responseData = await response.json(); // Parse the JSON response from postXMLResponse
            console.log('XML response saved successfully', responseData);
            return responseData;
            
        } catch (error) {
            console.error('Failed to post data', error);
            throw error;
        }
    };   

    return {        
        template,
        responses,
        sc_serviceLabels,
        sc_fieldLabels,
        fetchServiceName,
        fetchFieldName,
        fetchXMLTemplate,
        fetchXMLRecentResponses,
        insertXMLResponse,        
    };
}