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
  return res.render('pkce.html', {
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
const REDIRECT_URI = 'http://localhost:8080/pkce/callback';

router.get('/request-authorization', async (req, res) => {

  console.log('[[ authorization code flow with pkce started ]]');

  /**
   * TODO: OpenID Configurationの取得
   */
  let config;
  try {
    config = await client.discovery(
      //server,
      new URL(SERVER),
      CLIENT_ID,
      CLIENT_SECRET,
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

  /**
   * TODO: PKCEのパラメーター生成とセッションへの保存
   */
  let code_verifier = client.randomPKCECodeVerifier();
  let code_challenge =
    await client.calculatePKCECodeChallenge(code_verifier);
  req.session.code_verifier = code_verifier;

  //let state = client.randomState();

  /**
   * TODO: AuthorizationリクエストのURL生成とリダイレクト処理
   */
  let redirectTo = client.buildAuthorizationUrl(
    config,
    {
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: 'openid email profile',
      code_challenge,
      code_challenge_method: 'S256',
    },
  );
  console.log('redirecting to', redirectTo.href);

  return res.redirect(307, redirectTo.href);
});

router.get('/callback', async (req, res) => {

  /**
   * TODO: OpenID Configurationの取得
   */
  let config;
  try {
    config = await client.discovery(
      new URL(SERVER),
      CLIENT_ID,
      CLIENT_SECRET,
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
   * TODO: TokenエンドポイントからAccess Tokenを取得しPKCEを検証
   */
  let tokens;
  try {
    tokens = await client.authorizationCodeGrant(
      config,
      new URL(req.protocol + '://' + req.get('host') + req.originalUrl),
      {
        // セッションに保存していたcode_verifierとTokenエンドポイントから取得した値の一致を検証
        pkceCodeVerifier: req.session.code_verifier,
        //expectedState: state,
      },
    );
  } catch (err) {
    if (err.code === 'OAUTH_INVALID_RESPONSE') {
      console.error(err.cause);
      return res.status(400).send('Security validation failed. Please try logging in again.' + err.cause);
    }
    if (err.code === 'OAUTH_JWT_CLAIM_COMPARISON_FAILED') {
      console.error(err.cause);
      return res.status(400).send('Security validation failed. Please try logging in again.' + err.cause);
    }
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
  console.log('Token Endpoint Response', tokens);

  /**
   * TODO: UserInfoエンドポイントからユーザー情報を取得
   */
  let userInfo;
  try {
    userInfo = await client.fetchUserInfo(
      config,
      tokens.access_token,
      tokens.claims().sub,
    );
  } catch (err) {
    if (err.code === 'OAUTH_JSON_ATTRIBUTE_COMPARISON_FAILED') {
      console.error(err.cause);
      return res.status(400).send('Security validation failed. Please try logging in again.' + err.cause);
    }
    console.error(err.cause);
    res.status(500).send('Internal Server Error');
  }
  console.log('ID Token sub:', tokens.claims().sub);
  console.log('userInfo:', userInfo);
  console.log('userInfo sub:', userInfo.sub);

  /**
   * TODO: セッション破棄
   */
  req.session.destroy();

  console.log('[[ authorization code flow with pkce finished ]]');

  return res.render('pkce_callback.html', {
    project_name: process.env.PROJECT_NAME,
    title: process.env.RP_NAME,
    sub: userInfo.sub,
  });
});

export { router as pkce };
