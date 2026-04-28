# アーキテクチャ詳細

## システム構成図

```
┌─────────────────────────────────────────────────────────┐
│                     ユーザーブラウザ                       │
│                (http://localhost:8080)                  │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬─────────────┐
        │              │              │             │
        ▼              ▼              ▼             ▼
   ┌─────────┐  ┌─────────────────────────┐  ┌──────────┐
   │ Implicit│  │ Authorization Code Flow │  │   PKCE   │
   │  Flow   │  │   (with/without CSRF)   │  │   Flow   │
   │ /implicit├─┤    /authz_code         ├─┤  /pkce    │
   └────┬────┘  │    /introspection      │  └────┬─────┘
        │       └──────────┬─────────────┘       │
        │                  │                      │
        └──────────────────┼──────────────────────┘
                           │
                ┌──────────▼──────────┐
                │  Express Server     │
                │   (server.mjs)      │
                │                     │
                │ ├─ libs/            │
                │ │  ├─ implicit.mjs  │
                │ │  ├─ authzCode.mjs │
                │ │  ├─ pkce.mjs      │
                │ │  └─ introspect.mjs│
                │ │                   │
                │ ├─ Session Mgmt     │
                │ │ (express-session) │
                │ │                   │
                │ └─ API Routes       │
                │                     │
                └──────────┬──────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
    ┌─────────┐      ┌─────────┐     ┌──────────┐
    │Keycloak │      │Firebase │     │Emulator  │
    │ (8081)  │      │Firestore│     │UI (4000) │
    │         │      │         │     │          │
    │ /auth/  │      │Session  │     │ Firestore│
    │ /realms │      │Storage  │     │ Viewer   │
    │        │      │         │     │          │
    │OAuth2.0 │      │App Data │     │          │
    │OIDC     │      │         │     │          │
    └─────────┘      └─────────┘     └──────────┘
```

## コンポーネント詳細

### 1. Express Webアプリケーション (server.mjs)

**役割:**
- OAuth 2.0 / OpenID Connect クライアント実装
- セッション管理
- 学習用 UI 提供

**主要モジュール:**

| モジュール | ファイル | 説明 |
|-----------|---------|------|
| Implicit Flow | `libs/implicit.mjs` | 脆弱な実装（URLフラグメント) |
| Authorization Code | `libs/authzCode.mjs` | State なし CSRF脆弱版 |
| PKCE | `libs/pkce.mjs` | Code Verifier 検証 |
| Introspection | `libs/introspection.mjs` | トークン検証方法 |

**セッション管理:**
```javascript
// express-session を使用
app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: false,
  store: FirestoreStore // Firestore に永続化
}));
```

### 2. Keycloak (Docker: localhost:8081)

**役割:**
- 認証・認可サーバー (Authorization Server)
- ID 管理
- トークン発行・検証

**重要なエンドポイント:**

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/realms/test/protocol/openid-connect/auth` | GET | Authorization Request |
| `/realms/test/protocol/openid-connect/token` | POST | Token Request |
| `/realms/test/protocol/openid-connect/token/introspect` | POST | Token Introspection |
| `/realms/test/protocol/openid-connect/userinfo` | GET | UserInfo Endpoint |

**Docker Compose 設定:**
```yaml
services:
  keycloak:
    image: quay.io/keycloak/keycloak:latest
    ports:
      - "8081:8080"
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
```

### 3. Firebase Firestore

**役割:**
- セッションストレージ
- アプリケーションデータ永続化
- Local Emulator でテスト

**ストレージ構成:**

```
firestore/
├── sessions/         # express-session 用
│   └── [session_id]
├── users/
│   └── [user_id]
│       ├── username
│       ├── email
│       └── oauth_tokens
└── audit_logs/       # 攻撃検証用ログ
    └── [timestamp]
```

## データフロー例: Authorization Code Flow

### 正常フロー（PKCE あり）

```
Step 1: クライアント
┌────────────────────────────────────────────┐
│ Code Verifier 生成                          │
│ code_verifier = random(128)                │
│ code_challenge = SHA256(code_verifier)     │
└────────────────────┬───────────────────────┘
                     │

Step 2: Authorization Request
      GET /auth?
        client_id=testapp
        &redirect_uri=http://localhost:8080/callback
        &response_type=code
        &code_challenge=E9MROZoa...
        &code_challenge_method=S256
      ↓
