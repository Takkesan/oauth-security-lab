# Seccamp 2026 mini OAuth 2.0 & OpenID Connect Security Lab

ハンズオン事前準備用のセキュリティラボアプリケーションです。OAuth 2.0とOpenID Connectの脆弱性を学習し、実装方法を理解するための教育プラットフォームです。

## 概要

このプロジェクトは以下の3つのコンポーネントで構成されています：

| コンポーネント | 役割 | ポート | 管理 |
|---------------|------|--------|------|
| **Keycloak** | 👤 OAuth 2.0・OpenID Connect サーバー<br/>（認証・認可・ID管理） | 8081 | 🐳 Docker Compose |
| **Firebase Local Emulator** | 🔥 Firestore データストア<br/>（セッション・アプリケーションデータ） | 4000 / 8080 | 🐳 Docker Compose |
| **OAuth Testapp** | 🌐 OAuth 2.0 Client / OIDC Relying Party<br/>（Webアプリケーション） | 8080 | 🔧 npm |

### 📋 リポジトリに含まれるもの

✅ **このリポジトリに含まれます:**
- OAuth 2.0 実装コード (Implicit, Authorization Code, PKCE, Introspection)
- Webアプリケーション (Express + Handlebars)
- 攻撃スクリプト＆学習教材
- **Keycloak + Firebase Emulator セットアップ用 Docker Compose ファイル**
- Docker イメージビルド用 Dockerfile

❌ **このリポジトリに含まれません:**
- Keycloak バイナリ（Docker イメージをダウンロード）
- Firebase Admin SDK（npm install で自動取得）
- Node.js、Java 等のランタイム（ユーザーがインストール）

## フォルダ構成

### このリポジトリに含まれるもの

```
oauth-security-lab/
├── docs/                                # ドキュメント
│   ├── SETUP_GUIDE.md                   # セットアップガイド
│   └── ARCHITECTURE.md                  # アーキテクチャ詳細
│
├── docker/                              # 🐳 Docker コンテナ設定
│   ├── keycloak/                        # Keycloak セットアップ用
│   │   ├── docker-compose.yml           # Docker Compose 統合定義
│   │   └── README.md                    # Keycloak セットアップガイド
│   └── firebase/                        # Firebase Emulator セットアップ用
│       ├── Dockerfile                   # Firebase Emulator イメージ定義
│       └── README.md                    # Firebase Emulator セットアップガイド
│
├── libs/                                # OAuth実装モジュール
│   ├── implicit.mjs                     # Implicit Flow
│   ├── authzCode.mjs                    # Authorization Code Flow
│   ├── pkce.mjs                         # Authorization Code + PKCE Flow
│   └── introspection.mjs                # Token Introspection
│
├── views/                               # HTMLテンプレート
│   ├── layouts/
│   ├── partials/
│   ├── index.html
│   ├── implicit.html
│   ├── authz_code.html
│   ├── pkce.html
│   └── introspection.html
│
├── public/                              # 静的ファイル
│   ├── components.js
│   └── styles/
│
├── attacks/                             # 攻撃用スクリプト＆ツール
│   ├── implicit/                        # Level 1: Implicit Flow攻撃
│   │   ├── attack.js                    # URLフラグメント盗聴攻撃
│   │   ├── README.md
│   │   └── payload.html
│   ├── authz_code/                      # Level 2: Authorization Code Flow攻撃
│   │   ├── csrf_attack.js               # CSRF攻撃スクリプト
│   │   ├── state_bypass.js              # State パラメータ無視攻撃
│   │   ├── README.md
│   │   └── malicious_site.html
│   ├── pkce/                            # Level 3: PKCE攻撃
│   │   ├── code_interception.js         # Code Verifier攻撃
│   │   ├── README.md
│   │   └── intercept.html
│   └── introspection/                   # Level 4: Token Introspection攻撃
│       ├── token_hijack.js
│       ├── README.md
│       └── exploit.html
│
├── server.mjs                           # Expressサーバー エントリーポイント
├── webpack.config.js                    # ビルド設定
├── firebase.json                        # Firebase 設定
├── firestore.rules                      # Firestore セキュリティルール
├── firestore.indexes.json               # Firestore インデックス定義
├── README.md                            # このファイル
├── LICENSE                              # Apache License 2.0
├── package.json                         # npm 依存関係
└── .gitignore
```

### 外部サービス（このリポジトリに含まない）

| サービス | 用途 | セットアップ方法 |
|---------|------|----------------|
| **Keycloak + Firebase** | 💼 両方を Docker Compose で管理 | `docker-compose up -d` |

## How to run locally

### 事前要件 (Prerequisite)

**基本ツール:**
* Node.js 24+
* Docker & Docker Compose（Keycloak用）
* Java 26+（Firebase Emulator用）
* gcloud CLI（オプション）

**開発用:**
* npm 10+
* エディタ（VS Code推奨）

### セットアップ手順

#### 1️⃣ リポジトリのクローン＆依存関係インストール

```shell
git clone https://github.com/kura-lab/seccamp2026mini-answer.git
cd oauth-security-lab
npm install
```

#### 2️⃣ Docker パレットアップ（Keycloak + Firebase Emulator）

```shell
cd docker/keycloak
docker-compose up -d
```

**起動内容:**
- 🔐 Keycloak (localhost:8081)
- 🔥 Firebase Emulator (localhost:4000 UI, 8080 Firestore)

**確認方法:**
```bash
docker-compose ps

# 両方のコンテナが"Up"になっていることを確認
```

**アクセス方法:**
- Keycloak Admin: http://localhost:8081 (admin/admin)
- Firebase Emulator UI: http://localhost:4000
- Firestore: http://localhost:8080

