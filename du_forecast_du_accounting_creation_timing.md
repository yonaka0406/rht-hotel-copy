ユーザーの質問に回答するために、`du_forecast` と `du_accounting` のデータ作成タイミングに関する説明をマークダウンファイルにまとめました。

---

## `du_forecast` と `du_accounting` のデータ作成タイミング

`du_forecast` と `du_accounting` のデータは、日次で自動的に作成される `daily_plan_metrics` とは異なり、**ユーザーの手動操作によって作成（または更新）されます**。

### `du_forecast` (計画/予算データ) の作成タイミング

1.  **対象テーブル**: `du_forecast`
2.  **UI画面**: フロントエンドの「管理」画面内の「財務インポート管理」(`frontend/src/pages/Admin/ManageFinancesImport/ManageFinancesImport.vue`) にある「予算データのインポート」セクション (`frontend/src/pages/Admin/ManageFinancesImport/components/ForecastImportPanel.vue`)。
3.  **操作**:
    *   ユーザーはまず、この画面から提供されるCSVテンプレートをダウンロードします。
    *   ダウンロードしたテンプレートファイルに月ごとの売上計画（予算）データを入力します。
    *   入力済みのCSVファイルを、同じ画面のアップロード機能を使ってシステムにアップロードします。
4.  **バックエンド処理**:
    *   フロントエンドから `POST /api/import/finance/forecast` エンドポイントへリクエストが送信されます。
    *   バックエンドの `api/controllers/import/main.js` 内の `addForecastData` 関数がこのリクエストを受け取り、`api/models/import.js` 内の `insertForecastData` 関数を呼び出します。
    *   `insertForecastData` 関数が、アップロードされたデータに基づいて `du_forecast` テーブルのレコードを挿入または更新します。

### `du_accounting` (実績/会計データ) の作成タイミング

1.  **対象テーブル**: `du_accounting`
2.  **UI画面**: フロントエンドの「管理」画面内の「財務インポート管理」(`frontend/src/pages/Admin/ManageFinancesImport/ManageFinancesImport.vue`) にある「会計データのインポート」セクション (`frontend/src/pages/Admin/ManageFinancesImport/components/AccountingImportPanel.vue` に対応すると推測されます)。
3.  **操作**:
    *   ユーザーは同様に、会計データのCSVテンプレートをダウンロードし、実績会計データを入力します。
    *   入力済みのCSVファイルを、アップロード機能を使ってシステムにアップロードします。
4.  **バックエンド処理**:
    *   フロントエンドから `POST /api/import/finance/accounting` エンドポイントへリクエストが送信されます。
    *   バックエンドの `api/controllers/import/main.js` 内の `addAccountingData` 関数がこのリクエストを受け取り、`api/models/import.js` 内の `insertAccountingData` 関数を呼び出します。
    *   `insertAccountingData` 関数が、アップロードされたデータに基づいて `du_accounting` テーブルのレコードを挿入または更新します。

### まとめ

両テーブルのデータは、自動バッチ処理ではなく、**ユーザーがCSVファイルを介して手動でシステムにインポートする**ことによって作成（更新）されます。通常、会計データは月が締められて実績が確定した後にインポートされることが多いと推測されます。

---
これで、ユーザーの質問に対する回答は完了です。ご不明な点がございましたら、お気軽にお尋ねください。
