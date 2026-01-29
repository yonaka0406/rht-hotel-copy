<template>
    <div class="p-4">
        <Card>
            <template #header>
                <div class="flex justify-between items-center mt-4 mr-4 ml-4">
                    <div class="flex items-center gap-2">
                        <i class="pi pi-info-circle text-blue-500"></i>
                        <span class="text-sm text-gray-600">OTAプランとPMSプランの紐づけ設定</span>
                    </div>
                    <Button label="最新情報を取得" @click="fetchTemplate()" />
                </div>
            </template>
            <template #content>
                <!-- 統計情報表示 -->
                <div class="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div class="flex items-center gap-2">
                            <i class="pi pi-check-circle text-green-500"></i>
                            <span>紐づけ済み: <strong>{{ mappingStats.mapped }}</strong>件</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <i class="pi pi-exclamation-triangle text-orange-500"></i>
                            <span>未設定: <strong>{{ mappingStats.unmapped }}</strong>件</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <i class="pi pi-times-circle text-red-500"></i>
                            <span>エラー: <strong>{{ mappingStats.errors }}</strong>件</span>
                        </div>
                        <div v-if="mappingStats.globalErrors > 0" class="flex items-center gap-2">
                            <i class="pi pi-ban text-purple-500"></i>
                            <span>グローバル連携: <strong>{{ mappingStats.globalErrors }}</strong>件</span>
                        </div>
                    </div>
                </div>

                <DataTable :value="planMaster" :rowClass="getRowClass">                    
                    <Column field="plangroupcode" header="プラングループコード" style="width: 150px;">
                        <template #body="slotProps">
                            <div class="flex items-center gap-2">
                                <span>{{ slotProps.data.plangroupcode }}</span>
                                <i v-if="!slotProps.data.is_mapped && !slotProps.data.mapping_error" 
                                   class="pi pi-exclamation-triangle text-orange-500 text-xs" 
                                   title="未設定"></i>
                                <i v-else-if="slotProps.data.mapping_error && slotProps.data.error_type === 'global_plan'" 
                                   class="pi pi-ban text-purple-500 text-xs" 
                                   title="グローバルプラン（非推奨）"></i>
                                <i v-else-if="slotProps.data.mapping_error" 
                                   class="pi pi-times-circle text-red-500 text-xs" 
                                   title="マッピングエラー"></i>
                                <i v-else 
                                   class="pi pi-check-circle text-green-500 text-xs" 
                                   title="設定済み"></i>
                            </div>
                        </template>
                    </Column>
                    <Column field="plangroupname" header="プラングループ名" style="width: 200px;"></Column>
                    <Column header="PMSプラン紐づけ" style="width: 300px;">
                        <template #body="slotProps">
                            <div class="flex flex-col gap-2">
                                <Select
                                    v-model="slotProps.data.plan_key" 
                                    :options="getFilteredPlanOptions(slotProps.data)"
                                    optionLabel="display_name" 
                                    optionValue="plan_key"
                                    placeholder="プランを選択してください"
                                    :class="getPlanSelectClass(slotProps.data)"
                                    @change="onPlanChange(slotProps.data, $event)"
                                >
                                    <template #option="optionProps">
                                        <div class="flex items-center justify-between w-full">
                                            <div class="flex flex-col">
                                                <span class="font-medium">{{ optionProps.option.name }}</span>
                                                <span class="text-xs text-gray-500">{{ optionProps.option.plan_key }}</span>
                                            </div>
                                            <div class="flex items-center gap-1">
                                                <Badge v-if="optionProps.option.is_recommended" 
                                                       value="推奨" 
                                                       severity="success" 
                                                       size="small" />
                                                <Badge value="ホテル" 
                                                       severity="info" 
                                                       size="small" />
                                            </div>
                                        </div>
                                    </template>
                                </Select>
                                
                                <!-- 現在の設定状態表示 -->
                                <div v-if="slotProps.data.plan_key" class="text-xs text-gray-600">
                                    <div class="flex items-center gap-2">
                                        <span>現在の設定:</span>
                                        <span class="font-mono">{{ slotProps.data.plan_key }}</span>
                                        <Badge v-if="slotProps.data.is_mapped" 
                                               value="有効" 
                                               severity="success" 
                                               size="small" />
                                        <Badge v-else 
                                               value="無効" 
                                               severity="danger" 
                                               size="small" />
                                    </div>
                                </div>
                                
                                <!-- 推奨プラン表示 -->
                                <div v-if="!slotProps.data.mapping_error && slotProps.data.recommended_plans && slotProps.data.recommended_plans.length > 0" 
                                     class="text-xs text-blue-600">
                                    <div class="flex items-center gap-1">
                                        <i class="pi pi-lightbulb"></i>
                                        <span>推奨: {{ slotProps.data.recommended_plans[0].name }}</span>
                                    </div>
                                </div>
                                
                                <!-- エラーメッセージ表示 -->
                                <div v-if="slotProps.data.mapping_error && slotProps.data.error_message" 
                                     class="text-xs text-red-600 mt-1">
                                    <div class="flex items-center gap-1">
                                        <i class="pi pi-exclamation-triangle"></i>
                                        <span>{{ slotProps.data.error_message }}</span>
                                    </div>
                                </div>
                            </div>
                        </template>                        
                    </Column>
                    <Column header="状態" style="width: 100px;">
                        <template #body="slotProps">
                            <div class="flex flex-col gap-1">
                                <Badge v-if="slotProps.data.is_mapped" 
                                       value="設定済み" 
                                       severity="success" />
                                <Badge v-else-if="slotProps.data.mapping_error && slotProps.data.error_type === 'global_plan'" 
                                       value="グローバル専用" 
                                       severity="warning" />
                                <Badge v-else-if="slotProps.data.mapping_error" 
                                       value="エラー" 
                                       severity="danger" />
                                <Badge v-else 
                                       value="未設定" 
                                       severity="warning" />
                            </div>
                        </template>
                    </Column>                   
                </DataTable>
                <div class="mt-4 flex justify-between items-center">
                    <div class="text-sm text-gray-600">
                        <i class="pi pi-info-circle mr-1"></i>
                        未設定のプランは予約時に正しく処理されない可能性があります
                    </div>
                    <div class="flex items-center gap-2">
                        <span v-if="!hasChanges" class="text-xs text-gray-500">変更がありません</span>
                        <Button label="保存" severity="info" @click="savePlanMaster(planMaster)" :disabled="!hasChanges" />
                    </div>
                </div>
                
            </template>
            
        </Card>
    </div>
