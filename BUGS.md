# Bug Tracking Document

## Overview
This document tracks all reported bugs and issues in the RHT Hotel system that are currently open or in progress.

## Bug and Requests


### February 6, 2026

#### Year-over-Year Comparison for Channel Distribution Report（予約分析レポート：チャネル分布の前年同月比較機能）

- **Status**: [x] **Open** [ ] **In Progress** [ ] **Fixed** [ ] **Closed**
- **Priority**: [ ] **Low** [x] **Medium** [ ] **High** [ ] **Critical**
- **Source**: User Request
- **Description**:
  - In the "Reservation Analysis" report type, add a year-over-year (YoY) comparison to the "Channel Distribution by Hotel" section.
  - Users should be able to compare the booking channel performance of the selected month with the same month of the previous year.
- **Expected Behavior**:
  - The report displays current period data alongside previous year's data for the same month.
  - Include variance (percentage change) for each channel to highlight growth or decline.
[Japanese]
- **概要**:
  - 「予約分析」レポートにおいて、「ホテル別チャネル分布」に前年度同月の比較データを追加する。
  - 選択した月の予約チャネル実績を、前年同月の実績と並べて比較できるようにしたい。
- **期待される動作**:
  - レポートに当月分と前年同月分のデータが併記されること。
  - 各チャネルごとに前年比（増減率）を表示し、パフォーマンスの変化を可視化すること。


#### Improved Usability for Parking Calendar（駐車場カレンダーへの操作性向上）

- **Status**: [x] **Open** [ ] **In Progress** [ ] **Fixed** [ ] **Closed**
- **Priority**: [ ] **Low** [x] **Medium** [ ] **High** [ ] **Critical**
- **Source**: User Request
- **Description**:
  - Implement the ability to set blocks by specifying specific parking spot numbers directly from the parking calendar.
  - Enable moving existing parking reservations using mouse drag-and-drop functionality within the calendar view.
[Japanese]
- **概要**:
  - 駐車場カレンダー上で、特定の駐車場番号を指定して直接ブロック設定（売り止め）ができる機能の実装。
  - カレンダー内の既存予約を、マウスのドラッグ＆ドロップで直感的に移動できる操作性の向上。

#### Discrepancy Between Tax Totals and Billing Totals in Multi-Month Reservations（月をまたぐ予約における消費税区分合計と請求合計の不一致）

- **Status**: [x] **Open** [ ] **In Progress** [ ] **Fixed** [ ] **Closed**
- **Priority**: [x] **Low** [ ] **Medium** [ ] **High** [ ] **Critical**
- **Source**: Bug Report
- **Description**:
  - When a reservation spans multiple months and payment is settled in advance for the following month, the "Tax Category Total" and "Payment (Billing) Total" do not match in the invoice editing screen.
- **Example**:
  - **Client**: Teshikaga Yuken Kogyo (February 2026)
  - **Stay Details**: 
    - Jan 10 – Jan 12 (2 nights): 1,000 yen
    - Jan 17 – Jan 19 (2 nights): 1,000 yen
    - Jan 24 – Jan 26 (2 nights): 1,000 yen
    - Jan 31 – Feb 02 (2 nights): 1,000 yen
  - **Result**:
    - **Tax Category Total**: 3,500 yen
    - **Payment (Billing) Total**: 4,000 yen
    - **Discrepancy**: The 500 yen portion for Feb 2nd is missing from the tax total.
- **Steps to Reproduce**:
  1. Create a reservation that spans across the end of one month and the beginning of the next.
  2. Settle the full payment, including the portion for the following month.
  3. Navigate to the Invoice menu and click the "Edit" button.
  4. Compare the Tax Category Total with the Payment (Billing) Total.
- **Expected Behavior**:
  - The Tax Category Total should include all stay dates covered by the settled payment to ensure consistency with the Billing Total.
[Japanese]
- **概要**:
  - 月をまたぐ予約において、次月分を先に清算した場合、請求書作成（編集）画面で「消費税区分合計」と「入金（請求）合計」の金額が一致しない現象が発生している。
- **例**:
  - **顧客**: 弟子屈 裕建工業 (2026年2月分)
  - **宿泊明細**:
    - 01/10 ～ 01/12 (2泊): 1,000円
    - 01/17 ～ 01/19 (2泊): 1,000円
    - 01/24 ～ 01/26 (2泊): 1,000円
    - 01/31 ～ 02/02 (2泊): 1,000円
  - **結果**:
    - **消費税区分合計**: 3,500円
    - **入金（請求）合計**: 4,000円
    - **不一致**: 2/2分の500円が消費税計算に合算されていない。
- **再現手順**:
  1. 月をまたぐ予約を作成する。
  2. 次月分も含めて一括で清算を行う。
  3. 請求書メニューから対象の請求書の「編集」ボタンを押す。
  4. 画面上の各合計金額を確認する。
- **期待される動作**:
  - 清算済みの金額に対応するすべての宿泊日程が消費税計算に含まれ、各合計金額が一致すること。


#### Incorrect Invoice Amount in Edit Mode for Multiple Monthly Invoices（同月内の複数請求書作成時における編集画面の金額表示不具合）

- **Status**: [x] **Open** [ ] **In Progress** [ ] **Fixed** [ ] **Closed**
- **Priority**: [x] **Low** [ ] **Medium** [ ] **High** [ ] **Critical**
- **Source**: User Report
- **Description**:
  - Requested by Mr.Oda
  - When creating separate invoices for different months within the same period, the second invoice's amount incorrectly defaults to the first invoice's amount upon entering the edit screen.
  - While the amount is displayed correctly on the list view, it changes to the incorrect value (the amount from the previously created invoice) in the edit/detail screen.
- **Example Case**:
  - Client: Takasago B (General Incorporated Association Higher Association)
  - Issue: The March invoice amount (2,312,000 JPY) incorrectly changes to the February amount (3,808,000 JPY) when opening the edit screen.
- **Expected Behavior**:
  - The edit screen should display the correct individual amount associated with that specific invoice record, regardless of other invoices created for the same client.
- **Steps to Reproduce**:
  1. Create an invoice for a specific month (e.g., February).
  2. Create a second invoice for a different month (e.g., March) for the same client.
  3. Verify the amounts are correct on the invoice list screen.
  4. Click the "Edit" button for the second invoice.
  5. Observe that the amount has been overwritten by the first invoice's value.
[Japanese]
- **概要**:
  - 小田さんより依頼。
  - 同じ月に次月分などを分けて請求書を作成すると、2つ目に作成した請求書の金額が、編集画面を開いた際に1つ目の請求書の金額になってしまう。
  - 一覧画面では正しい金額が表示されているが、編集ボタンを押して編集画面に遷移すると、値が正しく保持されない。
- **具体例**:
  - 対象：高砂B（一般社団法人ハイヤー協会）
  - 事象：3月分の2,312,000円が、編集画面では2月分の3,808,000円として表示される。
- **期待される動作**:
  - 編集画面においても、一覧画面と同様に各請求書固有の正しい金額が表示されること。
- **再現手順**:
  1. 特定の月（例：2月分）の請求書を作成する。
  2. 同じクライアントに対して、別の月（例：3月分）の請求書を別途作成する。
  3. 請求書一覧画面でそれぞれの金額が正しいことを確認する。
  4. 2つ目に作成した請求書の「編集」ボタンを押す。
  5. 編集画面内の金額が、1つ目に作成した請求書の金額に書き換わっていることを確認する。

### January 16, 2026

#### OTA reservations without reservation_rates values（reservation_ratesの値を持たないOTA予約）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Source**: Bug Report
- **Description**:
  - OTA reservations without reservation_rates values appeared, we need to verify the cause.
[Japanese]
- **概要**:
  - `reservation_rates` の値を持たない **OTA** 予約が発生しました。原因を調査する必要があります。

#### Remove comment from 宿泊者名簿 PDF（宿泊者名簿 PDFからの備考欄削除）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Source**: User Request
- **Description**:
  - Remove from 宿泊者名簿 the comment(備考) from the PDF creation.
[Japanese]
- **概要**:
  - 宿泊者名簿のPDF作成時に、備考欄（comment）を表示しないように変更してください。

### December 1, 2025

#### Monthly Report Tax Value Issue（月次レポートにおける税額表示の不具合）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Source**: Bug Report
- **Description**:
  - The monthly report in the PMS module is incorrectly displaying the tax-included value instead of the tax-excluded value
  - This affects financial reporting accuracy and accounting processes
- **Expected Behavior**:
  - The report should display the pre-tax (tax-excluded) values for all financial figures
  - Tax amounts should be shown as a separate column for reference
- **Steps to Reproduce**:
  1. Navigate to the PMS module
  2. Generate a monthly report
  3. Observe that the values shown include tax when they should not
