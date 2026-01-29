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

## 3. 調査の目的

この問題の根本原因を特定し、恒久的な解決策を策定することを目的とします。具体的には、以下の2つの主要な疑いを検証します。

1.  **PMSとOTAのプラン連携機能自体の問題:** `sc_tl_plans` テーブルにレコードが作成・更新される時点で、IDの紐付けが失敗している可能性。
2.  **予約登録処理の問題:** `addOTAReservation` および `editOTAReservation` 関数が、IDが `NULL` の場合のフォールバック処理（例：`plan_key` を使用した再検索）を持っていない問題。

## 4. 調査戦略

以下のステップで調査を進めます。

### ステップ1: データ分析 (`sc_tl_plans` テーブル)

- **クエリ実行:** `sc_tl_plans` テーブルで `plans_global_id` と `plans_hotel_id` が `NULL` のレコードをすべて抽出します。
- **`plan_key` の分析:** 抽出されたレコードの `plan_key` の内容を分析し、それがシステム内のどのプランに対応するべきかを特定します。
- **生データの確認:** これらの `NULL` エントリを生成した元のOTA予約データ（XMLなど）を確認し、どのような `planGroupCode` が送信されているかを調査します。

### ステップ2: コードレビュー

- **`selectPlanId` 関数の特定とレビュー:** この関数がどこで定義されているかを特定し、`planGroupCode` からプランIDを検索するロジックを詳細にレビューします。
- **`addOTAReservation`/`editOTAReservation` のレビュー:** プランIDが取得できなかった（`NULL` の）場合の現在の動作を確認します。エラーとして処理されるのか、あるいは不完全なデータのまま進むのかを特定します。
- **OTAプラン連携機能のレビュー（フロントエンド `otaPlanMaster.vue`）:**
    `frontend/src/pages/Admin/OTA/otaPlanMaster.vue` の `savePlanMaster` 関数について調査します。この関数では、プラン選択UIで `plan_key` に基づいて正しいプランが表示されているにもかかわらず、バックエンドに送信される `plans_global_id` および `plans_hotel_id` が正しくない、または `NULL` になっている可能性があります。これにより、`sc_tl_plans` テーブルの `plans_global_id` および `plans_hotel_id` が正しく更新されない原因となっている可能性が考えられます。

### 送信されるペイロードの例: `http://localhost:5173/api/sc/tl/master/plan`

