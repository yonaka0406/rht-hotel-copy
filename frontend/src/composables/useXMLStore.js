import { ref } from 'vue';

const template = ref(null);
const responses = ref([]);
const otaQueue = ref([]);
const otaXmlQueueData = ref([]);
const otaXmlQueueLoading = ref(false);

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
    { id: "adjustmentDate", label: "調整日付" },    
    { id: "adjustmentProcedureCode", label: "調整方法" },
    { id: "adjustmentResult", label: "調整結果" },
    { id: "agtCode", label: "販売先コード" },
    { id: "coordinationPrice", label: "料金調整額" },
    { id: "coordinationRate", label: "料金調整率" },
    { id: "cta", label: "到着制限" },
    { id: "ctd", label: "出発制限" },
    { id: "errorDescription", label: "エラー内容" },
    { id: "extractionProcedure", label: "抽出方法" },
    { id: "extractionProcedureCode", label: "抽出方法コード" },
    { id: "failureReason", label: "失敗理由" },
    { id: "isChargeAdjustable", label: "料金調整操作可否" },
    { id: "isStockAdjustable", label: "在庫調整操作可否" },
    { id: "isSuccess", label: "成功状態" },
    { id: "lincolnUseFlag", label: "リンカーン上で扱うフラグ" },
    { id: "maxLOS", label: "最大宿泊日数" },
    { id: "maxPrice", label: "最高販売価格" },
    { id: "maxPriceInputMissAlarmFlg", label: "最高販売価格入力ミスアラーム設定フラグ" },    
    { id: "minLOS", label: "最低宿泊日数" },
    { id: "minPrice", label: "最低販売価格" },
    { id: "minPriceInputMissAlarmFlg", label: "最低販売価格入力ミスアラーム設定フラグ" },
    { id: "netAgtRmTypeCode", label: "ネット販売先室タイプコード" },
    { id: "netAgtRmTypeDailyStockList", label: "ネット販売先室タイプ日別在庫" },
    { id: "netAgtRmTypeList", label: "ネット販売先室タイプ" },
    { id: "netAgtRmTypeName", label: "ネット販売先室タイプ名" },
    { id: "netRmTypeGroupAndDailyStockStatusList", label: "ネット室タイプグループと在庫状況照会" },
    { id: "netRmTypeGroupCode", label: "ネット室タイプグループコード" },
    { id: "netRmTypeGroupList", label: "ネット室タイプグループ" },
    { id: "netRmTypeGroupName", label: "ネット室タイプグループ名" },
    { id: "offereeCode", label: "提供先コード" },
    { id: "planCode", label: "プランコード" },
    { id: "planGroupCode", label: "プラングループコード" },
    { id: "planGroupList", label: "プラングループ" },
    { id: "planGroupName", label: "プラングループ名" },
    { id: "planList", label: "プラン" },
    { id: "planName", label: "プラン名" },
    { id: "PMSOutputRmTypeCode", label: "PMS用出力名" },
    { id: "priceRange1", label: "料金帯1料金" },
    { id: "priceRange2", label: "料金帯2料金" },
    { id: "priceRange3", label: "料金帯3料金" },
    { id: "priceRange4", label: "料金帯4料金" },
    { id: "priceRange5", label: "料金帯5料金" },
    { id: "priceRange6", label: "料金帯6料金" },
    { id: "priceRange7", label: "料金帯7料金" },
    { id: "priceRange8", label: "料金帯8料金" },
    { id: "priceRange9", label: "料金帯9料金" },
    { id: "priceRange10", label: "料金帯10料金" },
    { id: "priceRangeCount1", label: "料金帯1人数" },    
    { id: "priceRangeCount2", label: "料金帯2人数" },
    { id: "priceRangeCount3", label: "料金帯3人数" },
    { id: "priceRangeCount4", label: "料金帯4人数" },
    { id: "priceRangeCount5", label: "料金帯5人数" },
    { id: "priceRangeCount6", label: "料金帯6人数" },
    { id: "priceRangeCount7", label: "料金帯7人数" },
    { id: "priceRangeCount8", label: "料金帯8人数" },
    { id: "priceRangeCount9", label: "料金帯9人数" },
    { id: "priceRangeCount10", label: "料金帯10人数" },
    { id: "priceRangeName1", label: "料金帯1名称" },    
    { id: "priceRangeName2", label: "料金帯2名称" },
    { id: "priceRangeName3", label: "料金帯3名称" },
    { id: "priceRangeName4", label: "料金帯4名称" },
    { id: "priceRangeName5", label: "料金帯5名称" },
    { id: "priceRangeName6", label: "料金帯6名称" },
    { id: "priceRangeName7", label: "料金帯7名称" },
    { id: "priceRangeName8", label: "料金帯8名称" },
    { id: "priceRangeName9", label: "料金帯9名称" },
    { id: "priceRangeName10", label: "料金帯10名称" },
    { id: "ratePlanCode", label: "レートプランコード" },
    { id: "remainingCount", label: "残室数" },
    { id: "requestId", label: "要求ID" },
    { id: "rmTypeCode", label: "室タイプコード" },
    { id: "rmTypeList", label: "室タイプ名" },
    { id: "rmTypeName", label: "室タイプ名" },
    { id: "saleDate", label: "日付" },
    { id: "saleDurationFrom", label: "販売期間FROM" },
    { id: "saleDurationTo", label: "販売期間TO" },
    { id: "salesCount", label: "販売数" },
    { id: "salesStatus", label: "販売状態" },
    { id: "searchDurationFrom", label: "照会期間FROM" },
    { id: "searchDurationTo", label: "照会期間TO" },
    { id: "tejimaiDayCount", label: "手仕舞い日数" },
    { id: "tejimaiTime", label: "手仕舞い時刻" },
    { id: "updateDate", label: "更新日時" },
]);