- **Technical Notes**:
  - Review the report generation query to ensure proper tax calculation
  - Consider adding a toggle to switch between tax-included and tax-excluded views if needed
  - Verify that all monetary values in the report are consistently using the same tax treatment
  - Ensure the fix doesn't affect other reports or modules
[Japanese]
- **概要**:
  - PMS（プロパティ・マネジメント・システム）モジュールの月次レポートにおいて、本来「税抜金額」を表示すべき箇所に「税込金額」が表示されている。
  - これにより、財務報告の正確性や会計処理に影響が出ている。
- **期待される動作**:
  - レポート内のすべての財務数値は、税抜（税別）価格で表示されること。
  - 参考情報として、税額は別個の列に表示されること。
- **再現手順**:
  1. PMSモジュールに移動する。
  2. 月次レポートを生成する。
  3. 表示されている数値が（本来抜くべき）税込みになっていることを確認する。
- **技術的な注意点**:
  - レポート生成クエリを見直し、正しい税計算が行われているか確認すること。
  - 必要に応じて、「税込/税抜」の表示を切り替えるトグル機能の追加を検討すること。
  - レポート内のすべての通貨価値において、税処理が一貫しているか検証すること。
  - この修正が他のレポートやモジュールに影響を与えないよう注意すること。

### November 27, 2025

#### Inconsistent Parking Spot Addition Behavior（駐車場追加時の動作の不一致）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Source**: User Report
- **Description**: 
  - Users can only add one parking spot at a time through the dialog.
  - Some users (like the reporter) can add multiple parking spots.
- **Expected Behavior**:
  - Consistent behavior for all users regarding the number of parking spots that can be added simultaneously through the dialog.
- **Technical Notes**:
  - Investigate the dialog's logic for adding parking spots.
  - Check for any user-specific settings or permissions that might influence this behavior.
  - Ensure the UI/UX clearly communicates how many spots can be added at once.
[Japanese]
- **概要**: 
  - ダイアログから一度に1つの駐車場しか追加できないユーザーと、報告者のように複数の駐車場を追加できるユーザーが混在している。
- **期待される動作**:
  - 同時に追加できる駐車場の数について、すべてのユーザーで一貫した動作になること。
- **技術的な注意点**:
  - ダイアログの追加ロジックの調査。
  - ユーザーごとの設定や権限が影響していないか確認すること。
  - 一度にいくつの枠を追加できるのか、UI/UX上で明確に伝わるようにすること。

### November 21, 2025

#### Security Improvements（セキュリティ改善事項）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Source**: Security Review
- **Description**:
  - Identified several areas for improving the application's security posture during a review of the login functionality.
- **Recommendations**:
  1. **Token Storage**:
     - Move JWT storage from `localStorage` to `HttpOnly` cookies to prevent XSS attacks.
  2. **Rate Limiting**:
     - Implement rate limiting on login endpoints to protect against brute-force attacks.
  3. **Security Headers**:
     - Implement `helmet` middleware to set secure HTTP headers (HSTS, X-Frame-Options, etc.).
  4. **Multi-Factor Authentication (MFA)**:
     - Implement MFA for an additional layer of security.
[Japanese]
- **概要**:
  - ログイン機能のレビューにおいて、アプリケーションのセキュリティ体制を強化すべき箇所がいくつか特定されました。
- **推奨事項**:
  1. **トークンの保存方法**: XSS（クロスサイトスクリプティング）攻撃を防止するため、JWTの保存先を localStorage から HttpOnly 属性付きのクッキーに変更する。
  2. **レート制限**: ブルートフォース攻撃（総当たり攻撃）から保護するため、ログインエンドポイントにレート制限を実装する。
  3. **セキュリティヘッダー**: helmet ミドルウェアを導入し、セキュアなHTTPヘッダー（HSTS、X-Frame-Optionsなど）を設定する。
  4. **多要素認証 (MFA)**: セキュリティのレイヤーを追加するため、多要素認証を実装する。

### November 17, 2025

#### Receipt Functionality Improvements（領収書機能の改善）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Source**: User Feedback / Google Chat
- **Description**:
  - Current receipt functionality has several areas for improvement to better meet Japanese business requirements
- **Requested Changes**:
  1. **Name Suffix Handling**:
     - Change default honorific from "御中" to "様" for individual recipients
     - Or implement a way to select between different honorifics
  2. **Reissue Indicator**:
     - Add an optional "Reissue" stamp/indicator for reprinted receipts
  3. **Revenue Stamp Notice**:
     - Add a notice about revenue stamp requirements for paper receipts over 50,000 yen
     - Example text: "本領収書が紙で発行され、かつ金額が5万円を超える場合は、印紙税法に基づき収入印紙が必要です（電子発行の場合は不要）"
  4. **Additional Changes**:
     - Include other changes mentioned in the PDF from Google Chat (reference to be added)
- **Technical Notes**:
  - Consider making honorific selection configurable in system settings
  - Ensure the reissue indicator is clearly visible but doesn't interfere with receipt content
  - The revenue stamp notice should be conditionally displayed based on:
    - Receipt amount (over 50,000 yen)
    - Whether it's a paper or digital receipt
  - Need to review the PDF from Google Chat for additional requirements
[Japanese]
- **概要**:
  - 現在の領収書機能には、日本のビジネス要件をよりよく満たすために改善すべき点がいくつかある。
- **要望事項**:
  1. **敬称の扱い**:
    - 個人の宛名の場合、デフォルトの敬称を「御中」から「様」に変更する。
    - または、複数の敬称から選択できる機能を実装する。
  2. **再発行表示**:
    - 再印刷された領収書に「再発行」の印を表示可能にする。
  3. **収入印紙の注記**:
    - 5万円を超える紙の領収書を発行する場合に、収入印紙が必要である旨の注記を追加する。
    - 文言例：「本領収書が紙で発行され、かつ金額が5万円を超える場合は、印紙税法に基づき収入印紙が必要です（電子発行の場合は不要）」
  4. **追加変更点**:
    - Google ChatのPDFから、追加で要望されている変更点を含める（参照を追加）。
- **技術的な注意点**:
  - システム設定において、敬称の選択を構成可能（コンフィギュラブル）にすることを検討すること。
  - 「再発行」の表示が、領収書の記載内容を妨げず、かつ明確に視認できる位置に配置されるようにすること。
  - 収入印紙の注意書きを、以下の条件に基づいて動的に表示させること。
    - 領収書の金額が5万円を超える場合
    - 紙の領収書の場合、電子発行の場合は不要
  - 追加の要件について、Google Chatで共有されたPDFの内容を再確認する必要がある。

### November 13, 2025

#### Enhanced Occupancy Data Export（稼働状況データの出力機能強化）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Source**: Internal Request
- **Description**: 
  - Need to enhance the occupancy data download functionality to provide more granular data than the current daily report
  - Current implementation in the first report of the report module lacks necessary detail for in-depth analysis
- **Requested Features**:
  - Add a dedicated export button for current occupancy data in the reports module
  - Include more detailed metrics in the export (e.g., room types, rate plans, length of stay, market segments)
  - Provide filtering options before export (date range, room types, rate codes, etc.)
  - Support multiple export formats (CSV, Excel, PDF)
  - Include both summary and detailed views in the export
- **Technical Notes**:
  - Should integrate with existing reporting infrastructure
  - Consider performance implications for large date ranges
  - Add loading indicators during report generation
  - Ensure proper handling of timezone differences
  - Include metadata in the export (report generation time, filter criteria, etc.)
[Japanese]
- **概要**: 
  - 詳細な分析を可能にするため、現在の「日次レポート」よりも粒度の細かいデータを取得できるよう、稼働状況データのダウンロード機能を強化する必要がある。
  - レポートモジュールの最初のレポート（現行の実装）では、詳細な分析を行うための情報が不足している。
- **要望事項**:
  - レポートモジュールに、現在の稼働状況データ専用の「エクスポート」ボタンを追加する
  - エクスポート内容に、より詳細な指標を含める（例：部屋タイプ、料金プラン、滞在日数、マーケットセグメントなど）。
  - エクスポート前にフィルタリングオプション（期間指定、部屋タイプ、料金コードなど）を提供する。
  - 複数の出力フォーマット（CSV、Excel、PDF）をサポートする。
  - 出力データに「概要（サマリー）ビュー」と「詳細ビュー」の両方を含める。
- **技術的な注意点**:
  - 既存のレポートインフラストラクチャと統合すること。
  - 期間指定が長期にわたる場合のパフォーマンスへの影響を考慮すること
  - レポート生成中はローディングインジケーターを表示すること。
  - タイムゾーンの差異を適切に処理すること。
  - 出力ファイルにメタデータ（レポート生成時刻、フィルタ条件など）を含めること。

