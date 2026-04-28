# セットアップガイド

このドキュメントは、oauth-security-lab をローカル環境にセットアップするための完全なガイドです。

## 環境要件

### 必須ツール

| ツール | バージョン | 用途 |
|--------|----------|------|
| **Node.js** | 24+ | Expressサーバー・ビルドツール |
| **npm** | 10+ | パッケージマネージャー |
| **Docker** | 20+〜24 | Keycloak コンテナ |
| **Docker Compose** | 2.0+ | マルチコンテナ管理 |
| **Java** | 26+ | Firebase Emulator |


## ステップバイステップセットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/kura-lab/seccamp2026mini-answer.git
cd oauth-security-lab
```

### 2. npm 依存関係のインストール

```bash
npm install
```

**確認:**
```bash
ls node_modules | grep -E "(express|firebase-admin|openid-client)"
```

### 3. Keycloak の起動

#### 起動コマンド

```bash
cd docker/keycloak
docker-compose up -d
```

#### 確認

```bash
# コンテナの状態確認
docker-compose ps

# ブラウザでアクセス
# http://localhost:8081
```

**ログイン情報:**
- Username: `admin`
- Password: `admin`

詳細設定は [`docker/keycloak/README.md`](../docker/keycloak/README.md) を参照

### 4. Firebase Local Emulator の起動

```bash
npm run emulator
```

**ログ出力例:**
```
firebase-tools: 15.15.0
FirebaseEmulator using JDK from /usr/lib/jvm/java-26-openjdk
✓ Firestore Emulator running on port 8080
...
```

### 5. Webアプリケーションのビルド

別のターミナルで：

```bash
npm run build
```

### 6. Webアプリケーションの起動

```bash
npm run dev
```

**ログ出力例:**
```
NODE_ENV=localhost
Your app is listening on port 8080
```

### 7. ブラウザでアクセス

```
http://localhost:8080
```

## コマンド一覧

| コマンド | 説明 |
|---------|------|
| `npm install` | 依存関係インストール |
| `npm run build` | Webpack ビルド（本番モード） |
| `npm run dev` | 開発モードで Expressサーバー起動 |
| `npm run emulator` | Firebase Local Emulator 起動 |
| `npm run deploy` | Google Cloud App Engine へデプロイ |
| `npm run clean` | キャッシュと node_modules を削除 |

## 3つのターミナルウィンドウ

セットアップ後、以下の3つのプロセスが同時に実行されます：

### ターミナル 1: Keycloak (Docker)

```bash
cd docker/keycloak
docker-compose up
```

**ログ:**
```
keycloak-oauth-lab  | 2026-04-28 09:00:00,123 INFO  [io.quarkus] (main) KeyCloak 26.0.0 started in 12.345s
```

### ターミナル 2: Firebase Emulator

```bash
npm run emulator
```

**ログ:**
```
✓ Firestore Emulator running on port 8080
✓ Emulator UI available at http://localhost:4000
```

### ターミナル 3: Webアプリケーション

```bash
npm run build
npm run dev
```

**ログ:**
```
Your app is listening on port 8080
```

## アクセスポイント

| コンポーネント | URL | 用途 |
|--------|-----|------|
| **Webアプリケーション** | http://localhost:8080 | OAuth テストアプリ |
| **Keycloak Admin** | http://localhost:8081/admin | ユーザー・クライアント管理 |
| **Firebase Emulator UI** | http://localhost:4000 | Firestore データ確認 |

## トラブルシューティング

### ポートが既に使用されている

```bash
# ポート確認
lsof -i :8080
lsof -i :8081
lsof -i :4000

# プロセス終了
kill -9 <PID>
```

### Node.js バージョンが要件を満たさない

```bash
# nvm で Node のバージョン切り替え
nvm install 24
nvm use 24
npm install
```

### Docker イメージがダウンロードできない

```bash
# インターネット接続を確認
# プロキシ設定がある場合は設定

# キャッシュを削除
docker system prune -a
docker-compose up -d
```

### Firebase Emulator が起動しない

Java がインストールされていることを確認：

```bash
java --version
# 26 以上

# Java インストール（Linux）
sudo apt-get install openjdk-26-jdk
```

## 次のステップ

セットアップが完了したら、以下のドキュメントを参照してください：

- [アーキテクチャ詳細](./ARCHITECTURE.md)
- [学習フロー](../README.md#学習フロー)
- [攻撃スクリプト](../attacks/)

