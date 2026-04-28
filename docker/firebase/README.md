# Firebase Local Emulator セットアップガイド

Firebase Local Emulator Suite を Docker で起動し、Firestore データストアをテストアプリケーション用に設定する方法を説明します。

## 前提条件

- ✅ Docker がインストール済み
- ✅ Docker Compose がインストール済み
- ✅ ポート 4000, 5000, 8080 等が利用可能

## 起動方法

### 1. Firebase Emulator コンテナの起動

```bash
cd docker/keycloak
docker-compose up -d firebase-emulator
```

**確認:**
```bash
docker-compose ps

# STATUS が "Up" になっていることを確認
# PORTS: 0.0.0.0:4000->4000/tcp, 0.0.0.0:5000->5000/tcp, ...
```

### 2. Firebase Emulator UI にアクセス

ブラウザで以下にアクセス：
```
http://localhost:4000
```

**表示内容:**
- Firestore Emulator
- Realtime Database Emulator
- Cloud Storage Emulator
- Authentication Emulator
- Cloud Functions Emulator

## Firestore データベース設定

### 1. コレクションの作成

#### 1.1 Admin Console で確認

Firebase Emulator UI (http://localhost:4000) → **Firestore** タブ

#### 1.2 初期データのインポート

```bash
# カスタムデータをインポート（Firestore Data Context）
cd docker/keycloak
docker-compose exec firebase-emulator firebase firestore:delete --project oidc-testapp --all-collections --yes
```

### 2. Firestore Rules 設定

`firestore.rules` ファイルで、アプリケーション固有のセキュリティルールを定義：

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // 認証ユーザーは自分のプロフィール読み書き可
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // セッションデータ（テストアプリ内限定）
    match /sessions/{sessionId} {
      allow read, write: if request.auth != null;
    }
    
    // 監査ログは読み取り専用
    match /audit_logs/{logId} {
      allow read: if request.auth != null;
    }
  }
}
```

### 3. Firestore インデックス設定

`firestore.indexes.json` でクエリ用インデックスを定義：

```json
{
  "indexes": [
    {
      "collectionGroup": "users",
      "queryScope": "Collection",
      "fields": [
        {"fieldPath": "email", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    }
  ]
}
```

## サンプルデータの初期化

### 方法1: JavaScript で Firestore にデータ追加

```javascript
// app または テストスクリプト内
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Emulator に接続
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.GOOGLE_CLOUD_PROJECT = 'oidc-testapp';

const app = initializeApp();
const db = getFirestore();

// サンプルユーザー追加
await db.collection('users').doc('testuser').set({
  username: 'testuser',
  email: 'testuser@example.com',
  createdAt: new Date()
});
```

### 方法2: Firebase CLI でデータをエクスポート/インポート

```bash
# Emulator からデータをエクスポート
cd docker/keycloak
docker-compose exec firebase-emulator firebase firestore:export /tmp/backup --project oidc-testapp

# エクスポートしたデータをインポート
docker-compose exec firebase-emulator firebase firestore:import /tmp/backup --project oidc-testapp
```

## Webアプリケーションとの連携

### 1. 環境変数設定

`.env` ファイルに以下を追加：

```bash
# Firebase Emulator 接続
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
GOOGLE_CLOUD_PROJECT=oidc-testapp
```

### 2. Node.js コード例

```javascript
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Emulator に接続（開発環境のみ）
if (process.env.NODE_ENV === 'localhost') {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  process.env.GOOGLE_CLOUD_PROJECT = 'oidc-testapp';
}

const app = initializeApp();
const db = getFirestore();

// Firestore クエリ例
const userRef = db.collection('users').doc('testuser');
const doc = await userRef.get();

if (doc.exists) {
  console.log('User data:', doc.data());
}
```

## ポートマッピング一覧

| ポート | サービス | 説明 |
|--------|---------|------|
| **4000** | Emulator Suite UI | Web UI ダッシュボード |
| **5000** | Realtime Database | Firebase Realtime Database |
| **8080** | Firestore Emulator | Cloud Firestore |
| **9000** | Cloud Pub/Sub | Pub/Sub エミュレータ |
| **9099** | Auth Emulator | Firebase Authentication |
| **5001** | Cloud Functions | Functions エミュレータ |
| **8085** | Datastore | Cloud Datastore |

## トラブルシューティング

### ポート競合エラー

```bash
# 既に使用中のポートを確認
lsof -i :8080
lsof -i :4000

# 別のポートで起動（docker-compose.yml を編集）
```

### Firestore に接続できない

```bash
# Emulator が正しく起動しているか確認
docker-compose ps firebase-emulator

# ログを確認
docker-compose logs firebase-emulator
```

### データが保存されない

```bash
# Firestore Rules が拒否していないか確認
docker-compose logs firebase-emulator | grep -i "permission"

# Rules ファイルを再確認
cat firestore.rules
```

### コンテナの再起動

```bash
docker-compose down firebase-emulator
docker-compose up -d firebase-emulator --build
```

## 開発中のデータ管理

### 1. 初期データの自動ロード

```bash
# コンテナ起動時に `.data` ディレクトリからデータをロード
docker-compose up -d firebase-emulator
# → .data/firestore_export/... から自動復元
```

### 2. データの手動保存

```bash
# Emulator のデータを エクスポート
docker-compose exec firebase-emulator \
  firebase firestore:export /app/.data \
  --project oidc-testapp
```

### 3. データのリセット

```bash
# キャッシュを削除
docker-compose down firebase-emulator -v
docker-compose up -d firebase-emulator --build
```

## 参考資料

- [Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Firestore Emulator 設定](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/rules-query)