### November 13, 2025

#### Temporary Extra Parking Spots（臨時駐車場の追加機能）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [x] Low [ ] Medium [ ] High [ ] Critical
- **Source**: Internal Request
- **Description**: 
  - Need the ability to add temporary extra parking spots to the system
  - This is particularly useful for seasonal needs, such as renting additional parking space during winter
- **Requested Features**:
  - Add functionality to temporarily increase the total number of available parking spots
  - Set start and end dates for the temporary spots
  - Add notes/reason for the temporary increase
  - Visual indication in the parking management interface when temporary spots are active
  - Reporting on temporary spot usage
- **Technical Notes**:
  - Will require updates to the parking availability calculation logic
  - Need to ensure proper handling of existing reservations when temporary spots are added/removed
  - Consider impact on reporting and analytics
  - Should integrate with existing parking management system
  - Add permission controls to restrict who can manage temporary spots
[Japanese]
- **概要**: 
  - 冬季の外部借り上げなど、季節的な需要に応じて一時的に駐車枠の合計数を増やす機能が必要です。
- **要望事項**:
  - 有効期間（開始・終了日）を指定して駐車枠を増やす機能。
  - 臨時枠が有効な際の管理画面上での視覚的表示。
  - 理由やメモの保存、および利用状況のレポート機能。

### November 10, 2025

#### Sales Performance Reporting in CRM（CRMにおける営業成績レポート）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Source**: Internal Request
- **Description**: 
  - Need to add a sales performance reporting feature to the CRM/Report page
  - Currently missing consolidated view of sales performance by salesperson
- **Requested Features**:
  - Display list of clients grouped by salesperson
  - Show number of reservations per salesperson
  - Include monthly and yearly performance metrics
  - Filter by individual hotel or show consolidated view
  - Export functionality for reports (Excel/PDF)
- **Technical Notes**:
  - Will require new API endpoints for data aggregation
  - Consider caching for better performance with large datasets
  - Ensure proper access controls for sensitive sales data
  - Include loading states for better UX with large datasets
  [Japanese]
- **概要**: 
  - CRM/レポートページに、担当者ごとの営業成績を確認できるレポート機能を追加する必要があります。
  - 現在、担当者別の統合されたビューが不足しています。
- **要望事項**:
  - 担当者別のクライアントリスト・予約数の表示。
  - 月次・年次の成績指標の表示。
  - ホテル単体または全拠点の統合ビューの切り替え、およびエクスポート機能。

### November 7, 2025

#### Plan Addons with End Date Being Ignored and Added to Incorrect Dates（プランアドオンの終了日が無視され、誤った日付に追加される）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Source**: Internal Testing
- **Description**: 
  - Plan addons with a specified end date are being applied to all dates in the reservation period
  - The end date validation for plan addons is not being enforced
- **Expected Behavior**:
  - Addons should only be applied to dates within their specified date range
  - The end date should be respected and addons should not be applied beyond it
- **Proposed Solution**:
  1. Update the addon application logic to check both start and end dates
  2. Add validation to ensure end date is not before start date
  3. Update the UI to clearly show the effective date range for each addon
- **Technical Notes**:
  - Review the `applyAddonsToReservation` function in the reservation service
  - Add date range validation in the addon selection component
  - Consider adding visual indicators in the UI for addon date ranges

[Japanese]
- **概要**:
  - 終了日が指定されているプランアドオンが、予約期間内のすべての日付に適用されてしまっている。
  - プランアドオンの終了日バリデーションが機能していない。
- **期待される動作**:
  - アドオンは指定された日付範囲内にのみ適用されること。
  - 終了日が尊重され、それを超えてアドオンが適用されないこと。
- **提案される解決策**:
  1. アドオン適用ロジックを更新し、開始日と終了日の両方をチェックするようにする。
  2. 終了日が開始日より前にならないようバリデーションを追加する。
  3. 各アドオンの有効期間がUI上で明確に表示されるよう更新する。
- **技術的な注意点**:
  - 予約サービスの `applyAddonsToReservation` 関数を確認すること。
  - アドオン選択コンポーネントに日付範囲のバリデーションを追加すること。
  - UIにアドオンの日付範囲を示す視覚的なインジケータの追加を検討すること。

---

### November 5, 2025

#### UI/UX Improvements for Wehub Interface（WehubインターフェースのUI/UX改善）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Source**: Tomakomai Staff (Ms. Ikejiri)
- **Description**: 
  - **Cursor Tooltip Issue**: The black tooltip that follows the cursor during reservation lookups is distracting and often blocks content
  - **Meal Count Display**: The spacing between dates and meal counts is too wide, causing display issues on smaller screens and mobile devices
- **Requested Changes**:
  1. **Tooltip Behavior**:
     - Show company information only when clicking on the company field instead of on hover
     - Remove or make the tooltip less intrusive during cursor movement
  2. **Meal Count Display**:
     - Reduce spacing between date and meal count information
     - Make dividing lines between items more prominent for better readability on small screens
- **Technical Notes**:
  - Ensure changes maintain mobile responsiveness
  - Consider adding a setting to toggle tooltip behavior if some users prefer the current implementation
  - Test with various screen sizes to ensure readability

[Japanese]
- **概要**:
  - **カーソルツールチップの問題**: 予約検索中にカーソルに追従する黒いツールチップが邪魔になり、しばしばコンテンツを遮ってしまう。
  - **食事数表示**: 日付と食事数の間の余白が広すぎ、小型スクリーンやモバイルデバイスで表示上の問題を引き起こしている。
- **要望事項**:
  1. **ツールチップの挙動**:
     - 会社情報はホバー時ではなく、会社フィールドをクリックした時にのみ表示するようにする。
     - カーソル移動中のツールチップを削除するか、目立たないようにする。
  2. **食事数表示**:
     - 日付と食事情報の間の余白を詰める。
     - 小型スクリーンでの視認性向上のため、項目間の区切り線をより強調する。
- **技術的な注意点**:
  - 修正後もモバイルレスポンシブが維持されているか確認すること。
  - 現在の実装を好むユーザーのため、ツールチップの挙動を切り替える設定の追加を検討すること。
  - 視認性を確保するため、様々な画面サイズでテストすること。

---

### October 29, 2025

#### Feature Request #B: Merge and Split Reservations（予約の結合と分割機能）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: 
  - Add functionality to merge consecutive reservations or reservations with the same check-in/out period and booker
  - Implement vertical merging (same room, different dates) and horizontal merging (same dates, different rooms)
  - Allow splitting of merged reservations back into individual components
  - Provide visual indicators for merged reservations in the calendar view
  - Include confirmation dialogs to prevent accidental merges/splits
- **Technical Notes**:
  - Need to handle room assignments, pricing, and availability when merging/splitting
  - Should maintain a history of merged/split operations for auditing
  - Consider impact on reporting and invoicing for merged reservations
  - Ensure proper handling of special requests and add-ons during merge/split operations

[Japanese]
- **概要**:
  - 連続する予約、または同じチェックイン/アウト期間かつ予約者が同一の予約を結合する機能を追加する。
  - 垂直結合（同じ部屋、異なる日付）および水平結合（同じ日付、異なる部屋）を実装する。
  - 結合された予約を元の個別の構成要素に分割できるようにする。
  - カレンダービュー上で結合された予約を識別できる視覚的インジケータを提供する。
  - 誤った結合や分割を防止するため、確認ダイアログを表示する。
- **技術的な注意点**:
  - 結合・分割時の部屋の割り当て、価格設定、空室状況の管理が必要である。
  - 監査のため、結合・分割操作の履歴を保持する必要がある。
  - 結合された予約がレポートや請求書発行に与える影響を考慮すること。
  - 結合・分割操作中、特別リクエストやアドオンが適切に処理されることを確認すること。

---

### October 10, 2025

#### Feature Request #79: Evaluate Add Simulation Function with ADR and RevPAR Metrics（ADRおよびRevPAR指標を用いたシミュレーション評価機能の追加）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: 
  Add functionality to evaluate the simulation results by displaying key performance indicators (KPIs) such as ADR (Average Daily Rate) and RevPAR (Revenue Per Available Room).
- **Requirements**:
  - Add an "Evaluate" button in the simulation interface
  - Calculate and display the following metrics:
    - ADR (Total Room Revenue / Number of Rooms Sold)
    - RevPAR (Total Room Revenue / Total Available Rooms)
    - Occupancy Rate (% of rooms occupied)
  - Display metrics in a clear, easy-to-read dashboard format
  - Allow comparison between different simulation scenarios
  - Include date range filtering for evaluation
  - Option to export metrics to CSV/Excel