const tlRoomMaster = ref(null);
const tlPlanMaster = ref(null);

export function useXMLStore() {
        
    const fetchServiceName = (name) => {
        const service = sc_serviceLabels.value.find(item => item.id === name);
        return service ? service.label : name;
    };
    const fetchFieldName = (name) => {
        const service = sc_fieldLabels.value.find(item => item.id === name);
        return service ? service.label : name;
    };
    // XML
    const fetchXMLTemplate = async(hotel_id, name) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/xml/template/${hotel_id}/${name}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,                    
                },                
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error in fetchXMLTemplate:', response.status, response.statusText, errorText);
                throw new Error(`Failed to retrieve XML template: ${errorText}`);
            }
            
            const data = await response.text();
            template.value = data;
            
        } catch (error) {
            template.value = null;
            console.error('Failed to retrieve data.', error);
            throw error;
        }
    };
    const fetchXMLRecentResponses = async() => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/xml/responses/recent`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,                    
                },                
            });

            if (!response.ok) {
                const errorData = await response.json(); // Assuming error responses are JSON
                console.error('API Error in fetchXMLRecentResponses:', response.status, response.statusText, errorData);
                throw new Error(`Failed to retrieve recent XML responses: ${errorData.message || JSON.stringify(errorData)}`);
            }
            
            const data = await response.json();
            responses.value = data;
            
        } catch (error) {
            responses.value = [];
            console.error('Failed to retrieve data.', error);
            throw error;
        }
    };
    const insertXMLResponse = async(hotel_id, name, xml) => {
        // console.log('insertXMLResponse', name, xml);
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/xml/response/${hotel_id}/${name}`;
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
                console.error('API Error in insertXMLResponse:', response.status, response.statusText, errorText);
                throw new Error(`データの送信に失敗しました。: ${errorText}`);
            }

            const responseData = await response.json(); // Parse the JSON response from postXMLResponse
            // console.log('XML response saved successfully', responseData);
            return responseData;
            
        } catch (error) {
            console.error('Failed to send data.', error);
            throw error;
        }
    };

    // Site Controller
    const fetchTLRoomMaster = async(hotel_id) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/sc/tl/${hotel_id}/master/room`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,                    
                },                
            });

            if (!response.ok) {
                const errorData = await response.json(); // Assuming error responses are JSON
                console.error('API Error in fetchTLRoomMaster:', response.status, response.statusText, errorData);
                throw new Error(`Failed to retrieve TL Room Master: ${errorData.message || JSON.stringify(errorData)}`);
            }
            
            const data = await response.json();
            tlRoomMaster.value = data;
            
        } catch (error) {
            tlRoomMaster.value = null;
            console.error('Failed to retrieve data.', error);
            throw error;
        }
    };
    const insertTLRoomMaster = async (roomData) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/sc/tl/master/room`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(roomData),
            });
        
            if (!response.ok) {
                const errorData = await response.json(); // Assuming error responses are JSON
                console.error('API Error in insertTLRoomMaster:', response.status, response.statusText, errorData);
                throw new Error(`Failed to create room master: ${errorData.message || JSON.stringify(errorData)}`);
            }
        
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to create room master.', error);
            throw error; // Re-throw the error for handling in the component
        }
    };
    const fetchTLPlanMaster = async(hotel_id) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/sc/tl/${hotel_id}/master/plan`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,                    
                },                
            });

            if (!response.ok) {
                const errorData = await response.json(); // Assuming error responses are JSON
                console.error('API Error in fetchTLPlanMaster:', response.status, response.statusText, errorData);
                throw new Error(`Failed to retrieve TL Plan Master: ${errorData.message || JSON.stringify(errorData)}`);
            }
            
            const data = await response.json();
            tlPlanMaster.value = data;
            
        } catch (error) {
            tlPlanMaster.value = null;
            console.error('Failed to retrieve data.', error);
            throw error;
        }
    };
    const insertTLPlanMaster = async (planData) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/sc/tl/master/plan`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(planData),
            });
        
            if (!response.ok) {
                const errorData = await response.json(); // Assuming error responses are JSON
                console.error('API Error in insertTLPlanMaster:', response.status, response.statusText, errorData);
                throw new Error(`Failed to create plan master: ${errorData.message || JSON.stringify(errorData)}`);
            }
        
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to create plan master.', error);
            throw error; // Re-throw the error for handling in the component
        }
    };
    const fetchInventoryForTL = async (hotel_id, check_in, check_out) => {

        try {
            const authToken = localStorage.getItem('authToken');    
            const response = await fetch(`/api/report/res/inventory-all/${hotel_id}/${check_in}/${check_out}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`, 
                }
            });
            if (!response.ok) {
                const errorData = await response.json(); // Assuming error responses are JSON
                console.error('API Error in fetchInventoryForTL:', response.status, response.statusText, errorData);
                throw new Error(`Failed to retrieve inventory for TL: ${errorData.message || JSON.stringify(errorData)}`);
            }
            const data = await response.json();
            
            return data;
        } catch (error) {
            console.error('Failed to retrieve data.', error);
            throw error;
        }        
    };
    const updateTLInventory = async (hotel_id, inventory) => {
        
        const logId = Math.floor(Math.random() * 1e8);
        
        try {
            const authToken = localStorage.getItem('authToken');  
            const response = await fetch(`/api/sc/tl/inventory-manual/multiple/${hotel_id}/${logId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(inventory),
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error in updateTLInventory:', response.status, response.statusText, errorText);
                throw new Error(`Failed to send data: ${errorText}`);
            }
            const data = await response.json();
            
            return data;
            
        } catch (error) {
          console.error(`Failed to update site controller for hotel ${hotel_id}:`, error);          
          throw error;
        }
    };

    const fetchOtaQueue = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = '/api/ota-queue';
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json(); // Assuming error responses are JSON
                console.error('API Error in fetchOtaQueue:', response.status, response.statusText, errorData);
                throw new Error(`Failed to retrieve OTA queue data: ${errorData.message || JSON.stringify(errorData)}`);
            }

            const data = await response.json();
            otaQueue.value = data;

        } catch (error) {
            otaQueue.value = [];
            console.error('Failed to retrieve data.', error);
            throw error;
        }
    };

    const fetchOtaXmlQueue = async () => {
        otaXmlQueueLoading.value = true;
        try {
            const authToken = localStorage.getItem('authToken');
            const url = '/api/xml-queue';
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json(); // Assuming error responses are JSON
                console.error('API Error in fetchOtaXmlQueue:', response.status, response.statusText, errorData);
                throw new Error(`Failed to retrieve OTA XML queue data: ${errorData.message || JSON.stringify(errorData)}`);
            }

            const data = await response.json();
            otaXmlQueueData.value = data;

        } catch (error) {
            otaXmlQueueData.value = [];
            console.error('Failed to retrieve OTA XML queue data.', error);
            throw error;
        } finally {
            otaXmlQueueLoading.value = false;
        }
    };

    return {        
        template,
        responses,
        otaQueue,
        sc_serviceLabels,
        sc_fieldLabels,
        tlRoomMaster,
        tlPlanMaster,
        fetchServiceName,
        fetchFieldName,
        fetchXMLTemplate,
        fetchXMLRecentResponses,
        insertXMLResponse,      
        fetchTLRoomMaster,
        insertTLRoomMaster,
        fetchTLPlanMaster,
        insertTLPlanMaster,
        fetchInventoryForTL,
        updateTLInventory,
        fetchOtaQueue,
        otaXmlQueueData,
        fetchOtaXmlQueue,
    };
}