FROM node:24-alpine

WORKDIR /app

# Firebase tools をグローバルインストール
RUN npm install -g firebase-tools

# アプリケーション依存関係
COPY package.json package-lock.json ./
RUN npm ci

# Firebase設定ファイルをコピー
COPY firebase.json firestore.rules firestore.indexes.json ./

# Firebase Emulator用ポート
EXPOSE 4000 8082

# Firebase Emulatorを起動
CMD ["firebase", "emulators:start", "--project", "oidc-testapp", "--import=./.data", "--export-on-exit"]