- **Technical Notes**:
  - Ensure calculations handle edge cases (e.g., zero rooms sold)
  - Consider adding visualizations (charts/graphs) for trend analysis
  - Cache results for better performance with large datasets

[Japanese]
- **概要**:
  - ADR（平均客室単価）やRevPAR（販売可能客室数あたり客室売上）などの重要業績評価指標（KPI）を表示することで、シミュレーション結果を評価する機能を追加する。
- **要望事項**:
  - シミュレーション画面に「評価（Evaluate）」ボタンを追加する。
  - 以下の指標を計算・表示する：
    - ADR（客室合計売上 / 販売客室数）
    - RevPAR（客室合計売上 / 全販売可能客室数）
    - 稼働率（客室利用率％）
  - 指標を明確で読みやすいダッシュボード形式で表示する。
  - 異なるシミュレーションシナリオ間での比較を可能にする。
  - 評価のための期間指定フィルタを含める。
  - 指標をCSVまたはExcel形式でエクスポートするオプションを追加する。
- **技術的な注意点**:
  - 計算においてエッジケース（例：販売客室数ゼロ）を適切に処理すること。
  - トレンド分析のため、視覚化（チャートやグラフ）の追加を検討すること。
  - 大規模なデータセットでのパフォーマンス向上のため、結果をキャッシュすること。

---

### October 07, 2025

#### Feature Request #76: Occupancy Rate by Groups（グループ別の稼働率表示）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: Add functionality to view and analyze occupancy rates by different groups such as weekdays, weekends, and custom date ranges.
- **Requirements**:
  - Display occupancy rates in the following default groups:
    - Weekdays (Monday-Thursday)
    - Weekends (Friday-Sunday)
    - Holidays (based on Japanese holiday calendar)
  - Allow creation of custom date groups (e.g., specific event periods, seasons)
  - Show comparison between different groups
  - Include both room-based and capacity-based occupancy rates
  - Export functionality for the grouped occupancy data
- **Expected Behavior**:
  - Users can select date ranges and view occupancy rates by the defined groups
  - Visual representation (charts/graphs) of occupancy trends by group
  - Drill-down capability to see detailed data for each group
  - Ability to compare occupancy rates across different time periods
- **Affected Components**:
  - Reporting module
  - Analytics dashboard
  - Data export functionality
- **Additional Notes**:
  - Consider adding seasonal trend analysis
  - Include year-over-year comparison for the same date groups
  - Allow saving frequently used custom groups for quick access
  - Ensure the system can handle large date ranges efficiently

[Japanese]
- **概要**:
  - 平日、週末、およびカスタム日付範囲などの異なるグループごとに稼働率を表示・分析する機能を追加する。
- **要望事項**:
  - 以下のデフォルトグループで稼働率を表示する：
    - 平日（月曜〜木曜）
    - 週末（金曜〜日曜）
    - 祝日（日本の祝日カレンダーに基づく）
  - カスタム日付グループ（例：特定のイベント期間、シーズン）の作成を可能にする。
  - 異なるグループ間の比較を表示する。
  - 客室ベースおよび収容人数ベース（耐用人数）の両方の稼働率を含める。
  - グループ化された稼働率データのエクスポート機能を実装する。
- **期待される動作**:
  - ユーザーが日付範囲を選択し、定義されたグループごとに稼働率を確認できること。
  - グループごとの稼働率トレンドを視覚的に表示（チャート・グラフ）すること。
  - 各グループの詳細データを確認できるドリルダウン機能。
  - 異なる期間における稼働率を比較できる機能。
- **影響を受けるコンポーネント**:
  - レポートモジュール
  - 分析ダッシュボード
  - データエクスポート機能
- **補足**:
  - 季節的なトレンド分析の追加を検討すること。
  - 同一の日付グループにおける前年比比較を含めること。
  - 頻繁に使用するカスタムグループを保存して素早くアクセスできるようにすること。
  - 長期間の日付範囲を効率的に処理できるようにすること。

---

### September 26, 2025

#### Bug #70: Check-in/Check-out Date Update Issue for Multi-room Reservations（複数室予約におけるチェックイン・チェックアウト日の更新不備）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: 
  - When cancelling the first or last day of a reservation with multiple rooms, the check-in and check-out dates are not being updated correctly
  - This affects the accuracy of stay duration and may cause issues with room availability and billing
- **Steps to Reproduce**:
  1. Create a reservation with multiple rooms spanning several days
  2. Cancel the first day of the reservation
  3. Observe that the check-in date is not updated to reflect the new start date
  4. Similarly, cancelling the last day does not update the check-out date
- **Expected Behavior**:
  - When the first day is cancelled, the check-in date should update to the next available day
  - When the last day is cancelled, the check-out date should update to the previous day
  - These updates should be applied consistently across all rooms in the reservation
- **Affected Components**:
  - Reservation management system
  - Date calculation logic
  - Multi-room reservation handling
  - Billing system
- **Additional Notes**:
  - The issue appears to only affect reservations with multiple rooms
  - Single-room reservations handle the date updates correctly
  - This may be related to how the system tracks dates for each room in a multi-room reservation

[Japanese]
- **概要**:
  - 複数室の予約において最初または最後の日をキャンセルした際、チェックイン・チェックアウト日が正しく更新されない。
  - これにより滞在期間の正確性が損なわれ、空室管理や請求に問題が生じる可能性がある。
- **再現手順**:
  1. 数日間にわたる複数室の予約を作成する。
  2. 予約の初日をキャンセルする。
  3. チェックイン日が新しい開始日を反映して更新されないことを確認する。
  4. 同様に、最終日をキャンセルしてもチェックアウト日が更新されないことを確認する。
- **期待される動作**:
  - 初日がキャンセルされた場合、チェックイン日は次の利用可能な日に更新されること。
  - 最終日がキャンセルされた場合、チェックアウト日は前日に更新されること。
  - これらの更新は、予約内のすべての部屋に対して一貫して適用されること。
- **影響を受けるコンポーネント**:
  - 予約管理システム
  - 日付計算ロジック
  - 複数室予約のハンドリング
  - 請求システム
- **補足**:
  - この問題は複数室の予約にのみ発生しているようである。
  - 1室のみの予約では日付の更新が正しく行われている。
  - これは、システムが複数室予約において各部屋の日付をどのように追跡しているかに関連している可能性がある。

---

### September 22, 2025

#### Feature Request #66: 宿泊者名簿 (Guest Roster) Direct Printing（宿泊者名簿の直接印刷機能）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Enhance the guest roster functionality to be more user-friendly for non-technical staff
  - Instead of just downloading a PDF, provide a direct "Print" option that automatically formats and sends the roster to the printer
  - This will help staff who are not comfortable with computers to easily print the guest roster
- **Requirements**:
  - Add a prominent "Print Roster" button next to the existing download option
  - Create a print-optimized view of the guest roster
  - Automatically open the system's print dialog when clicking the print button
  - Include proper page breaks and formatting for A4 paper
  - Add hotel logo and contact information in the header
  - Ensure the print layout is clean and easy to read
  - Include date and time of printing in the footer
- **Data to Include**:
  - Guest name (as it appears on ID)
  - Room number and type
  - Check-in/check-out dates and times
  - Number of adults/children
  - Contact information
  - Special requests/notes
  - Total number of guests per room
- **Affected Components**:
  - Roster generation UI
  - Print layout templates
  - Report generation backend
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical

[Japanese]
- **概要**:
  - IT操作に不慣れなスタッフでも使いやすいよう、宿泊者名簿機能を強化する。
  - 単にPDFをダウンロードするだけでなく、自動的にフォーマットを整えてプリンタに送る直接の「印刷」オプションを提供する。
  - これにより、コンピュータ操作が苦手なスタッフでも容易に宿泊者名簿を印刷できるようになる。
- **要望事項**:
  - 既存のダウンロードオプションの隣に、目立つ「名簿を印刷（Print Roster）」ボタンを追加する。
  - 宿泊者名簿の印刷最適化ビューを作成する。
  - 印刷ボタンをクリックした際、自動的にシステムの印刷ダイアログが開くようにする。
  - A4用紙に適した適切な改ページとフォーマットを含める。
  - ヘッダーにホテルのロゴと連絡先情報を追加する。
  - 印刷レイアウトが清潔で読みやすいことを確認する。
  - フッターに印刷日時を含める。
- **含めるデータ**:
  - 宿泊者名（身分証に記載の通り）
  - 部屋番号および部屋タイプ
  - チェックイン・チェックアウトの日時
  - 大人・子供の人数
  - 連絡先情報
  - 特別リクエスト・備考
  - 1室あたりの合計人数
- **影響を受けるコンポーネント**:
  - 名簿生成UI
  - 印刷レイアウトテンプレート
  - レポート生成バックエンド

---

### September 18, 2025

