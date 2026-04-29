# Seccamp 2026 mini OAuth 2.0 & OpenID Connect

Test app before hands-on

## How to run locally

### Prerequisite

* node.js 24
* gcloud
* java 26+

### Install

```shell
npm i
```

### Bulid

```shell
npm run build
```

### Run

```shell
docker run -p 127.0.0.1:18080:8080 -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak:26.6.1 start-dev
npm run emulator & npm run dev
```

Open [http://localhost:8080](http://localhost:8080).

