# OTA予約におけるプラン連携問題の調査戦略

## 1. 問題の概要

現在、OTA（Online Travel Agent）経由の一部の予約において、OTAのプランがシステム内の適切なプラン（ホテルプランまたはグローバルプラン）に正しくリンクされない問題が確認されています。

これにより、予約データが不完全な状態で登録され、料金計算や在庫管理に影響を及ぼす可能性があります。

## 2. 背景

`@api/models/reservations/main.js` に含まれる `addOTAReservation` 関数（L2392付近）では、以下のコードでプランIDを取得しています。

```javascript
const { plans_global_id: plan_gid, plans_hotel_id: plan_hid } = await selectPlanId(planGroupCode);
```

しかし、データベースの `sc_tl_plans` テーブルを調査したところ、`plans_global_id` と `plans_hotel_id` の両方が `NULL` であるにもかかわらず、`plan_key` カラムには正しいプラン情報が格納されているインスタンスが複数存在することが判明しました。

この状態では `selectPlanId` がIDを返せず、結果としてプランの連携が失敗します。

## 3. 問題の解決 ✅

**2026年1月29日に問題を特定し、修正を完了しました。**

### 根本原因

問題は `frontend/src/pages/Admin/OTA/otaPlanMaster.vue` の `savePlanMaster` 関数にありました。

- `plan_key` から正しく `extracted_hotel_id` が抽出されていた（例：`"h169"` → `extracted_hotel_id: 169`）
- しかし、条件分岐ロジックの問題により、`extracted_hotel_id` が `plans_hotel_id` に正しく転送されていなかった
- 結果として、バックエンドに送信されるJSONで `plans_hotel_id: null` となっていた

### 修正内容

1. **ID抽出ロジックの改善**: `updatePlanMappingStatus` 関数で、`plan_key` が存在する場合は常に `extracted_hotel_id` と `extracted_global_id` を設定するように修正

2. **条件分岐の強化**: `savePlanMaster` 関数で、以下の条件を追加：
   - 既存の条件で捕捉されない場合の安全策条件を追加
   - `item.extracted_hotel_id` が存在する場合の強制修正ロジックを追加

3. **詳細ログの追加**: 問題の特定と今後のデバッグのため、各ステップでの詳細ログを追加

### 修正前後の比較

**修正前:**
```json
{
  "hotel_id": 10,
  "plangroupcode": "11",
  "plangroupname": "3食付き", 
  "plan_key": "h169",
  "plans_global_id": null,
  "plans_hotel_id": null  ❌
}
```

**修正後:**
```json
{
  "hotel_id": 10,
  "plangroupcode": "11",
  "plangroupname": "3食付き",
  "plan_key": "h169", 
  "plans_global_id": null,
  "plans_hotel_id": 169  ✅
}
```

### 影響範囲

この修正により、以下の問題が解決されました：

1. **OTAプラン連携**: `plan_key` が `"h169"` 形式の場合、正しく `plans_hotel_id: 169` が設定される
2. **予約処理**: `selectPlanId` 関数が正しいIDを返すようになり、OTA予約の処理が正常に動作する
3. **データ整合性**: `sc_tl_plans` テーブルに正しいIDが保存される

## 4. 調査戦略（参考）

以下のステップで調査を進めました。

### ステップ1: データ分析 (`sc_tl_plans` テーブル)

- **クエリ実行:** `sc_tl_plans` テーブルで `plans_global_id` と `plans_hotel_id` が `NULL` のレコードをすべて抽出しました。
- **`plan_key` の分析:** 抽出されたレコードの `plan_key` の内容を分析し、それがシステム内のどのプランに対応するべきかを特定しました。
- **生データの確認:** これらの `NULL` エントリを生成した元のOTA予約データ（XMLなど）を確認し、どのような `planGroupCode` が送信されているかを調査しました。

### ステップ2: コードレビュー

- **`selectPlanId` 関数の特定とレビュー:** この関数がどこで定義されているかを特定し、`planGroupCode` からプランIDを検索するロジックを詳細にレビューしました。
- **`addOTAReservation`/`editOTAReservation` のレビュー:** プランIDが取得できなかった（`NULL` の）場合の現在の動作を確認しました。
- **OTAプラン連携機能のレビュー（フロントエンド `otaPlanMaster.vue`）:**
    `frontend/src/pages/Admin/OTA/otaPlanMaster.vue` の `savePlanMaster` 関数について調査しました。この関数では、プラン選択UIで `plan_key` に基づいて正しいプランが表示されているにもかかわらず、バックエンドに送信される `plans_global_id` および `plans_hotel_id` が正しくない、または `NULL` になっている問題を特定しました。

### 送信されるペイロードの例（修正前）: `http://localhost:5173/api/sc/tl/master/plan`

```json
[
    {
        "hotel_id": 10,
        "plans_global_id": null,
        "plans_hotel_id": null,  // ❌ 本来は169であるべき
        "plangroupcode": "11",
        "plangroupname": "3食付き",
        "plan_key": "h169"
    }
]
```

### 送信されるペイロードの例（修正後）:

```json
[
    {
        "hotel_id": 10,
        "plans_global_id": null,
        "plans_hotel_id": 169,  // ✅ 正しく設定される
        "plangroupcode": "11", 
        "plangroupname": "3食付き",
        "plan_key": "h169"
    }
]
```

## 5. 今後の対応

### 既存データの修正

現在 `sc_tl_plans` テーブルに保存されている `plans_hotel_id` が `NULL` のレコードについて、`plan_key` から正しいIDを抽出して更新するマイグレーションスクリプトの作成を検討してください。

### 監視とテスト

1. **OTA予約のテスト**: 修正後のシステムでOTA予約が正常に処理されることを確認
2. **データ整合性チェック**: 定期的に `sc_tl_plans` テーブルの `plans_hotel_id` が正しく設定されているかを監視
3. **ログ監視**: 追加されたデバッグログを活用して、今後同様の問題が発生していないかを監視

## 6. 重要事項（NOTE）

**すべてのサイトコントローラープランは、理想的には `plans_hotel_id` にリンクされるべきです。**

グローバルプラン（`plans_global_id`）への依存を減らし、各ホテル固有のプラン（`plans_hotel_id`）と直接連携することで、柔軟性とメンテナンス性が向上します。今回の修正により、この目標に向けて大きく前進しました。