**詳細:** 
- Keycloak: [`docker/keycloak/README.md`](./docker/keycloak/README.md)
- Firebase: [`docker/firebase/README.md`](./docker/firebase/README.md)

#### 3️⃣ テストアプリケーション（Webアプリ）の起動

別のターミナルで以下を実行：

```shell
npm run build
npm run dev
```

#### 4️⃣ ブラウザでアクセス

```
http://localhost:8080
```

**🎉 セットアップ完了！**

---

### 🔗 3つのコンポーネント間の接続

```
ユーザー (Browser)
    │
    ├─→ http://localhost:8080
    │   ↓
    ├─ [ Express Server ] (server.mjs)
    │   ├─ OAuth Flows
    │   ├─ Session Management
    │   └─ API エンドポイント
    │
    ├─→ http://localhost:8081 (Keycloak)
    │   ├─ /auth/authorize
    │   ├─ /auth/token
    │   └─ /auth/introspect
    │
    ├─→ http://localhost:8080 / http://localhost:4000 (Firebase Emulator)
    │   ├─ Firestore データ読み書き
    │   ├─ Session ストレージ
    │   └─ Firebase UI (4000)
    │
    └─→ Docker Compose (管理)
        ├─ Keycloak コンテナ
        └─ Firebase Emulator コンテナ
```

### ⚡ ワンコマンドセットアップ

```bash
cd docker/keycloak
docker-compose up -d  # Keycloak + Firebase 起動

# 別ターミナルで
npm run build
npm run dev           # Webアプリ起動

# ブラウザで開く
open http://localhost:8080
```

### コマンド一覧

```shell
# Docker Compose コマンド（docker/keycloak ディレクトリで実行）
docker-compose up -d              # Keycloak + Firebase 起動
docker-compose down               # コンテナ停止
docker-compose logs               # ログ表示
docker-compose ps                 # 状態確認
docker-compose up -d --build      # イメージを再ビルドして起動

# npm コマンド
npm install                       # 依存関係インストール
npm run build                     # ビルド（Webpack）
npm run dev                       # 開発モード起動
npm run deploy                    # 本番環境へデプロイ
npm run clean                     # キャッシュと node_modules 削除
```

## 学習フロー

### 📖 段階的学習（Level 1-4）

#### Level 1️⃣: Implicit Flow の脆弱性を体験

**テストアプリケーション:**
- エンドポイント: `http://localhost:8080/implicit`

**学習内容:**
- ✗ アクセストークンがURLフラグメント（`#access_token=...`）に含まれる
- ✗ ブラウザ履歴に記録される可能性
- ✗ リフレッシュトークンが使用できない

**攻撃スクリプト:** [`attacks/implicit/`](./attacks/implicit/)
```bash
cd attacks/implicit
node attack.js
```
詳細は [attacks/implicit/README.md](./attacks/implicit/README.md) を参照

---

#### Level 2️⃣: Authorization Code Flow の脅威

**テストアプリケーション:**
- エンドポイント: `http://localhost:8080/authz_code`

**学習内容:**
- ✗ State パラメータの欠如 → CSRF脆弱性
- ✗ 認可コードの流れを理解する
- ✗ クライアント側のセッション管理の重要性

**攻撃スクリプット:** [`attacks/authz_code/`](./attacks/authz_code/)
```bash
cd attacks/authz_code
node csrf_attack.js   # CSRF攻撃シミュレーション
node state_bypass.js  # State パラメータ無視攻撃
```
詳細は [attacks/authz_code/README.md](./attacks/authz_code/README.md) を参照

---

#### Level 3️⃣: PKCE の役割を理解する

**テストアプリケーション:**
- エンドポイント: `http://localhost:8080/pkce`

**学習内容:**
- ✓ Code Verifier と Code Challenge の仕組み
- ✓ Authorization Code Flow の強化
- ✓ モバイルアプリでのセキュリティ向上

**攻撃シミュレーション:** [`attacks/pkce/`](./attacks/pkce/)
```bash
cd attacks/pkce
node code_interception.js  # Code Verifier検証方法
```
詳細は [attacks/pkce/README.md](./attacks/pkce/README.md) を参照

---

#### Level 4️⃣: Token Introspection と検証

**テストアプリケーション:**
- エンドポイント: `http://localhost:8080/introspection`

**学習内容:**
- トークンの検証方法（Introspection, JWT検証）
- トークンのライフサイクル管理
- アクセストークンの不適切な検証の危険性

**攻撃シミュレーション:** [`attacks/introspection/`](./attacks/introspection/)
```bash
cd attacks/introspection
node token_hijack.js  # トークン盗聴・改ざん
```
詳細は [attacks/introspection/README.md](./attacks/introspection/README.md) を参照

---

### 🔍 OAuth 2.0 認証フロー一覧

| フロー | パス | Keycloak連携 | 学習ポイント | 脆弱性 |
|--------|------|-------------|---------|--------|
| **Implicit** | `/implicit` | ⭐️⭐️⭐️ | トークンの取得方法 | URLに公開 |
| **Authorization Code** | `/authz_code` | ⭐️⭐️⭐️ | State パラメータ | CSRF |
| **Authorization Code + PKCE** | `/pkce` | ⭐️⭐️⭐️ | Code Verifier | 不検証 |
| **Token Introspection** | `/introspection` | ⭐️⭐️⭐️ | トークン検証 | 改ざん容易性 |

## License

This project is based on [seccamp2026mini-answer](https://github.com/kura-lab/seccamp2026mini-answer).

Licensed under the Apache License 2.0. See [LICENSE](./LICENSE) for details.