[Keycloak] ← Challenge を保存

Step 3: ユーザー認証
      [ユーザー登録フォーム]
      username: testuser
      password: password123
      ↓
[Keycloak] ← 検証成功

Step 4: Authorization Code 返却
      Redirect: http://localhost:8080/callback?code=abc123
      ↓
[Express] ← Code を保存

Step 5: Token Request
      POST /token?
        code=abc123
        &client_id=testapp
        &client_secret=secret
        &code_verifier=random(128)
      ↓
[Keycloak] ← Challenge と Verifier を比較検証

Step 6: Access Token 発行
      {
        "access_token": "eyJhbGc...",
        "token_type": "Bearer",
        "expires_in": 3600,
        "refresh_token": "..."
      }
      ↓
[Express] ← トークンを保存（セッション）

Step 7: リソースアクセス
      GET /api/profile?
        Authorization: Bearer eyJhbGc...
      ↓
[Express] ← Firestore からユーザー情報取得

Success ✓
```

### 脆弱フロー（CSRF: State なし）

```
Step 1: 攻撃者が悪意のあるリンク送信
      <a href="http://localhost:8080/authz_code/authorize?
           client_id=testapp
           &redirect_uri=http://attacker.com/callback
           &response_type=code">
        クリック！
      </a>

Step 2: ユーザーがリンクをクリック
      → Keycloak ログイン画面

Step 3: ユーザーがログイン（意識しない）
      ↓
[Keycloak] ← 認可

Step 4: Authorization Code が攻撃者のサーバーに送信
      Redirect: http://attacker.com/callback?code=abc123
      ↓
[Attacker Server] ← Code 取得！

Step 5: 攻撃者が Token Request
      POST /token?
        code=abc123
        &client_id=testapp
        &client_secret=secret
      ↓
[Keycloak] ← State 検証なし（脆弱性）
[Keycloak] → Token 発行

Step 6: 攻撃者がトークンで API を利用
      GET /api/profile?
        Authorization: Bearer eyJhbGc...
      ↓
[Express] ← 顧客 B のアカウントでアクセス可能！

Attack Success ✗ (Vulnerable)
```

## セキュリティ対策レイヤー

### Layer 1: Authentication (認証)

```
Keycloak
├─ Username/Password
├─ Email Verification
├─ MFA (Multi-Factor Auth)
└─ Session Timeout
```

### Layer 2: Authorization (認可)

```
Express Server
├─ Scope Validation
│  └─ openid, profile, email
├─ Role-Based Access Control
│  └─ user, admin
└─ Permission Checks
   └─ read, write, delete
```

### Layer 3: Token Management

```
Token Handling
├─ JWT Signature Verification
├─ Expiration Check
├─ Revocation Check (Introspection)
└─ Secure Storage
   └─ HttpOnly Cookie / Secure Storage
```

### Layer 4: Attack Prevention

```
CSRF Protection
├─ State Parameter
├─ SameSite Cookie
└─ PKCE (Proof Key)

XSS Prevention
├─ Input Validation
├─ Output Encoding
└─ Content Security Policy

Token Theft Prevention
├─ HTTPS Only
├─ HttpOnly Cookies
└─ Refresh Token Rotation
```

## ポート使用状況

| ポート | サービス | 説明 |
|--------|---------|------|
| 8080 | Express + Firestore Emulator | Webアプリケーション |
| 8081 | Keycloak | OAuthサーバー |
| 4000 | Firestore UI | データベースビューア |

## 環境変数（設定）

### .env ファイル（例）

```bash
# Keycloak
KEYCLOAK_URL=http://localhost:8081
KEYCLOAK_REALM=test
KEYCLOAK_CLIENT_ID=testapp
KEYCLOAK_CLIENT_SECRET=your-secret

# Firebase
GOOGLE_CLOUD_PROJECT=oidc-testapp
FIRESTORE_EMULATOR_HOST=localhost:8080

# Express
NODE_ENV=localhost
PORT=8080
DOMAIN=http://localhost:8080
```

## 参考資料

- [OAuth 2.0 Core](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
- [PKCE (RFC 7636)](https://tools.ietf.org/html/rfc7636)
- [OAuth 2.0 Security Topics](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)