```json
[
    {
        "hotel_id": 10,
        "plans_global_id": null,
        "plans_hotel_id": null,
        "plangroupcode": "11",
        "plangroupname": "3食付き",
        "plan_key": "h169"
    },
    {
        "hotel_id": 10,
        "plans_global_id": null,
        "plans_hotel_id": null,
        "plangroupcode": "12",
        "plangroupname": "朝食無料",
        "plan_key": "h177"
    },
    {
        "hotel_id": 10,
        "plans_global_id": null,
        "plans_hotel_id": null,
        "plangroupcode": "13",
        "plangroupname": "3食付き（2名利用）",
        "plan_key": null
    },
    {
        "hotel_id": 10,
        "plans_global_id": 3,
        "plans_hotel_id": null,
        "plangroupcode": "14",
        "plangroupname": "●2食付き",
        "plan_key": "3h2"
    },
    {
        "hotel_id": 10,
        "plans_global_id": null,
        "plans_hotel_id": null,
        "plangroupcode": "15",
        "plangroupname": "●3食付き",
        "plan_key": "h169"
    },
    {
        "hotel_id": 10,
        "plans_global_id": 1,
        "plans_hotel_id": null,
        "plangroupcode": "16",
        "plangroupname": "●素泊まり",
        "plan_key": "1h1"
    },
    {
        "hotel_id": 10,
        "plans_global_id": 1,
        "plans_hotel_id": null,
        "plangroupcode": "17",
        "plangroupname": "●素泊まり",
        "plan_key": "1h1"
    },
    {
        "hotel_id": 10,
        "plans_global_id": 3,
        "plans_hotel_id": null,
        "plangroupcode": "18",
        "plangroupname": "●2食付き",
        "plan_key": "3h2"
    },
    {
        "hotel_id": 10,
        "plans_global_id": null,
        "plans_hotel_id": null,
        "plangroupcode": "19",
        "plangroupname": "●3食付き",
        "plan_key": "h169"
    },
    {
        "hotel_id": 10,
        "plans_global_id": 1,
        "plans_hotel_id": null,
        "plangroupcode": "1",
        "plangroupname": "素泊まり",
        "plan_key": "1h1"
    },
    {
        "hotel_id": 10,
        "plans_global_id": 3,
        "plans_hotel_id": null,
        "plangroupcode": "2",
        "plangroupname": "2食付き",
        "plan_key": "3h2"
    },
    {
        "hotel_id": 10,
        "plans_global_id": 1,
        "plans_hotel_id": null,
        "plangroupcode": "3",
        "plangroupname": "素泊まり",
        "plan_key": "1h1"
    },
    {
        "hotel_id": 10,
        "plans_global_id": 3,
        "plans_hotel_id": null,
        "plangroupcode": "4",
        "plangroupname": "2食付き",
        "plan_key": "3h2"
    },
    {
        "hotel_id": 10,
        "plans_global_id": null,
        "plans_hotel_id": null,
        "plangroupcode": "5",
        "plangroupname": "素泊り（2名利用）",
        "plan_key": "h9"
    },
    {
        "hotel_id": 10,
        "plans_global_id": null,
        "plans_hotel_id": null,
        "plangroupcode": "6",
        "plangroupname": "2食付き（2名利用）",
        "plan_key": "h10"
    },
    {
        "hotel_id": 10,
        "plans_global_id": 1,
        "plans_hotel_id": null,
        "plangroupcode": "7",
        "plangroupname": "キャンペーン",
        "plan_key": "1h1"
    },
    {
        "hotel_id": 10,
        "plans_global_id": 1,
        "plans_hotel_id": null,
        "plangroupcode": "8",
        "plangroupname": "キャンペーン",
        "plan_key": "1h1"
    },
    {
        "hotel_id": 10,
        "plans_global_id": null,
        "plans_hotel_id": null,
        "plangroupcode": "9",
        "plangroupname": "朝食無料",
        "plan_key": "h177"
    },
    {
        "hotel_id": 10,
        "plans_global_id": null,
        "plans_hotel_id": null,
        "plangroupcode": "10",
        "plangroupname": "3食付き",
        "plan_key": "h169"
        }
    ]
    
    ### レスポンスの例:
    
    ```json
    [
        {
            "hotel_id": 10,
            "plans_global_id": null,
            "plans_hotel_id": null,
            "plangroupcode": "11",
            "plangroupname": "3食付き",
            "plan_key": "h169"
        },
        {
            "hotel_id": 10,
            "plans_global_id": null,
            "plans_hotel_id": null,
            "plangroupcode": "12",
            "plangroupname": "朝食無料",
            "plan_key": "h177"
        },
        {
            "hotel_id": 10,
            "plans_global_id": null,
            "plans_hotel_id": null,
            "plangroupcode": "13",
            "plangroupname": "3食付き（2名利用）",
            "plan_key": null
        },
        {
            "hotel_id": 10,
            "plans_global_id": 3,
            "plans_hotel_id": null,
            "plangroupcode": "14",
            "plangroupname": "●2食付き",
            "plan_key": "3h2"
        },
        {
            "hotel_id": 10,
            "plans_global_id": null,
            "plans_hotel_id": null,
            "plangroupcode": "15",
            "plangroupname": "●3食付き",
            "plan_key": "h169"
        },
        {
            "hotel_id": 10,
            "plans_global_id": 1,
            "plans_hotel_id": null,
            "plangroupcode": "16",
            "plangroupname": "●素泊まり",
            "plan_key": "1h1"
        },
        {
            "hotel_id": 10,
            "plans_global_id": 1,
            "plans_hotel_id": null,
            "plangroupcode": "17",
            "plangroupname": "●素泊まり",
            "plan_key": "1h1"
        },
        {
            "hotel_id": 10,
            "plans_global_id": 3,
            "plans_hotel_id": null,
            "plangroupcode": "18",
            "plangroupname": "●2食付き",
            "plan_key": "3h2"
        },
        {
            "hotel_id": 10,
            "plans_global_id": null,
            "plans_hotel_id": null,
            "plangroupcode": "19",
            "plangroupname": "●3食付き",
            "plan_key": "h169"
        },
        {
            "hotel_id": 10,
            "plans_global_id": 1,
            "plans_hotel_id": null,
            "plangroupcode": "1",
            "plangroupname": "素泊まり",
            "plan_key": "1h1"
        },
        {
            "hotel_id": 10,
            "plans_global_id": 3,
            "plans_hotel_id": null,
            "plangroupcode": "2",
            "plangroupname": "2食付き",
            "plan_key": "3h2"
        },
        {
            "hotel_id": 10,
            "plans_global_id": 1,
            "plans_hotel_id": null,
            "plangroupcode": "3",
            "plangroupname": "素泊まり",
            "plan_key": "1h1"
        },
        {
            "hotel_id": 10,
            "plans_global_id": 3,
            "plans_hotel_id": null,
            "plangroupcode": "4",
            "plangroupname": "2食付き",
            "plan_key": "3h2"
        },
        {
            "hotel_id": 10,
            "plans_global_id": null,
            "plans_hotel_id": null,
            "plangroupcode": "5",
            "plangroupname": "素泊り（2名利用）",
            "plan_key": "h9"
        },
        {
            "hotel_id": 10,
            "plans_global_id": null,
            "plans_hotel_id": null,
            "plangroupcode": "6",
            "plangroupname": "2食付き（2名利用）",
            "plan_key": "h10"
        },
        {
            "hotel_id": 10,
            "plans_global_id": 1,
            "plans_hotel_id": null,
            "plangroupcode": "7",
            "plangroupname": "キャンペーン",
            "plan_key": "1h1"
        },
        {
            "hotel_id": 10,
            "plans_global_id": 1,
            "plans_hotel_id": null,
            "plangroupcode": "8",
            "plangroupname": "キャンペーン",
            "plan_key": "1h1"
        },
        {
            "hotel_id": 10,
            "plans_global_id": null,
            "plans_hotel_id": null,
            "plangroupcode": "9",
            "plangroupname": "朝食無料",
            "plan_key": "h177"
        },
        {
            "hotel_id": 10,
            "plans_global_id": null,
            "plans_hotel_id": null,
            "plangroupcode": "10",
            "plangroupname": "3食付き",
            "plan_key": "h169"
        }
    ]
    ```
    
    **注:** 上記のペイロードの例では、`"plan_key": "h169"` が送信されているにもかかわらず、`"plans_hotel_id": null` となっています。これは、正しくは `"plans_hotel_id": 169` となるべきです。この不一致が問題の核心であると考えられます。
    
    - **OTAプラン連携機能のレビュー（バックエンド）:** `sc_tl_plans` テーブルを更新している箇所（OTAからのプラン情報を同期する機能）を特定します。なぜIDが `NULL` のままレコードが保存されるのか、マッチングロジックに問題がないかを確認します。

### ステップ3: 仮説の検証

- **仮説A（連携機能の問題）:** プラン同期のロジックが、一部のOTAプランをシステム内のプラン（特にホテルプラン）と正しく紐付けられていない。
- **仮説B（予約処理の問題）:** 予約登録時のロジックが厳格すぎ、IDが見つからない場合に `plan_key` を使って再検索するような柔軟性を持っていない。

## 5. 解決策の提案

調査結果に基づき、以下のいずれか、または両方の解決策を検討します。

- **案1（根本解決）:** OTAプラン連携機能を修正します。`sc_tl_plans` にデータを保存する際に、必ず `plans_hotel_id` または `plans_global_id` がリンクされるようにマッチングロジックを改善します。手動でのマッピング補助機能なども検討します。
- **案2（暫定・フォールバック対応）:** `addOTAReservation` および `editOTAReservation` を修正します。`selectPlanId` でIDが取得できなかった場合、`plan_key` を使用して `plans` テーブルを再検索し、該当するプラン情報を取得するフォールバック処理を追加します。
- **案3（データ修正）:** `sc_tl_plans` の更新に問題がある場合、既存の不正確なデータを修正するためのマイグレーションファイルを作成し、現在の在庫を修正します。

## 6. 重要事項（NOTE）

**すべてのサイトコントローラープランは、理想的には `plans_hotel_id` にリンクされるべきです。**

グローバルプラン（`plans_global_id`）への依存を減らし、各ホテル固有のプラン（`plans_hotel_id`）と直接連携することで、柔軟性とメンテナンス性が向上します。したがって、長期的には **案1（根本解決）** を目指すことが望ましいです。
