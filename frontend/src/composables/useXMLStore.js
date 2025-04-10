import { ref, watch } from 'vue';

const template = ref(null);
const responses = ref([]);

export const sc_serviceLabels = ref([
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

export function useXMLStore() {
        
    const fetchServiceName = (name) => {
        const service = sc_serviceLabels.value.find(item => item.id === name);
        return service ? service.label : null;
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
        fetchServiceName,
        fetchXMLTemplate,
        fetchXMLRecentResponses,
        insertXMLResponse,        
    };
}