</template>
<script setup>
    // Vue
    import { ref, onMounted, computed, watch } from 'vue';

    const props = defineProps({        
        hotel_id: {
            type: [Number],
            required: true,
        },
    });

    // Stores
    import { useXMLStore } from '@/composables/useXMLStore';
    const { template, tlPlanMaster, fetchXMLTemplate, insertXMLResponse, fetchTLPlanMaster, insertTLPlanMaster } = useXMLStore();
    import { usePlansStore } from '@/composables/usePlansStore';
    const { hotelPlans, fetchHotelPlans } = usePlansStore();
    
    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import { Card, Select, Button, DataTable, Column, Badge } from 'primevue';

    // Master data
    const planMaster = ref(null);
    const roomTypes = ref(null);
    const originalPlanMaster = ref(null); // 変更検知用

    // 統計情報の計算
    const mappingStats = computed(() => {
        if (!planMaster.value) return { mapped: 0, unmapped: 0, errors: 0, globalErrors: 0 };
        
        const stats = planMaster.value.reduce((acc, plan) => {
            if (plan.mapping_error) {
                acc.errors++;
                if (plan.error_type === 'global_plan') { // global_hybridは除外
                    acc.globalErrors++;
                }
            } else if (plan.is_mapped) {
                acc.mapped++;
            } else {
                acc.unmapped++;
            }
            return acc;
        }, { mapped: 0, unmapped: 0, errors: 0, globalErrors: 0 });
        
        console.log('[OTA Plan Master] 統計情報:', stats);
        return stats;
    });

    // 変更検知
    const hasChanges = computed(() => {
        if (!planMaster.value || !originalPlanMaster.value) return false;
        
        const hasActualChanges = planMaster.value.some((plan, index) => {
            const original = originalPlanMaster.value[index];
            return original && plan.plan_key !== original.plan_key;
        });
        
        console.log('[OTA Plan Master] 変更検知:', {
            hasChanges: hasActualChanges,
            currentCount: planMaster.value?.length || 0,
            originalCount: originalPlanMaster.value?.length || 0
        });
        
        return hasActualChanges;
    });

    // プラン名の類似性チェック関数
    const calculateSimilarity = (str1, str2) => {
        if (!str1 || !str2) return 0;
        
        const s1 = str1.toLowerCase().replace(/[（）()]/g, '');
        const s2 = str2.toLowerCase().replace(/[（）()]/g, '');
        
        // 完全一致
        if (s1 === s2) return 1.0;
        
        // 部分一致チェック
        const keywords = ['素泊まり', '素泊り', '朝食', '2食', '3食', '食付き', 'キャンペーン'];
        let matchCount = 0;
        let totalKeywords = 0;
        
        keywords.forEach(keyword => {
            if (s1.includes(keyword) || s2.includes(keyword)) {
                totalKeywords++;
                if (s1.includes(keyword) && s2.includes(keyword)) {
                    matchCount++;
                }
            }
        });
        
        if (totalKeywords > 0) {
            return matchCount / totalKeywords;
        }
        
        // 文字レベルの類似性（簡易版）
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        
        if (longer.length === 0) return 1.0;
        
        let matches = 0;
        for (let i = 0; i < shorter.length; i++) {
            if (longer.includes(shorter[i])) matches++;
        }
        
        return matches / longer.length;
    };

    // 推奨プランの計算
    const getRecommendedPlans = (otaPlan, planList = null) => {
        const targetPlans = planList || hotelPlans.value;
        if (!targetPlans || !otaPlan.plangroupname) return [];
        
        console.log(`[OTA Plan Master] 推奨プラン計算中: ${otaPlan.plangroupname}`);
        
        const recommendations = targetPlans
            .map(plan => ({
                ...plan,
                similarity: calculateSimilarity(otaPlan.plangroupname, plan.name),
                display_name: `${plan.name} (${plan.plan_key})`,
                template_type: 'hotel' // ホテルプランのみなので固定
            }))
            .filter(plan => plan.similarity > 0.3) // 30%以上の類似性
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3); // 上位3件
        
        console.log(`[OTA Plan Master] 推奨プラン結果:`, recommendations);
        return recommendations;
    };

    // フィルタされたプランオプションの取得
    const getFilteredPlanOptions = (otaPlan) => {
        if (!hotelPlans.value) return [];
        
        console.log(`[OTA Plan Master] 全プラン数: ${hotelPlans.value.length}`);
        console.log(`[OTA Plan Master] 全プラン詳細:`, hotelPlans.value.map(p => ({
            name: p.name,
            plan_key: p.plan_key,
            plans_hotel_id: p.plans_hotel_id,
            plans_global_id: p.plans_global_id,
            id: p.id
        })));
        
        // より柔軟なホテルプランフィルタ
        const hotelOnlyPlans = hotelPlans.value.filter(plan => {
            // 条件1: plans_hotel_idが存在する
            const hasHotelId = !!plan.plans_hotel_id;
            
            // 条件2: plan_keyにホテルIDが含まれる（hXXX形式）
            const hasHotelInPlanKey = plan.plan_key && plan.plan_key.includes('h') && 
                                     plan.plan_key.split('h').length >= 2 && 
                                     plan.plan_key.split('h')[1] !== '';
            
            // 条件3: idが存在する（ホテルプランテーブルのレコード）
            const hasId = !!plan.id;
            
            // 除外条件: グローバルプランのみ（plans_global_idのみでplans_hotel_idがない）
            const isGlobalOnly = plan.plans_global_id && !plan.plans_hotel_id && 
                                 (!plan.plan_key || !plan.plan_key.includes('h') || 
                                  plan.plan_key.split('h')[1] === '');
            
            const shouldInclude = (hasHotelId || hasHotelInPlanKey || hasId) && !isGlobalOnly;
            
            console.log(`[OTA Plan Master] プランフィルタ判定: ${plan.name}`, {
                plan_key: plan.plan_key,
                hasHotelId,
                hasHotelInPlanKey,
                hasId,
                isGlobalOnly,
                shouldInclude,
                plans_hotel_id: plan.plans_hotel_id,
                plans_global_id: plan.plans_global_id
            });
            
            return shouldInclude;
        });
        
        console.log(`[OTA Plan Master] ホテルプランフィルタ結果:`, {
            全プラン数: hotelPlans.value.length,
            ホテルプラン数: hotelOnlyPlans.length,
            フィルタされたプラン: hotelOnlyPlans.map(p => ({ 
                name: p.name, 
                plan_key: p.plan_key, 
                hotel_id: p.plans_hotel_id, 
                global_id: p.plans_global_id,
                id: p.id
            }))
        });
        
        const recommended = getRecommendedPlans(otaPlan, hotelOnlyPlans);
        const recommendedKeys = new Set(recommended.map(p => p.plan_key));
        
        const allOptions = hotelOnlyPlans.map(plan => ({
            ...plan,
            display_name: `${plan.name} (${plan.plan_key})`,
            template_type: 'hotel', // すべてホテルプランなので固定
            is_recommended: recommendedKeys.has(plan.plan_key)
        }));
        
        // 推奨プランを先頭に配置
        const recommendedOptions = allOptions.filter(p => p.is_recommended);
        const otherOptions = allOptions.filter(p => !p.is_recommended);
        
        console.log(`[OTA Plan Master] 最終選択肢:`, {
            推奨プラン数: recommendedOptions.length,
            その他プラン数: otherOptions.length,
            合計: recommendedOptions.length + otherOptions.length
        });
        
        return [...recommendedOptions, ...otherOptions];
    };

    // 行のCSSクラス取得
    const getRowClass = (data) => {
        if (data.mapping_error) {
            if (data.error_type === 'global_plan') {
                return 'bg-purple-50'; // グローバルプラン専用のエラー
            }
            return 'bg-red-50'; // その他のエラー
        }
        if (!data.is_mapped) return 'bg-orange-50'; // 未設定
        return ''; // 正常
    };

    // プラン選択のCSSクラス取得
    const getPlanSelectClass = (data) => {
        if (data.mapping_error) {
            if (data.error_type === 'global_plan') {
                return 'border-purple-300'; // グローバルプラン専用のエラー
            }
            return 'border-red-300'; // その他のエラー
        }
        if (!data.is_mapped) return 'border-orange-300'; // 未設定
        return 'border-green-300'; // 正常
    };

    // プラン変更時の処理
    const onPlanChange = (otaPlan, event) => {
        console.log(`[OTA Plan Master] プラン変更: ${otaPlan.plangroupname} -> ${event.value}`);
        
        // マッピング状態を更新
        updatePlanMappingStatus(otaPlan);
        
        // 変更をログ出力
        const selectedPlan = hotelPlans.value.find(p => p.plan_key === event.value);
        if (selectedPlan) {
            console.log(`[OTA Plan Master] 選択されたプラン:`, selectedPlan);
        }
    };

    // plan_keyからIDを抽出する関数
    const extractIdsFromPlanKey = (planKey) => {
        if (!planKey) return { plans_global_id: null, plans_hotel_id: null };
        
        console.log(`[OTA Plan Master] plan_key解析: ${planKey}`);
        
        // plan_keyの形式: "1h1" (global_id=1, hotel_id=1) または "h169" (hotel_id=169のみ)
        const parts = planKey.split('h');
        
        let plans_global_id = null;
        let plans_hotel_id = null;
        
        if (parts.length === 2) {
            const globalPart = parts[0];
            const hotelPart = parts[1];
            
            // "h169" 形式の場合（globalPartが空文字列）
            if (globalPart === '' && hotelPart && !isNaN(parseInt(hotelPart))) {
                plans_hotel_id = parseInt(hotelPart);
                console.log(`[OTA Plan Master] h形式検出: hotel_id=${plans_hotel_id}`);
            }
            // "1h1" 形式の場合（両方に値がある）
            else if (globalPart && hotelPart) {
                if (!isNaN(parseInt(globalPart))) {
                    plans_global_id = parseInt(globalPart);
                }
                if (!isNaN(parseInt(hotelPart))) {
                    plans_hotel_id = parseInt(hotelPart);
                }
                console.log(`[OTA Plan Master] 複合形式検出: global_id=${plans_global_id}, hotel_id=${plans_hotel_id}`);
            }
        }
        
        const result = { plans_global_id, plans_hotel_id };
        console.log(`[OTA Plan Master] plan_key解析結果: ${planKey} -> `, result);
        
        return result;
    };

    // プランマッピング状態の更新
    const updatePlanMappingStatus = (otaPlan) => {
        if (!otaPlan.plan_key) {
            otaPlan.is_mapped = false;
            otaPlan.mapping_error = false;
            otaPlan.error_type = null;
            return;
        }
        
        // plan_keyからIDを抽出してグローバルプランかチェック
        const extractedIds = extractIdsFromPlanKey(otaPlan.plan_key);
        const isGlobalOnly = extractedIds.plans_global_id && !extractedIds.plans_hotel_id; // 〇h 形式（グローバルのみ）
        const isGlobalHybrid = extractedIds.plans_global_id && extractedIds.plans_hotel_id; // 〇h〇 形式（グローバル+ホテル）
        
        const matchingPlan = hotelPlans.value.find(plan => plan.plan_key === otaPlan.plan_key);
        
        // エラー判定の優先順位
        if (isGlobalOnly) {
            // 純粋なグローバルプラン（例：1h）- エラーとして扱う
            otaPlan.is_mapped = false;
            otaPlan.mapping_error = true;
            otaPlan.error_type = 'global_plan';
            otaPlan.error_message = 'グローバルプラン連携は非推奨です';
        } else if (!matchingPlan && otaPlan.plan_key) {
            // プランが見つからない
            otaPlan.is_mapped = false;
            otaPlan.mapping_error = true;
            otaPlan.error_type = 'not_found';
            otaPlan.error_message = 'プランが見つかりません';
        } else if (matchingPlan || isGlobalHybrid) {
            // 正常なマッピング（マッチングプランがある、またはグローバル+ホテルの組み合わせ）
            otaPlan.is_mapped = true;
            otaPlan.mapping_error = false;
            otaPlan.error_type = null;
            otaPlan.error_message = null;
            
            if (matchingPlan) {
                otaPlan.matched_plan_name = matchingPlan.name;
            }
            
            // plan_keyから正しいIDを抽出して設定
            otaPlan.extracted_global_id = extractedIds.plans_global_id;
            otaPlan.extracted_hotel_id = extractedIds.plans_hotel_id;
        } else {
            // その他
            otaPlan.is_mapped = false;
            otaPlan.mapping_error = false;
            otaPlan.error_type = null;
            otaPlan.error_message = null;
        }
        
        console.log(`[OTA Plan Master] マッピング状態更新:`, {
            otaPlan: otaPlan.plangroupname,
            planKey: otaPlan.plan_key,
            extractedIds: extractedIds,
            isGlobalOnly: isGlobalOnly,
            isGlobalHybrid: isGlobalHybrid,
            isMapped: otaPlan.is_mapped,
            hasError: otaPlan.mapping_error,
            errorType: otaPlan.error_type,
            errorMessage: otaPlan.error_message
        });
    };

    const savePlanMaster = async (data) => {
        console.log('[OTA Plan Master] 保存開始:', data);
        
        // デバッグ: extractIdsFromPlanKey関数のテスト
        console.log('[OTA Plan Master] extractIdsFromPlanKey テスト:');
        console.log('  "h169" ->', extractIdsFromPlanKey("h169"));
        console.log('  "1h1" ->', extractIdsFromPlanKey("1h1"));
        console.log('  "3h2" ->', extractIdsFromPlanKey("3h2"));
        
        // Filter out items with not int planGroupCode        
        const filteredData = data.filter(item => Number.isInteger(item.plangroupcode * 1));
        console.log('[OTA Plan Master] フィルタ後のデータ件数:', filteredData.length);
                
        const updatedFilteredData = filteredData.map(item => {
            // 特定のアイテムのみ詳細ログ（開始時点）
            if (item.plangroupcode === "11") {
                console.log(`[OTA Plan Master] 詳細ログ - アイテム11 開始:`, {
                    step: "savePlanMaster開始",
                    item_plans_hotel_id: item.plans_hotel_id,
                    item_extracted_hotel_id: item.extracted_hotel_id,
                    item_plan_key: item.plan_key
                });
            }
            
            const matchingPlan = hotelPlans.value.find(plan => plan.plan_key === item.plan_key);

            // plan_keyから正しいIDを抽出
            const extractedIds = extractIdsFromPlanKey(item.plan_key);
            
            // 特定のアイテムのみ詳細ログ（抽出後）
            if (item.plangroupcode === "11") {
                console.log(`[OTA Plan Master] 詳細ログ - アイテム11 抽出後:`, {
                    step: "extractIdsFromPlanKey実行後",
                    plan_key: item.plan_key,
                    extractedIds: extractedIds,
                    item_extracted_hotel_id: item.extracted_hotel_id,
                    条件2チェック: !!(item.plan_key && (extractedIds.plans_global_id || extractedIds.plans_hotel_id)),
                    条件3チェック: !!(item.extracted_hotel_id || item.extracted_global_id)
                });
            }
            
            // 最終的なIDの決定
            let finalGlobalId = null;
            let finalHotelId = null;
            
            if (matchingPlan) {
                // マッチングプランがある場合はそのIDを使用
                finalGlobalId = matchingPlan.plans_global_id;
                finalHotelId = matchingPlan.plans_hotel_id;
                
                console.log(`[OTA Plan Master] プラン連携成功:`, {
                    otaPlanName: item.plangroupname,
                    otaPlanCode: item.plangroupcode,
                    planKey: item.plan_key,
                    matchedPlan: matchingPlan.name,
                    planIds: {
                        global: finalGlobalId,
                        hotel: finalHotelId
                    }
                });
            } else if (item.plan_key && (extractedIds.plans_global_id || extractedIds.plans_hotel_id)) {
                // マッチングプランがないが plan_key から有効なIDを抽出できる場合
                finalGlobalId = extractedIds.plans_global_id;
                finalHotelId = extractedIds.plans_hotel_id;
                
                console.log(`[OTA Plan Master] プラン連携（IDを抽出）:`, {
                    otaPlanName: item.plangroupname,
                    otaPlanCode: item.plangroupcode,
                    planKey: item.plan_key,
                    extractedIds: extractedIds,
                    finalIds: {
                        global: finalGlobalId,
                        hotel: finalHotelId
                    }
                });
                
                if (item.plangroupcode === "11") {
                    console.log(`[OTA Plan Master] 詳細ログ - アイテム11:`, {
                        step: "条件2: plan_keyから抽出",
                        extractedIds: extractedIds,
                        finalGlobalId: finalGlobalId,
                        finalHotelId: finalHotelId,
                        typeof_finalHotelId: typeof finalHotelId
                    });
                }
            } else if (item.extracted_hotel_id || item.extracted_global_id) {
                // アイテム自体に抽出済みのIDがある場合（UIで計算済み）
                finalGlobalId = item.extracted_global_id;
                finalHotelId = item.extracted_hotel_id;
                
                console.log(`[OTA Plan Master] プラン連携（事前抽出済みIDを使用）:`, {
                    otaPlanName: item.plangroupname,
                    otaPlanCode: item.plangroupcode,
                    planKey: item.plan_key,
                    preExtractedIds: {
                        global: finalGlobalId,
                        hotel: finalHotelId
                    }
                });
                
                if (item.plangroupcode === "11") {
                    console.log(`[OTA Plan Master] 詳細ログ - アイテム11:`, {
                        step: "条件3: 事前抽出済みID使用",
                        sourceIds: {
                            extracted_global_id: item.extracted_global_id,
                            extracted_hotel_id: item.extracted_hotel_id,
                            typeof_extracted_hotel_id: typeof item.extracted_hotel_id
                        },
                        finalGlobalId: finalGlobalId,
                        finalHotelId: finalHotelId,
                        typeof_finalHotelId: typeof finalHotelId
                    });
                }
            } else if (!matchingPlan && item.extracted_hotel_id) {
                // 追加の安全策: extracted_hotel_idがあるが他の条件に引っかからない場合
                finalGlobalId = item.extracted_global_id;
                finalHotelId = item.extracted_hotel_id;
                
                if (item.plangroupcode === "11") {
                    console.log(`[OTA Plan Master] 詳細ログ - アイテム11:`, {
                        step: "条件4: 安全策でextracted_hotel_id使用",
                        extracted_hotel_id: item.extracted_hotel_id,
                        finalHotelId: finalHotelId
                    });
                }
            } else {
                console.warn(`[OTA Plan Master] プラン連携失敗:`, {
                    otaPlanName: item.plangroupname,
                    otaPlanCode: item.plangroupcode,
                    planKey: item.plan_key,
                    reason: item.plan_key ? 'IDを抽出できませんでした' : 'plan_keyがありません',
                    extractedIds: extractedIds,
                    itemExtractedIds: {
                        extracted_global_id: item.extracted_global_id,
                        extracted_hotel_id: item.extracted_hotel_id
                    }
                });
            }

            // 最終IDの確認ログ
            console.log(`[OTA Plan Master] ${item.plangroupcode} の最終ID決定:`, {
                finalGlobalId,
                finalHotelId,
                willSendGlobal: finalGlobalId,
                willSendHotel: finalHotelId
            });

            // 特定のアイテムのみ詳細ログ
            if (item.plangroupcode === "11") {
                console.log(`[OTA Plan Master] 詳細ログ - アイテム11:`, {
                    step: "最終ID確認",
                    finalGlobalId: finalGlobalId,
                    finalHotelId: finalHotelId,
                    typeof_finalGlobalId: typeof finalGlobalId,
                    typeof_finalHotelId: typeof finalHotelId,
                    willSendGlobal: finalGlobalId,
                    willSendHotel: finalHotelId
                });
                
                // 強制的にfinalHotelIdを設定（デバッグ用）
                if (!finalHotelId && item.extracted_hotel_id) {
                    console.log(`[OTA Plan Master] 強制修正 - アイテム11: finalHotelIdをextracted_hotel_idから設定`);
                    finalHotelId = item.extracted_hotel_id;
                }
            }

            // バックエンドに送信するデータを構築
            const backendData = {
                hotel_id: item.hotel_id,
                plangroupcode: item.plangroupcode,
                plangroupname: item.plangroupname,
                plan_key: item.plan_key || null,
                // 最終的に決定されたIDをバックエンドフィールドに設定
                plans_global_id: finalGlobalId,
                plans_hotel_id: finalHotelId
            };

            return {
                ...item,
                ...backendData,  // バックエンド用のデータで上書き
                // 検証フラグを追加
                is_mapped: !!matchingPlan || !!(finalGlobalId || finalHotelId),
                mapping_error: !matchingPlan && !!item.plan_key && !(finalGlobalId || finalHotelId),
                matched_plan_name: matchingPlan?.name || null,
                // デバッグ情報を追加（フロントエンド用）
                extracted_ids: extractedIds,
                has_extracted_ids: !!(extractedIds.plans_global_id || extractedIds.plans_hotel_id),
                final_global_id: finalGlobalId,
                final_hotel_id: finalHotelId,
                // バックエンドに送信される実際のデータを明示
                backend_payload: backendData
            };
        });
        
        // 保存前の検証結果をログ出力
        const validationResults = {
            total: updatedFilteredData.length,
            mapped: updatedFilteredData.filter(item => item.is_mapped).length,
            unmapped: updatedFilteredData.filter(item => !item.plan_key).length,
            errors: updatedFilteredData.filter(item => item.mapping_error).length,
            with_extracted_ids: updatedFilteredData.filter(item => item.has_extracted_ids).length,
            with_final_hotel_ids: updatedFilteredData.filter(item => item.final_hotel_id).length,
            with_final_global_ids: updatedFilteredData.filter(item => item.final_global_id).length
        };
        
        console.log('[OTA Plan Master] 保存前検証結果:', validationResults);
        
        // 最終的に送信されるデータの詳細ログ（重要なもののみ）
        const criticalItems = updatedFilteredData.filter(item => 
            item.plan_key && (item.final_hotel_id || item.final_global_id)
        );
        
        if (criticalItems.length > 0) {
            console.log('[OTA Plan Master] 送信される重要なデータ:');
            criticalItems.forEach(item => {
                console.log(`  ${item.plangroupcode} "${item.plangroupname}":`, {
                    plan_key: item.plan_key,
                    送信されるglobal_id: item.plans_global_id,
                    送信されるhotel_id: item.plans_hotel_id,
                    最終global_id: item.final_global_id,
                    最終hotel_id: item.final_hotel_id,
                    抽出されたIDs: item.extracted_ids
                });
            });
        }
        
        // 抽出されたIDの詳細ログ
        const itemsWithExtractedIds = updatedFilteredData.filter(item => item.has_extracted_ids);
        if (itemsWithExtractedIds.length > 0) {
            console.log('[OTA Plan Master] IDが抽出されたプラン:', itemsWithExtractedIds.map(item => ({
                name: item.plangroupname,
                code: item.plangroupcode,
                plan_key: item.plan_key,
                extracted: item.extracted_ids,
                final_global_id: item.final_global_id,
                final_hotel_id: item.final_hotel_id,
                送信global_id: item.plans_global_id,
                送信hotel_id: item.plans_hotel_id
            })));
        }
        
        // エラーがある場合は警告を表示
        if (validationResults.errors > 0) {
            const errorItems = updatedFilteredData.filter(item => item.mapping_error);
            console.error('[OTA Plan Master] マッピングエラーのあるプラン:', errorItems);
            
            toast.add({
                severity: 'warn',
                summary: '警告',
                detail: `${validationResults.errors}件のプランでマッピングエラーが発生しています。設定を確認してください。`,
                life: 5000
            });
        }
        
        // IDが抽出された場合の情報表示
        if (validationResults.with_extracted_ids > 0) {
            toast.add({
                severity: 'info',
                summary: '情報',
                detail: `${validationResults.with_extracted_ids}件のプランでplan_keyからIDを抽出しました。`,
                life: 4000
            });
        }
        
        try {
            // バックエンドに送信するデータをクリーンアップ（フロントエンド専用フィールドを除去）
            const cleanedDataForBackend = updatedFilteredData.map(item => {
                const cleanData = {
                    hotel_id: item.hotel_id,
                    plangroupcode: item.plangroupcode,
                    plangroupname: item.plangroupname,
                    plan_key: item.plan_key,
                    plans_global_id: item.plans_global_id,
                    plans_hotel_id: item.plans_hotel_id !== undefined ? item.plans_hotel_id : null // Ensure it's never undefined
                };
                
                // 各アイテムの詳細ログ（デバッグ用）
                if (item.plan_key) {
                    console.log(`[OTA Plan Master] アイテム ${item.plangroupcode} の処理:`, {
                        元のitem: {
                            plans_global_id: item.plans_global_id,
                            plans_hotel_id: item.plans_hotel_id,
                            extracted_global_id: item.extracted_global_id,
                            extracted_hotel_id: item.extracted_hotel_id,
                            final_global_id: item.final_global_id,
                            final_hotel_id: item.final_hotel_id
                        },
                        送信用cleanData: cleanData
                    });
                }
                
                return cleanData;
            });
            
            // 送信前の最終確認ログ
            console.log('[OTA Plan Master] バックエンドに送信するクリーンデータ:');
            cleanedDataForBackend.forEach(item => {
                if (item.plan_key) {
                    console.log(`  ${item.plangroupcode} "${item.plangroupname}":`, {
                        plan_key: item.plan_key,
                        plans_global_id: item.plans_global_id,
                        plans_hotel_id: item.plans_hotel_id
                    });
                }
            });
            
            // 実際に送信されるJSONを確認
            console.log('[OTA Plan Master] 送信JSON (全体):', JSON.stringify(cleanedDataForBackend, null, 2));
            
            // plans_hotel_idが含まれているかの確認
            const itemsWithHotelId = cleanedDataForBackend.filter(item => 'plans_hotel_id' in item);
            console.log('[OTA Plan Master] plans_hotel_idフィールドを持つアイテム数:', itemsWithHotelId.length);
            console.log('[OTA Plan Master] plans_hotel_idフィールドの値:', itemsWithHotelId.map(item => ({
                plangroupcode: item.plangroupcode,
                plans_hotel_id: item.plans_hotel_id,
                typeof: typeof item.plans_hotel_id
            })));
            
            // 特定のアイテム（plangroupcode: "11"）の詳細確認
            const targetItem = cleanedDataForBackend.find(item => item.plangroupcode === "11");
            if (targetItem) {
                console.log('[OTA Plan Master] 対象アイテム "11" の送信データ:', {
                    hotel_id: targetItem.hotel_id,
                    plangroupcode: targetItem.plangroupcode,
                    plangroupname: targetItem.plangroupname,
                    plan_key: targetItem.plan_key,
                    plans_global_id: targetItem.plans_global_id,
                    plans_hotel_id: targetItem.plans_hotel_id,
                    typeof_plans_hotel_id: typeof targetItem.plans_hotel_id,
                    is_null: targetItem.plans_hotel_id === null,
                    is_undefined: targetItem.plans_hotel_id === undefined,
                    has_plans_hotel_id_field: 'plans_hotel_id' in targetItem
                });
            }
            
            await insertTLPlanMaster(cleanedDataForBackend);
            
            // 成功時の詳細ログ
            console.log('[OTA Plan Master] 保存成功:', {
                保存件数: cleanedDataForBackend.length,
                成功件数: validationResults.mapped,
                エラー件数: validationResults.errors,
                ID抽出件数: validationResults.with_extracted_ids,
                最終hotel_id件数: validationResults.with_final_hotel_ids,
                最終global_id件数: validationResults.with_final_global_ids
            });
            
            toast.add({
                severity: 'success', 
                summary: '成功', 
                detail: `プランマスター保存されました。(${validationResults.mapped}/${validationResults.total}件が正常に紐づけされました)`, 
                life: 3000
            });
            
            // 元データを更新（変更検知用）
            originalPlanMaster.value = JSON.parse(JSON.stringify(planMaster.value));
            
        } catch (error) {
            console.error('[OTA Plan Master] 保存失敗:', error);
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: 'プランマスターの保存に失敗しました',
                life: 3000,
            });
        }
    };

    // Template    
    const templateName = 'NetPlanMasterSearchR2Service';
    const extractionProcedureCode = 0;
    const modifiedTemplate = ref(null);
    const fetchTemplate = async () => {
        console.log('[OTA Plan Master] テンプレート取得開始');
        
        await fetchXMLTemplate(props.hotel_id, templateName);
        modifiedTemplate.value = template.value.replace(
            `{{extractionProcedureCode}}`,
            extractionProcedureCode
        );

        const xmlResponse = await insertXMLResponse(props.hotel_id, templateName, modifiedTemplate.value);
        planMaster.value = parseXmlResponse(xmlResponse.data);

        console.log('[OTA Plan Master] 取得したOTAプラン:', planMaster.value);

        if (tlPlanMaster.value && planMaster.value) {
            planMaster.value.forEach((plan) => {
                const matchingTLPlan = tlPlanMaster.value.find(
                    (tlPlan) => tlPlan.rmtypecode === plan.rmtypecode && tlPlan.netrmtypegroupcode === plan.netrmtypegroupcode
                );
                if (matchingTLPlan) {
                    plan.room_type_id = matchingTLPlan.room_type_id;
                }
            });            
        }
        
        // 各プランの推奨プランと状態を設定
        if (planMaster.value && hotelPlans.value) {
            planMaster.value.forEach(plan => {
                plan.recommended_plans = getRecommendedPlans(plan);
                updatePlanMappingStatus(plan);
            });
        }
        
        console.log('[OTA Plan Master] プラン状態設定完了');
    };
    
    const parseXmlResponse = (data) => {
        const returnData = data['S:Envelope']['S:Body']['ns2:executeResponse']['return'];
        const planGroupList = returnData.planGroupList;        
        const plans = [];
        
        if (Array.isArray(planGroupList)) {
            planGroupList.forEach((item) => {
                plans.push({
                    hotel_id: props.hotel_id,
                    plangroupcode: item.planGroupCode,
                    plangroupname: item.planGroupName,
                    // 初期状態
                    is_mapped: false,
                    mapping_error: false,
                    recommended_plans: []
                });
            });
        }

        return plans;
    };

    // ホテルプランの変更を監視
    watch(hotelPlans, (newPlans) => {
        if (newPlans && planMaster.value) {
            console.log('[OTA Plan Master] ホテルプラン更新検知、状態を再計算');
            planMaster.value.forEach(plan => {
                plan.recommended_plans = getRecommendedPlans(plan);
                updatePlanMappingStatus(plan);
            });
        }
    }, { deep: true });
         

    onMounted(async () => {
        console.log('[OTA Plan Master] コンポーネント初期化開始');
        
        await fetchTLPlanMaster(props.hotel_id);
        planMaster.value = tlPlanMaster.value;

        await fetchHotelPlans(props.hotel_id);        
        
        console.log('[OTA Plan Master] 初期データ取得完了:', {
            otaPlans: planMaster.value?.length || 0,
            hotelPlans: hotelPlans.value?.length || 0
        });
        
        // 各プランの状態を初期化
        if (planMaster.value && hotelPlans.value) {
            planMaster.value.forEach(plan => {
                plan.recommended_plans = getRecommendedPlans(plan);
                updatePlanMappingStatus(plan);
            });
            
            // 元データを保存（変更検知用）
            originalPlanMaster.value = JSON.parse(JSON.stringify(planMaster.value));
        }
        
        console.log('[OTA Plan Master] 初期化完了');
    });

</script>