#### Feature Request #65: 耐用人数 (Capacity-based) Occupancy Indicator（耐用人数ベースの稼働率指標）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Currently, occupancy is measured based on room count only
  - Evaluate implementing a new performance metric based on 耐用人数 (total people capacity)
  - This would provide a more accurate measure of hotel utilization
- **Requirements**:
  - [ ] Analyze current occupancy calculation methods
  - [ ] Determine how to track and store people capacity per room
  - [ ] Design new occupancy calculation based on people capacity
  - [ ] Compare room-based vs people-based occupancy metrics
  - [ ] Determine if this should replace or complement existing occupancy metrics
  - [ ] Design UI to display the new metric
- **Benefits**:
  - More accurate measurement of hotel utilization
  - Better understanding of actual guest capacity usage
  - Potential for more dynamic pricing strategies
  - Improved resource allocation
- **Technical Considerations**:
  - Database schema changes may be needed to track room capacities
  - Historical data analysis for comparison
  - Impact on reporting and analytics
  - Performance implications for real-time calculations
- **Affected Components**:
  - Occupancy calculation logic
  - Reporting module
  - Analytics dashboard
  - Database schema (potential)
  - Reservation system
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical

[Japanese]
- **概要**:
  - 現在、稼働率は部屋数のみに基づいて計測されている。
  - 「耐用人数（合計収容人数）」に基づく新しいパフォーマンス指標の実装を検討する。
  - これにより、ホテルの利用状況をより正確に測定できるようになる。
- **要望事項**:
  - [ ] 現在の稼働率計算方法を分析する。
  - [ ] 各部屋の収容人数をどのように追跡・保存するかを決定する。
  - [ ] 収容人数ベースの新しい稼働率計算を設計する。
  - [ ] 客室ベースと人数ベースの稼働率指標を比較する。
  - [ ] これを既存の指標と置き換えるべきか、補完すべきかを決定する。
  - [ ] 新しい指標を表示するUIを設計する。
- **メリット**:
  - ホテル利用状況のより正確な測定。
  - 実際の客室収容能力の使用状況に関するより良い理解。
  - よりダイナミックな価格戦略の可能性。
  - リソース配分の改善。
- **技術的な注意点**:
  - 部屋の収容人数を追跡するためのデータベーススキーマ変更が必要になる可能性がある。
  - 比較のための過去データ分析。
  - レポートおよび分析への影響。
  - リアルタイム計算におけるパフォーマンスへの影響。
- **影響を受けるコンポーネント**:
  - 稼働率計算ロジック
  - レポートモジュール
  - 分析ダッシュボード
  - データベーススキーマ（可能性あり）
  - 予約システム

---

### September 10, 2025

#### Feature Request #61: 清掃機能 (Cleaning Management)（清掃管理機能）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - New cleaning management page needed
  - Requirements gathering in progress
  - More details to be confirmed
- **Requirements**:
  - [ ] Define cleaning status tracking needs
  - [ ] Determine required cleaning task types
  - [ ] Identify necessary user roles and permissions
  - [ ] Specify room status transitions
  - [ ] Clarify reporting requirements
- **Questions to Resolve**:
  - What cleaning statuses need to be tracked?
  - What information should be visible on the cleaning dashboard?
  - Are there different cleaning types (e.g., stayover, checkout, deep clean)?
  - How should cleaning assignments be managed?
  - What notifications or alerts are needed?
- **Affected Components**:
  - New cleaning management UI
  - Room status management
  - Housekeeping workflow
- **Priority**: [ ] Low [ ] Medium [ ] High [ ] Critical

[Japanese]
- **概要**:
  - 新しい清掃管理ページが必要である。
  - 要件定義を進行中。
  - 詳細は今後確定される予定。
- **要望事項**:
  - [ ] 清掃ステータスの追跡ニーズを定義する。
  - [ ] 必要な清掃タスクの種類を決定する。
  - [ ] 必要なユーザーロールと権限を特定する。
  - [ ] 客室ステータスの遷移を規定する。
  - [ ] レポート要件を明確にする。
- **解決すべき疑問点**:
  - どの清掃ステータスを追跡する必要があるか？
  - 清掃ダッシュボードにはどのような情報を表示すべきか？
  - 清掃の種類（例：滞在清掃、アウト清掃、特別清掃）は分かれているか？
  - 清掃の割り当てをどのように管理すべきか？
  - どのような通知やアラートが必要か？
- **影響を受けるコンポーネント**:
  - 新規清掃管理UI
  - 客室ステータス管理
  - ハウスキーピングワークフロー

---

#### Feature Request #63: Reservation Checklist and Room Indicator Integration（予約チェックリストと部屋インジケータの統合）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Add a visual checklist to track reservation-related tasks (e.g., self-check-in explained, ID verified, etc.)
  - Display checklist status in the room indicator for quick visual reference
  - Allow staff to update checklist items directly from the reservation panel
- **Requirements**:
  - Configurable checklist items per reservation type
  - Visual indicators (icons/colors) for each checklist item
  - Status summary in the room indicator (e.g., checkmark for completed, exclamation for pending)
  - Tooltip showing detailed checklist status on hover
  - Permission-based access to update checklist items
- **Checklist Items to Include**:
  - [ ] Self-check-in instructions provided
  - [ ] ID verification completed
  - [ ] Payment confirmed
  - [ ] Special requests addressed
  - [ ] Welcome message sent
- **Affected Components**:
  - Reservation management UI
  - Room indicator component
  - Database schema for storing checklist status
  - Backend API for checklist operations
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical

[Japanese]
- **概要**:
  - 予約に関連するタスク（セルフチェックイン説明済み、ID確認済みなど）を追跡するための視覚的なチェックリストを追加する。
  - 素早く視覚的に参照できるよう、部屋インジケータにチェックリストのステータスを表示する。
  - 予約パネルから直接チェックリスト項目を更新できるようにする。
- **要望事項**:
  - 予約タイプごとに設定可能なチェックリスト項目。
  - 各チェックリスト項目のための視覚的インジケータ（アイコン/色）。
  - 部屋インジケータにおけるステータス概要（完了はチェックマーク、保留は感嘆符など）。
  - ホバー時に詳細なチェックリストステータスを表示するツールチップ。
  - チェックリスト項目を更新するための権限ベースのアクセス制御。
- **含めるべきチェックリスト項目**:
  - [ ] セルフチェックイン案内済み。
  - [ ] ID確認完了。
  - [ ] 支払い確認済み。
  - [ ] 特別リクエスト対応済み。
  - [ ] ウェルカムメッセージ送信済み。
- **影響を受けるコンポーネント**:
  - 予約管理UI
  - 部屋インジケータコンポーネント
  - チェックリストステータス保存用のデータベーススキーマ
  - チェックリスト操作用のバックエンドAPI

---

### September 8, 2025

#### Feature Request #58: セルフチェックイン案内済のマーク (Self-Check-in Notification Mark)（セルフチェックイン案内済みマーク）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Add a visual indicator to show when a guest has been sent self-check-in instructions
  - This will help staff quickly identify which guests have already received check-in information
- **Requirements**:
  - Add a clear, visible mark (e.g., icon or badge) next to guest names or in the reservation details
  - The mark should be easily noticeable but not intrusive
  - Include a tooltip or hover text indicating when the self-check-in instructions were sent
  - Consider adding the ability to toggle this status from the reservation interface
- **Affected Components**:
  - Reservation list view
  - Guest details panel
  - Reservation details dialog
  - Any related database fields for tracking self-check-in status
- **Priority**: [x] Low [ ] Medium [ ] High [ ] Critical

[Japanese]
- **概要**:
  - ゲストにセルフチェックインの案内が送信されたことを示す視覚的なインジケータを追加する。
  - これにより、スタッフはどのゲストが既にチェックイン情報を受け取っているかを素早く特定できる。
- **要望事項**:
  - ゲスト名の横または予約詳細の中に、明確で視認性の高いマーク（アイコンやバッジなど）を追加する。
  - マークは目立ちやすく、かつ邪魔にならないものであること。
  - セルフチェックイン案内がいつ送信されたかを示すツールチップまたはホバーテキストを含める。
  - 予約インターフェースからこのステータスを切り替える機能の追加を検討する。
- **影響を受けるコンポーネント**:
  - 予約リストビュー
  - ゲスト詳細パネル
  - 予約詳細ダイアログ
  - セルフチェックイン状況を追跡するための関連データベースフィールド

---

#### Feature Request #56: Room Indicator 平日/土日 プラン表記（部屋インジケータの平日/土日プラン表記）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Add visual indicators to room displays showing whether the current rate is based on 平日 (weekday) or 土日 (weekend/holiday) pricing
  - This will help staff quickly identify which rate plan is being applied to each room
