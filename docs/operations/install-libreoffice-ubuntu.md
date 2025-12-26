# Ubuntu VPSへのLibreOfficeとフォントのインストール手順

このドキュメントでは、Ubuntu VPS上でExcelテンプレートからPDFへの変換を有効にするために必要な、LibreOfficeおよび日本語フォント（Noto CJK）のインストール手順を説明します。

## 1. パッケージリストの更新

まず、システムを最新の状態に更新します。

```bash
sudo apt update
sudo apt upgrade -y
```

## 2. LibreOfficeのインストール

サーバー環境（ヘッドレスモード）で使用するため、LibreOfficeをインストールします。

```bash
sudo apt install libreoffice -y
```

## 3. 日本語フォント（Noto CJK）のインストール

Excel内の日本語をPDFで正しくレンダリングするために、GoogleのNoto CJKフォントをインストールします。

```bash
sudo apt install fonts-noto-cjk -y
```

## 4. インストールの確認

### LibreOfficeの確認
以下のコマンドでバージョンが表示されれば、正しくインストールされています。

```bash
libreoffice --version
```

### フォントの確認
以下のコマンドでインストールされたフォントの一覧を確認できます。

```bash
fc-list :lang=ja
```

## 5. （参考）コマンドラインでのPDF変換テスト

正しくインストールされたか、以下のコマンドでExcelファイル（`.xlsx`）をPDFに変換してテストできます。

```bash
libreoffice --headless --convert-to pdf test-template.xlsx
```
