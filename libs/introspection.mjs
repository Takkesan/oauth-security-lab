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
  return res.render('introspection.html', {
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
const REDIRECT_URI = 'http://localhost:8080/introspection/callback';

router.get('/request-authorization', async (req, res) => {

  console.log('[[ token introspection started ]]');

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

  console.log('[[ token introspection finished ]]');

  return res.render('introspection_callback.html', {
    project_name: process.env.PROJECT_NAME,
    title: process.env.RP_NAME,
    sub: userInfo.sub,
    access_token: tokens.access_token,
  });
});

router.get('/myapi_tester', (req, res) => {
  return res.render('myapi_tester.html', {
    project_name: process.env.PROJECT_NAME,
    title: process.env.RP_NAME,
  });
});

router.post('/myapi_tester', async (req, res) => {

  const accessToken = req.body.access_token;
  console.log('Received body:', req.body);

  if (!accessToken) {
    console.error('access_token empty');
    return res.render('myapi_tester.html', {
      project_name: process.env.PROJECT_NAME,
      title: process.env.RP_NAME,
      message: 'access_token empty',
      time: '',
    });
  }

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
 
  let protectedResourceResponse = await client.fetchProtectedResource(
    config,
    req.body.access_token,
    new URL('http://localhost:8080/introspection/myapi'),
    'POST',
  )
  const myApiResponse = await protectedResourceResponse.json();

  return res.render('myapi_tester.html', {
    project_name: process.env.PROJECT_NAME,
    title: process.env.RP_NAME,
    message: myApiResponse.message,
    time: myApiResponse.time,
  });
});

router.post('/myapi', async (req, res) => {

  /**
   * TODO: BearerヘッダーからAccess Tokenを抽出
   */
  const accessToken = req.get('Authorization')?.replace('Bearer ', '');

  if (!accessToken) {
    console.error('access_token empty');
    return res.status(400).json({ message: 'access_token is required', error: 'access_token is required' });
  }

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
    return res.status(500).json({ message: 'invalid_token', error: 'Internal Server Error' });
  }
  console.log('introspection_endpoint: ', config.serverMetadata().introspection_endpoint);

  try {
    /**
     * TODO: Token InstrospectionでAccess Tokenの有効情報を取得
     */
    const introspectionResponse = await client.tokenIntrospection(
      config,
      accessToken,
    );

    /**
     * TODO: Access Tokenの有効性の検証
     */
    if (introspectionResponse.active) {
      console.log('access_token is valid:', introspectionResponse);
      console.log('sub:', introspectionResponse.sub);
      console.log('exp:', new Date(introspectionResponse.exp * 1000));

      // 許可されているClient IDのAccess Token以外はエラーとする
      console.log('client_id:', introspectionResponse.client_id);
      if (introspectionResponse.client_id != CLIENT_ID) {
        console.error('invalid client_id in access_token');
        return res.status(401).json({ message: 'invalid client_id in access_token' });
      }

      const currentTime = new Date(req.requestTime);
      let response = {
        message: 'Welcome to OAuth 2.0 and OpenID Connect World.',
        time: currentTime.toLocaleString(),
      };
      return res.json(response);
    } else {
      console.log('invalid access_token');
      return res.status(401).json({ message: 'invalid_token' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'invalid_token', error: 'Internal Server Error' });
  }
});


export { router as introspection };
