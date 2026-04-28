/*
 * @license
 * Copyright 2026 Masaru Kurahayashi. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License
 */

import express from 'express';
import * as client from 'openid-client';
const router = express.Router();

router.get('/', (req, res) => {
  return res.render('implicit.html', {
    project_name: process.env.PROJECT_NAME,
    title: process.env.RP_NAME,
  });
});

/**
 * TODO: クライアントの設定
 */
const SERVER = 'http://localhost:18080/realms/master';
const CLIENT_ID = 'my-client-id';
const CLIENT_SECRET = 'lP0jDTm5UocUsN3g31q6PBH733jHnKPH';
const REDIRECT_URI = 'http://localhost:8080/implicit/callback';

router.get('/request-authorization', async (req, res) => {

  console.log('[[ implicit flow started ]]');

  /**
   * TODO: OpenID Configurationの取得
   */
  let config;
  try {
    config = await client.discovery(
      new URL(SERVER),
      CLIENT_ID,
      undefined,
      undefined,
      {
        // ローカル開発用にHTTPを許可する。本番ではHTTPSを使用してください。
        execute: [client.allowInsecureRequests],
      },
    );
  } catch (err) {
    console.error('Discovery failed details:', err.message);
    console.error('Response body:', err.response?.body);
    res.status(500).send('Internal Server Error');
  }
  console.log(config);

  //let state;

  /**
   * TODO: AuthorizationリクエストのURL生成とリダイレクト処理
   */
  let redirectTo = client.buildAuthorizationUrl(
    config,
    {
      response_type: 'token',
      redirect_uri: REDIRECT_URI,
      scope: 'openid email profile',
    },
  );
  console.log('redirecting to', redirectTo.href);

  return res.redirect(307, redirectTo.href);
});

router.get('/callback', (req, res) => {
  return res.render('implicit_callback.html', {
    project_name: process.env.PROJECT_NAME,
    title: process.env.RP_NAME,
  });
});

router.post('/login', async (req, res) => {

  /**
   * TODO: OpenID Configurationの取得
   */
  let config;
  try {
    config = await client.discovery(
      new URL(SERVER),
      CLIENT_ID,
      undefined,
      undefined,
      {
        // ローカル開発用にHTTPを許可する。本番ではHTTPSを使用してください。
        execute: [client.allowInsecureRequests],
      },
    );
  } catch (err) {
    console.error('Discovery failed details:', err.message);
    console.error('Response body:', err.response?.body);
    res.status(500).send('Internal Server Error');
  }
  console.log('userinfo_endpoint: ', config.serverMetadata().userinfo_endpoint);

  /**
   * TODO: UserInfoエンドポイントからユーザー情報を取得
   */
  let userInfo;
  try {
    userInfo = await client.fetchUserInfo(
      config,
      req.body.access_token,
      client.skipSubjectCheck,
    );
  } catch (err) {
    console.error(err.cause);
    res.status(500).send('Internal Server Error');
  }
  console.log('userInfo:', userInfo);
  console.log('userInfo sub:', userInfo.sub);

  console.log('[[ implicit flow started ]]');

  let response = {
    sub: userInfo.sub,
  };
  return res.json(response);
});

export { router as implicit };