- **Requirements**:
  - Add clear visual indicators (e.g., "平日" or "土日") next to or as part of the room rate display
  - Consider using different colors or icons to distinguish between weekday and weekend rates
  - Ensure the indicator is visible but not overwhelming in the room display
  - Update any relevant tooltips or hover states to include rate plan information
- **Affected Components**:
  - Room indicator component(s) in the reservation/room management interface
  - Rate display components
  - Any related styling for rate displays
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical

[Japanese]
- **概要**:
  - 現在の料金が「平日」または「土日（週末/祝日）」のどちらに基づいているかを示す視覚的インジケータを部屋の表示に追加する。
  - これにより、スタッフは各部屋にどの料金プランが適用されているかを素早く特定できるようになる。
- **要望事項**:
  - 客室料金表示の横、または表示の一部として、明確な視覚的インジケータ（例：「平日」または「土日」）を追加する。
  - 平日料金と週末料金を区別するために、異なる色やアイコンの使用を検討する。
  - インジケータは視認可能であり、かつ部屋の表示を妨げないようにすること。
  - 料金プランの情報を含めるように、関連するツールチップやホバー時の状態を更新する。
- **影響を受けるコンポーネント**:
  - 予約/客室管理インターフェース内の部屋インジケータコンポーネント
  - 料金表示コンポーネント
  - 料金表示に関連するスタイリング

---

#### Feature Request #54: 団体用名簿 (Group Guest List) Export（団体用名簿のエクスポート）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Add functionality to generate a single guest list file for all rooms in a reservation at once
  - This will be particularly useful for group reservations where multiple rooms are booked under the same reservation
- **Requirements**:
  - Create a new "Export Group Guest List" button/option in the reservation interface
  - Combine guest information from all rooms in the reservation into a single file
  - Include all necessary guest details in the exported file
  - Support common export formats (PDF, Excel, CSV)
- **Affected Component**:
  - `frontend/src/pages/MainPage/components/ReservationRoomsView.vue`
  - Backend API endpoints for guest list generation
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical

[Japanese]
- **概要**:
  - 1つの予約に含まれるすべての部屋の宿泊者名簿ファイルを一括で生成する機能を追加する。
  - 同一予約内で複数室を予約している団体予約の場合に特に有用である。
- **要望事項**:
  - 予約インターフェースに新しい「団体用名簿をエクスポート（Export Group Guest List）」ボタン/オプションを作成する。
  - 予約内のすべての部屋の宿泊者情報を1つのファイルに統合する。
  - エクスポートファイルに必要なすべての宿泊者詳細を含める。
  - 一般的なエクスポート形式（PDF、Excel、CSV）をサポートする。
- **影響を受けるコンポーネント**:
  - `frontend/src/pages/MainPage/components/ReservationRoomsView.vue`
  - 名簿生成用のバックエンドAPIエンドポイント

---

### September 5, 2025

#### Feature Request #52: Slack Integration for Reservation Updates（予約更新のSlack連携）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Integrate the PMS with Slack to automatically send real-time notifications about reservation updates
  - This will improve team communication and ensure staff are immediately aware of important reservation changes
- **Requirements**:
  - Create a Slack app and obtain necessary API credentials
  - Configure webhook integration with the PMS
  - Send notifications for key reservation events (new bookings, modifications, cancellations, check-ins, check-outs)
  - Include relevant reservation details in notifications (guest name, dates, room type, special requests)
- **UI/UX Considerations**:
  - Add Slack configuration section in admin settings
  - Allow customization of notification preferences (which events trigger notifications)
  - Enable/disable notifications per channel or user
  - Include deep links back to the reservation in the PMS
- **Implementation Details**:
  - Use Slack's Web API for sending messages
  - Implement rate limiting and error handling for Slack API calls
  - Ensure secure storage of Slack credentials
  - Add logging for sent notifications
- **Priority**: [x] Low [ ] Medium [ ] High [ ] Critical
- **Additional Notes**:
  - Consider adding @mentions for specific staff members based on reservation details
  - Include option to test the Slack integration
  - Should support multiple Slack channels for different departments
  - Add message formatting with emojis for better readability

[Japanese]
- **概要**:
  - PMSをSlackと連携させ、予約の更新に関するリアルタイム通知を自動的に送信する。
  - これによりチーム内のコミュニケーションが改善され、スタッフが重要な予約の変更を即座に把握できるようになる。
- **要望事項**:
  - Slackアプリを作成し、必要なAPI認証情報を取得する。
  - PMSでWebhook連携を設定する。
  - 主要な予約イベント（新規予約、変更、キャンセル、チェックイン、チェックアウト）の通知を送信する。
  - 通知に関連する予約詳細（ゲスト名、日程、部屋タイプ、特別リクエスト）を含める。
- **UI/UXに関する考慮事項**:
  - 管理設定にSlack設定セクションを追加する。
  - 通知設定のカスタマイズ（どのイベントで通知をトリガーするか）を可能にする。
  - チャンネルまたはユーザーごとに通知の有効/無効を切り替えられるようにする。
  - 通知にPMSの予約詳細へのディープリンクを含める。
- **実装の詳細**:
  - メッセージ送信にSlackのWeb APIを使用する。
  - Slack API呼び出しのレート制限とエラーハンドリングを実装する。
  - Slack認証情報の安全な保管を確実にする。
  - 送信済み通知のログ出力を追加する。
- **補足**:
  - 予約詳細に基づいた特定のスタッフへの@メンション追加を検討する。
  - Slack連携のテストオプションを含める。
  - 部署ごとの複数のSlackチャンネルをサポートする必要がある。
  - 視認性向上のため、絵文字を使用したメッセージフォーマットを適用する。

---

### August 29, 2025

#### Feature Request #46: Reservation Consolidation（予約の集約・統合機能）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Allow merging of separate reservations into a single reservation when certain conditions are met
  - Improve booking management by reducing the number of separate reservations for the same guest
- **Requirements**:
  - Only allow consolidation if the booker is the same for all reservations
  - Consolidation should be possible when:
    1. The check-in and check-out dates are identical, or
    2. The room is the same and the reservation periods are contiguous
  - All reservations being merged must be of the same type (e.g., cannot merge 'default' with 'employee' type)
  - If any reservation has an ota_reservation_id, all reservations must have the same ota_reservation_id to be merged
  - Preserve all reservation details and history during consolidation
  - Handle comment fields by concatenating them with clear separation
- **Implementation Details**:
  - Add a "Merge Reservations" option in the reservation management interface
  - Show visual indicators for reservations that can be consolidated
  - Validate all business rules before allowing consolidation (including type matching)
  - Update all related records and references to maintain data integrity, including:
    - reservation_details.reservation_id
    - reservation_payments.reservation_id
  - Combine comments from all merged reservations with clear separation (e.g., "--- Merged from Reservation ID: [ID] ---")
- **UI/UX Considerations**:
  - Add a "Merge" button in the reservation panel that only appears when there are mergeable reservations
  - When clicked, open a dialog showing:
    - List of all mergeable reservations with key details (dates, room, status)
    - Preview of how the merged reservation will look
    - Editable comment field pre-filled with concatenated comments from all reservations
    - Option to edit/clean up the combined comment before confirming
  - Clear visual indicators for which reservations can be merged together
  - Preview of what the consolidated reservation will look like
  - Confirmation dialog showing all changes before applying consolidation
  - Option to undo the consolidation if needed
  - Loading state during the merge operation
  - Success/error notifications after the operation
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Additional Notes**:
  - Should handle various edge cases (different rates, special requests, etc.)
  - Consider impact on reporting and analytics
  - Ensure proper audit logging of consolidation actions

[Japanese]
- **概要**:
  - 特定の条件を満たす場合に、別々の予約を1つの予約に統合（マージ）できるようにする。
  - 同一ゲストによる複数の個別予約を減らすことで、予約管理を改善する。
- **要望事項**:
  - すべての予約の予約者が同一である場合のみ、統合を許可する。
  - 統合は以下の条件で可能とする：
    1. チェックイン日とチェックアウト日が同一である。
    2. 部屋が同じで、予約期間が連続している。
  - 統合されるすべての予約は同じタイプである必要がある（例：「通常」と「従業員用」は統合不可）。
  - 予約に ota_reservation_id がある場合、統合されるすべての予約が同一の ota_reservation_id を持っている必要がある。
  - 統合中、すべての予約詳細と履歴を保持する。
  - コメント欄は明確な区切りを設けて連結処理する。
