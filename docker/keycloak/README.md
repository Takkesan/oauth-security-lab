# Keycloak セットアップガイド

このガイドでは、Keycloak を Docker で起動し、OAuth 2.0 / OpenID Connect のテストアプリケーション用に設定する方法を説明します。

## 前提条件

- ✅ Docker がインストール済み
- ✅ Docker Compose がインストール済み
- ✅ ポート 8081 が利用可能

## 起動方法

### 1. Keycloak コンテナの起動

```bash
cd docker/keycloak
docker-compose up -d
```

**確認:**
```bash
docker-compose ps
# Status が "Up" になっていることを確認
```

### 2. Keycloak Admin Console にアクセス

ブラウザで以下にアクセス：
```
http://localhost:8081
```

**ログイン情報:**
- Username: `admin`
- Password: `admin`

## 初期設定

### 1. Realm の作成

1. **Admin Console** にログイン
2. 左上の「Keycloak」ドロップダウンをクリック
3. **「Create Realm」** をクリック
4. **Realm name** に `test` と入力
5. **Create** ボタンをクリック

### 2. Client の登録 (OAuth Testapp)

#### 2.1 新しいクライアント登録

1. 左メニュー: **Clients** をクリック
2. **Create client** をクリック
3. **Client ID** に `testapp` と入力
4. **Save** をクリック

#### 2.2 クライアント設定

**Settings タブ:**

| 項目 | 値 |
|------|-----|
| Client authentication | ON |
| Authorization | ON |
| Valid Redirect URIs | `http://localhost:8080/implicit`<br/>`http://localhost:8080/authz_code/callback`<br/>`http://localhost:8080/pkce/callback`<br/>`http://localhost:8080/introspection/callback` |
| Valid post logout redirect URIs | `http://localhost:8080` |
| Web origins | `http://localhost:8080` |

**Capability config:**
- ✅ Standard flow enabled
- ✅ Implicit flow enabled
- ✅ Direct access grants enabled
- ✅ Service accounts roles
- ✅ OpenID Connect

#### 2.3 Credentials の確認

1. **Credentials** タブをクリック
2. **Client secret** をコピーして、環境変数に設定

```bash
export CLIENT_SECRET="your-client-secret-here"
```

### 3. ユーザーの作成（テスト用）

1. 左メニュー: **Users** をクリック
2. **Create new user** をクリック
3. **Username**: `testuser`
4. **Save** をクリック
5. **Credentials** タブをクリック
6. **Set password** で新しいパスワード設定（例: `password123`）

## 各 OAuth Flow のセットアップ

### Level 1: Implicit Flow

**Keycloak 設定:**
- Client authentication: **OFF** (公開クライアント)
- Implicit flow: **ON**

```bash
# テスト
curl -X GET \
  "http://localhost:8081/realms/test/protocol/openid-connect/auth" \
  -G \
  --data-urlencode "client_id=testapp" \
  --data-urlencode "response_type=token" \
  --data-urlencode "redirect_uri=http://localhost:8080/implicit" \
  --data-urlencode "scope=openid"
```

### Level 2: Authorization Code Flow (CSRF 脆弱性版)

**Keycloak 設定:**
- Standard flow: **ON**
- Client authentication: **ON**

```bash
# Authorization Request
curl -X GET \
  "http://localhost:8081/realms/test/protocol/openid-connect/auth" \
  -G \
  --data-urlencode "client_id=testapp" \
  --data-urlencode "response_type=code" \
  --data-urlencode "redirect_uri=http://localhost:8080/authz_code/callback" \
  --data-urlencode "scope=openid"
```

### Level 3: PKCE Flow

**Keycloak 設定:**
- Standard flow: **ON**
- PKCE: **ON**

```bash
# Authorization Request with PKCE
CODE_CHALLENGE=$(echo -n "my_code_verifier_12345678901234567890" | sha256sum | cut -d' ' -f1)

curl -X GET \
  "http://localhost:8081/realms/test/protocol/openid-connect/auth" \
  -G \
  --data-urlencode "client_id=testapp" \
  --data-urlencode "response_type=code" \
  --data-urlencode "redirect_uri=http://localhost:8080/pkce/callback" \
  --data-urlencode "code_challenge=$CODE_CHALLENGE" \
  --data-urlencode "code_challenge_method=S256" \
  --data-urlencode "scope=openid"
```

### Level 4: Token Introspection

**Keycloak エンドポイント:**
```
POST /realms/test/protocol/openid-connect/token/introspect
```

**テスト例:**
```bash
curl -X POST \
  "http://localhost:8081/realms/test/protocol/openid-connect/token/introspect" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=testapp" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "token=YOUR_ACCESS_TOKEN"
```

## トラブルシューティング

### ポート 8081 が既に使用されている場合

```bash
# 別のポートで起動
docker-compose down
# docker-compose.yml の ports を編集
# "8082:8080" に変更
docker-compose up -d
```

### コンテナが起動しない場合

```bash
# ログを確認
docker-compose logs -f keycloak

# コンテナを再起動
docker-compose restart
```

### データをリセットしたい場合

```bash
docker-compose down -v  # ボリュームを削除
docker-compose up -d
```

## 参考資料

- [Keycloak Official Documentation](https://www.keycloak.org/documentation.html)
- [Keycloak Admin Console Guide](https://www.keycloak.org/docs/latest/server_admin/)
- [OAuth 2.0 with Keycloak](https://www.keycloak.org/docs/latest/securing_apps/)

