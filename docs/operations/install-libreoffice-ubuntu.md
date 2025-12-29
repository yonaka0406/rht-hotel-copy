# Ubuntu VPSへのLibreOfficeとフォントのインストール手順

このドキュメントでは、PM2などを使用する**非コンテナ環境（ネイティブUbuntu VPS）**上で、ExcelテンプレートからPDFへの変換を有効にするために必要な、LibreOfficeおよび日本語フォントのインストール手順を説明します。

⚠️ **注意:** Dockerを使用している場合、これらは `Dockerfile` 内で自動的に構成されるため、ホスト側でのこの操作は不要です。

## 1. パッケージリストの更新

```bash
sudo apt update
```

## 2. LibreOffice（サーバー向け構成）のインストール

サーバーのリソースを節約し安定性を高めるため、GUIを含まない最小構成のパッケージと、変換処理に必要なJavaランタイムをインストールします。

```bash
sudo apt install -y --no-install-recommends \
    libreoffice-common \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-java-common \
    default-jre-headless
```

## 3. 日本語フォント（Noto CJK）のインストール

Excel内の日本語をPDFで正しく表示（レンダリング）するために、GoogleのNoto CJKフォントをインストールします。これがないと日本語が文字化け（トーフ化）します。

```bash
sudo apt install -y fonts-noto-cjk
```

## 4. インストールの確認

### LibreOfficeの確認

以下のコマンドでバージョンが表示されれば、正しくインストールされています。

```bash
libreoffice --version
```

### フォントの確認

以下のコマンドで日本語フォントが認識されているか確認できます。

```bash
fc-list :lang=ja
```

## 5. 運用上のヒント：権限と一時プロファイル

サーバー環境でPM2等の非ルートユーザーがLibreOfficeを実行する場合、デフォルトのユーザープロファイル作成に失敗して変換が停止することがあります。

本プロジェクトの `api/services/libreOfficeService.js` では、実行時の競合や権限エラーを避けるために以下の対策を講じています：

- `--headless` モードでの実行
- 環境変数 `HOME=/tmp` の指定（一時的なユーザープロファイルの使用）

## 6. コマンドラインでの変換テスト

手動で変換テストを行う場合は、以下のコマンドを実行してください。

```bash
libreoffice --headless --convert-to pdf test-file.xlsx
```