- **実装の詳細**:
  - 予約管理画面に「予約を統合（Merge Reservations）」オプションを追加する。
  - 統合可能な予約を視覚的に表示する。
  - 統合を許可する前に、すべてのビジネスルール（タイプの一致など）を検証する。
  - データ整合性を維持するため、以下の関連レコードを更新する：
    - reservation_details.reservation_id
    - reservation_payments.reservation_id
  - 統合されたすべての予約のコメントを、「--- 予約ID: [ID] から統合 ---」のような明確な区切りで結合する。
- **UI/UXに関する考慮事項**:
  - 統合可能な予約がある場合のみ、予約パネルに「統合」ボタンを表示する。
  - ボタンクリック時、以下の内容を含むダイアログを開く：
    - 日程、部屋、ステータスなどの詳細を含む、統合可能な予約のリスト。
    - 統合後の予約のプレビュー。
    - すべての予約のコメントが連結された、編集可能なコメント欄。
    - 確定前に連結されたコメントを編集・整理するオプション。
  - どの予約が一緒に統合可能かを視覚的に明確にする。
  - 統合を適用する前に、すべての変更内容を示す確認ダイアログを表示する。
  - 必要に応じて統合を元に戻すオプション。
  - 統合操作中のローディング表示。
  - 操作後の成功/エラー通知。
- **補足**:
  - 様々なエッジケース（異なる料金、特別リクエストなど）に対応すること。
  - レポートや分析への影響を考慮すること。
  - 統合アクションの適切な監査ログ出力を確実にすること。

---

### August 22, 2025

#### Feature Request #38: Quote Creator System（見積作成システム）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Currently using spreadsheets for creating and sending quotes to clients
  - Need a dual-purpose system:
    1. Quick calculation tool for phone/instant quotes
    2. Formal invoice generation based on 'hold' reservations
  - Should allow conversion of quotes to actual reservations
- **Key Features**:
  - **Quick Quote Mode**:
    - Fast, simplified interface for instant quotes
    - Basic room rate calculations with common add-ons
    - Save as draft or convert to formal quote
  - **Formal Quote/Invoice Mode**:
    - Detailed quote creation with full customization
    - Integration with 'hold' reservations
    - Professional PDF generation with company branding
  - **Common Features**:
    - Save and manage multiple quote versions
    - Track quote status (draft, sent, viewed, accepted, expired)
    - Convert quotes to reservations with one click
    - Email quotes directly to clients
- **Implementation Requirements**:
  - Two distinct but integrated interfaces (quick quote vs. formal quote)
  - Template system for different quote formats and purposes
  - Integration with existing room rates, inventory, and reservation system
  - Email notification system for quote updates
  - Dashboard to track all quotes and their statuses
  - Reporting on quote conversion rates
- **Technical Considerations**:
  - Ensure data consistency with existing reservation system
  - Implement proper access controls for sensitive pricing information
  - Support for multiple languages and currencies
  - PDF generation with proper formatting
  - Responsive design for use on different devices
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Additional Notes**:
  - Should maintain history of all quote versions
  - Include expiration dates for quotes
  - Allow for discounts and special pricing
  - Integration with customer management system
  - Quick quote mode should be accessible with minimal clicks
  - Formal quotes should support detailed terms and conditions

[Japanese]
- **概要**:
  - 現在、クライアントへの見積作成・送付にスプレッドシートを使用している。
  - 以下の2つの目的を持つシステムが必要：
    1. 電話や即時見積のための素早い計算ツール。
    2. 「仮押さえ」予約に基づく正式な請求書・見積書生成。
  - 見積から実際の予約への変換を可能にすべきである。
- **主要機能**:
  - **クイック見積モード**:
    - 即時見積のための高速で簡素化されたインターフェース。
    - 一般的なアドオンを含む基本的な客室料金計算。
    - 下書きとして保存、または正式な見積への変換。
  - **正式見積/請求モード**:
    - フルカスタマイズ可能な詳細な見積作成。
    - 「仮押さえ」予約との統合。
    - 会社のブランディングを含むプロフェッショナルなPDF生成。
  - **共通機能**:
    - 複数の見積バージョンの保存と管理。
    - 見積ステータス（下書き、送付済み、閲覧済み、承諾済み、期限切れ）の追跡。
    - ワンクリックで見積を予約に変換。
    - クライアントへ見積を直接メール送信。
- **実装要件**:
  - クイック見積と正式見積という、独立しながらも統合された2つのインターフェース。
  - 異なる形式や目的のためのテンプレートシステム。
  - 既存の客室料金、在庫、および予約システムとの統合。
  - 見積更新のためのメール通知システム。
  - すべての見積とそのステータスを追跡するためのダッシュボード。
  - 見積成約率に関するレポート。
- **技術的な注意点**:
  - 既存の予約システムとのデータ整合性を確保すること。
  - 機密性の高い価格情報に対する適切なアクセス制御を実装すること。
  - 多言語および多通貨のサポート。
  - 適切なフォーマットでのPDF生成。
  - デバイスを問わず使用できるレスポンシブデザイン。
- **補足**:
  - すべての見積バージョンの履歴を保持すること。
  - 見積の有効期限を含めること。
  - 割引や特別価格設定を可能にすること。
  - 顧客管理システムとの統合。
  - クイック見積モードは最小限のクリック数でアクセス可能にすること。
  - 正式な見積は詳細な規約（Terms and Conditions）をサポートすること。

---

### August 13, 2025

#### Feature Request #33: Editable Receipts with Version History（変更履歴付きの編集可能な領収書）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: 
  - Allow editing of 領収書 (receipts) after they have been issued
  - Implement a version control system to track all changes made to receipts
  - Each edit should create a new version while preserving previous versions
  - Version history should be accessible and show:
    - Timestamp of each version
    - User who made the changes
    - Specific fields that were modified
  - System should allow comparison between different versions
  - Option to revert to a previous version if needed
- **Additional Notes**:
  - Important for audit trails and compliance
  - Should include a clear indication of the current active version
  - Consider adding a reason field for modifications
  - Ensure all versions remain accessible in the system even if not visible in the main interface

[Japanese]
- **概要**:
  - 発行後の領収書の編集を許可する。
  - 領収書に加えられたすべての変更を追跡するためのバージョン管理システムを実装する。
  - 各編集は新しいバージョンを作成し、以前のバージョンも保持すること。
  - バージョン履歴にアクセス可能にし、以下の情報を表示する：
    - 各バージョンのタイムスタンプ。
    - 変更を行ったユーザー。
    - 修正された特定のフィールド。
  - システムは異なるバージョン間の比較を可能にすべきである。
  - 必要に応じて以前のバージョンに戻す（リバート）オプション。
- **補足**:
  - 監査証跡（オーディットトレイル）とコンプライアンスにおいて重要である。
  - 現在アクティブなバージョンを明確に示す表示を含めること。
  - 修正理由を入力するフィールドの追加を検討すること。
  - メインインターフェースに表示されない場合でも、すべてのバージョンがシステム内でアクセス可能な状態を維持すること。

---

#### Feature Request #28: Dedicated Meal Count Page（食事数確認専用ページ）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**: 
  - Currently, meal count data is only available through export functionality
  - Add a dedicated page to view meal counts directly in the application
  - This will provide better accessibility for local staff who need to check meal counts regularly
- **Implementation Requirements**:
  - Create a new Meal Count page in the application
  - Display meal counts in a clean, filterable table format
  - Include date range filters similar to the export functionality
  - Option to still export the data if needed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Additional Notes**:
  - Should maintain the same data accuracy as the export functionality
  - Consider adding quick view options for common date ranges (today, this week, etc.)
  - Ensure the page is mobile-responsive for on-the-go access

[Japanese]
- **概要**:
  - 現在、食事数データはエクスポート機能を通じてのみ利用可能である。
  - アプリケーション内で直接食事数を確認できる専用ページを追加する。
  - これにより、定期的に食事数を確認する必要がある現地スタッフのアクセシビリティが向上する。
- **実装要件**:
  - アプリケーション内に新しい「食事数（Meal Count）」ページを作成する。
  - 食事数を清潔でフィルタリング可能なテーブル形式で表示する。
  - エクスポート機能と同様の日付範囲フィルタを含める。
  - 必要に応じて引き続きデータをエクスポートできるオプション。
- **補足**:
  - エクスポート機能と同等のデータ正確性を維持すること。
  - 一般的な日付範囲（今日、今週など）のクイックビューオプションの追加を検討すること。
  - 外出先からもアクセスできるよう、ページがモバイルレスポンシブであることを確認すること。

---

### July 31, 2025

#### Feature Request #19: Enhanced Log Viewing（ログ閲覧機能の強化）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Improve log viewing to include:
    - Plans and addons changes
    - Room number changes
    - Client information modifications
- **Priority**: [ ] Low [x] Medium [ ] Critical
- **Additional Notes**: This will help with auditing and tracking changes in the system.

[Japanese]
- **概要**:
  - 以下の内容を含めるようにログ閲覧機能を改善する：
    - プランおよびアドオンの変更履歴
    - 部屋番号の変更履歴
    - クライアント情報の修正履歴
- **補足**: これにより、システム内の変更の追跡や監査に役立つ。

---

#### Feature Request #35: Room Type Change Confirmation in Free Move Mode（フリー移動モードにおける部屋タイプ変更の確認）
- **Status**: [ ] Open [x] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: When a room change is made in フリー移動 (Free Move) mode and the room type changes, show a confirmation prompt summarizing the change before applying it.
- **Steps to Reproduce**:
  1. Enter フリー移動 (Free Move) mode in the calendar view.
  2. Change a reservation to a room with a different room type.
  3. Observe that no confirmation is currently shown.
- **Expected Behavior**: If the room type changes during a free move, a confirmation dialog should appear, summarizing the old and new room types, and only proceed if the user confirms.
- **Actual Behavior**: No confirmation is shown; the change is applied immediately.
- **Environment**: 
- **Additional Notes**: This is to prevent accidental room type changes during free move operations. Spec created at `.kiro/specs/room-change-confirmation/`.

[Japanese]
- **概要**: 「フリー移動」モードで部屋の変更が行われ、かつ部屋タイプが変更される場合、適用前に変更内容の要約を示す確認プロンプトを表示する。
- **再現手順**:
  1. カレンダービューで「フリー移動」モードに入る。
  2. 予約を異なる部屋タイプの部屋へ移動させる。
  3. 現在、確認メッセージが表示されないことを確認する。
- **期待される動作**: フリー移動中に部屋タイプが変更される場合、新旧の部屋タイプを要約した確認ダイアログが表示され、ユーザーが承諾した場合のみ続行すること。
- **実際の挙動**: 確認メッセージは表示されず、変更は即座に適用される。
- **補足**: これは、フリー移動操作中の意図しない部屋タイプ変更を防止するためのものである。仕様書は `.kiro/specs/room-change-confirmation/` に作成済み。

---

#### Feature Request #10: Part-time Staff Dashboard（アルバイトスタッフ用ダッシュボード）
- **Status**: [ ] Open [x] In Progress [ ] Fixed [ ] Closed
- **Description**: Create a page for part-time staff that displays only limited, essential information in a defined format, focusing on:
  - Number of guests checking in/out
  - Payment information (amount and method)
  - Important comments or special requests
  - Room numbers and status
- **Implementation Requirements**:
  - Simple, clean interface with clear data presentation
  - Filter by date range (default to current day)
  - Quick view of totals for check-ins/check-outs
  - Option to print or export the daily report
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Additional Notes**:
  - Should be easily readable at a glance
  - Include visual indicators for special cases (e.g., VIP, special requests)
  - Ensure sensitive information is appropriately restricted

[Japanese]
- **概要**: アルバイトスタッフ向けに、限定された必須情報のみを所定の形式で表示するページを作成する。以下の項目に焦点を当てる：
  - チェックイン・チェックアウトのゲスト数
  - 支払い情報（金額および支払い方法）
  - 重要なコメントや特別リクエスト
  - 部屋番号およびステータス
- **実装要件**:
  - 明確なデータ提示を備えた、シンプルでクリーンなインターフェース。
  - 日付範囲によるフィルタ（デフォルトは当日）。
  - チェックイン/チェックアウトの合計数のクイック表示。
  - 日次レポートの印刷またはエクスポートオプション。
- **補足**:
  - 一目で容易に読み取れること。
  - 特別なケース（例：VIP、特別リクエスト）のための視覚的インジケータを含めること。
  - 機密情報が適切に制限されていることを確認すること。

---

#### Feature Request #12: Calendar Visual Indicators for Room Flexibility（カレンダー上の部屋の柔軟性に関する視覚的インジケータ）
- **Status**: [ ] Open [x] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: Add indicators in the calendar view for (1) clients who can have their room moved, and (2) clients who do not have a preference for room type. These indicators should be easily visible in the calendar.
- **Steps to Reproduce**:
  1. Open the calendar view.
  2. Look for reservations with clients who can have their room moved or have no room type preference.
- **Expected Behavior**: There are clear, easily visible indicators in the calendar for these two client types.
- **Actual Behavior**: No such indicators currently exist.
- **Environment**: 
- **Additional Notes**: This will help staff quickly identify flexible clients and optimize room assignments. Spec created at `.kiro/specs/calendar-visual-indicators/`.

[Japanese]
- **概要**: カレンダービューにおいて、(1) 部屋の移動が可能なクライアント、および (2) 部屋タイプにこだわりがないクライアントのためのインジケータを追加する。これらのインジケータはカレンダー上で容易に確認できるようにする。
- **再現手順**:
  1. カレンダービューを開く。
  2. 部屋移動が可能なクライアント、または部屋タイプの希望がないクライアントの予約を探す。
- **期待される動作**: これら2つのクライアントタイプに対して、カレンダー上に明確で視認性の高いインジケータがあること。
- **実際の挙動**: そのようなインジケータは現在存在しない。
- **補足**: これにより、スタッフは柔軟な対応が可能なクライアントを素早く特定し、部屋割りを最適化できるようになる。仕様書は `.kiro/specs/calendar-visual-indicators/` に作成済み。

---

### July 24, 2025

#### Feature Request #15: Plan Display Order and Categories（プランの表示順とカテゴリ設定）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Allow setting the display order of plans
  - Enable configuration of facility display order in dropdowns
  - Implement global plan categories and organize hotel plans by room type
  - **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
  - **Additional Notes**: This is part of the plan management system revamp to improve plan organization and selection.

[Japanese]
- **概要**:
  - プランの表示順序を設定できるようにする。
  - ドロップダウンにおける施設表示順の設定を可能にする。
  - グローバルなプランカテゴリを実装し、ホテルのプランを部屋タイプごとに整理する。
- **補足**: これはプランの整理と選択を改善するための、プラン管理システム刷新の一環である。

---

### July 15, 2025

#### Feature Request #14: Fax Sending Functionality via Reservation Panel（予約パネルからのFAX送信機能）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**: Add a function to send fax (via email) to the client through the reservation Panel splitbutton.
- **Steps to Reproduce**:
  1. Open the reservation Panel.
  2. Use the splitbutton for reservation actions.
  3. Select the new 'Send Fax' option.
- **Expected Behavior**: The system should allow sending a fax (via email gateway) to the client directly from the reservation panel.
- **Actual Behavior**: This functionality does not currently exist.
- **Environment**: 
- **Additional Notes**: Useful for quickly sending reservation confirmations or details to clients who require fax communication.

[Japanese]
- **概要**: 予約パネルの分割ボタン（splitbutton）を通じて、クライアントへFAX（メール経由）を送信する機能を追加する。
- **再現手順**:
  1. 予約パネルを開く。
  2. 予約アクション用の分割ボタンを使用する。
  3. 新しい「FAX送信（Send Fax）」オプションを選択する。
- **期待される動作**: システムが、予約パネルから直接クライアントへ（メールゲートウェイを介して）FAXを送信できるようになること。
- **実際の挙動**: この機能は現在存在しない。
- **補足**: FAXでの連絡が必要なクライアントに対して、予約確認書や詳細を素早く送るのに有用である。

---

#### Feature Request #16: Room Type Hierarchy for Systematic Upgrades（体系的なアップグレードのための部屋タイプ階層の実装）
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: Implement a room type hierarchy to systematically identify upgrades and support business logic for OTA reservations. When a requested room type is unavailable, the system should be able to upgrade the client based on the hierarchy. 
- **Steps to Reproduce**:
  1. Receive an OTA reservation for an unavailable room type.
  2. System should identify possible upgrades using the room type hierarchy.
- **Expected Behavior**: Room upgrades are handled systematically.
- **Actual Behavior**: No room type hierarchy.
- **Environment**: OTA integration, PMS import logic
- **Additional Notes**: This will prevent duplicate reservations and improve upgrade handling.

[Japanese]
- **概要**: 体系的にアップグレードを特定し、OTA予約のビジネスロジックをサポートするための部屋タイプ階層（ヒエラルキー）を実装する。リクエストされた部屋タイプが利用不可の場合、システムは階層に基づいてクライアントをアップグレードできるようにすべきである。
- **再現手順**:
  1. 利用不可の部屋タイプでOTA予約を受信する。
  2. システムが部屋タイプ階層を使用して、可能なアップグレードを特定する。
- **期待される動作**: 部屋のアップグレードが体系的に処理されること。
- **実際の挙動**: 部屋タイプの階層構造が存在しない。
- **影響を受ける環境**: OTA連携、PMSインポートロジック。
- **補足**: これにより、重複予約の防止やアップグレード対応の改善が期待できる。