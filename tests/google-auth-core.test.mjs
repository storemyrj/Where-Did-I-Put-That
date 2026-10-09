import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeBase64Url,decodeBase64Url,randomUrlToken,sha256Base64Url,hashSessionToken,
  cookieValue,cookieHeader,serializeOAuthFlow,readOAuthFlow,googleAuthorizationUrl,
  safeGooglePicture,safeGoogleProfile,verifyGoogleIdToken,trustedOrigin,
} from '../lib/google-auth-core.ts';

test('OAuth URL has exact redirect and narrow Google profile scopes',async()=>{
  const url=new URL(googleAuthorizationUrl({clientId:'test-client',origin:'https://where-did-i-put-that.storemyrj.workers.dev',state:'state',nonce:'nonce',codeChallenge:'challenge'}));
  assert.equal(url.hostname,'accounts.google.com');
  assert.equal(url.searchParams.get('redirect_uri'),'https://where-did-i-put-that.storemyrj.workers.dev/auth/google/callback');
  assert.equal(url.searchParams.get('scope'),'openid profile email');
  assert.equal(url.searchParams.get('code_challenge_method'),'S256');
  assert.equal(url.searchParams.get('response_type'),'code');
  assert.equal(url.searchParams.get('access_type'),'online');
  assert.equal(url.searchParams.get('state'),'state');
});

test('Public app origin forbids unsafe schemes and unexpected paths',()=>{
  assert.equal(trustedOrigin('https://example.org/'),'https://example.org');
  assert.equal(trustedOrigin('http://127.0.0.1:8787/'),'http://127.0.0.1:8787');
  for(const url of ['http://example.org/','https://example.org/path','https://user:pass@example.org/','https://example.org/?foo=1','file:///app'])assert.throws(()=>trustedOrigin(url));
});

test('PKCE and opaque session identifiers are unpredictable and consistently hashed',async()=>{
  const random=randomUrlToken(48);
  assert.equal(decodeBase64Url(random).length,48);
  assert.notEqual(random,randomUrlToken(48));
  assert.equal((await sha256Base64Url('abc')), 'ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0');
  assert.equal(await hashSessionToken(random),await hashSessionToken(random));
  assert.notEqual(await hashSessionToken(random),await hashSessionToken(randomUrlToken(48)));
});

test('Cookie supports HttpOnly SameSite and expiry',()=>{
  const cookie=cookieHeader('wdipt_session','token',100,true);
  assert.match(cookie,/HttpOnly/);
  assert.match(cookie,/SameSite=Lax/);
  assert.match(cookie,/; Secure/);
  assert.match(cookie,/Max-Age=100/);
  assert.equal(cookieValue('a=1; wdipt_session=abcde; b=2','wdipt_session'),'abcde');
  assert.equal(cookieValue('other=abc','wdipt_session'),null);
});

test('OAuth state is time-limited, encoded and rejects arbitrary values',()=>{
  const initial={state:randomUrlToken(),nonce:randomUrlToken(),verifier:randomUrlToken(48),issuedAt:1700000000000};
  const encoded=serializeOAuthFlow(initial);
  assert.deepEqual(readOAuthFlow(encoded,initial.issuedAt+9*60*1000),{state:initial.state,nonce:initial.nonce,verifier:initial.verifier});
  assert.equal(readOAuthFlow(encoded,initial.issuedAt+11*60*1000),null);
  assert.equal(readOAuthFlow(encoded,initial.issuedAt-5),null);
  assert.equal(readOAuthFlow('not-base64'),null);
});

test('Untrusted profile image domains and unverified email rejected',()=>{
  assert.equal(safeGooglePicture('https://lh3.googleusercontent.com/a/AA'),'https://lh3.googleusercontent.com/a/AA');
  assert.equal(safeGooglePicture('https://googleusercontent.com/a.jpg'),'https://googleusercontent.com/a.jpg');
  for(const v of ['javascript:alert(1)','http://lh3.googleusercontent.com/image','https://googleusercontent.com.evil.example/image','https://evil.google.com/image',null])assert.equal(safeGooglePicture(v),null);
  assert.throws(()=>safeGoogleProfile({sub:'1',email:'test@example.org',email_verified:false}));
  const profile=safeGoogleProfile({sub:'stable-id',email:'TEST@EXAMPLE.ORG',email_verified:true,name:'Mia Hansen',given_name:'Mia',picture:'https://lh3.googleusercontent.com/a/AA'});
  assert.deepEqual(profile,{sub:'stable-id',email:'test@example.org',name:'Mia Hansen',givenName:'Mia',picture:'https://lh3.googleusercontent.com/a/AA'});
});

test('Signed Google ID token verifies signature, issuer, audience, nonce, email and expiry',async()=>{
  const keyPair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
  const jwk=await crypto.subtle.exportKey('jwk',keyPair.publicKey);
  const jwks={keys:[{...jwk,kid:'key123',alg:'RS256',use:'sig'}]};
  const now=Math.floor(Date.now()/1000);
  const baseClaims={iss:'https://accounts.google.com',aud:'our-client',sub:'subject',email:'mia@example.org',email_verified:true,nonce:'random-nonce',iat:now,exp:now+3600,name:'Mia Hansen',given_name:'Mia'};
  async function signed(claims=baseClaims){
    const header=encodeBase64Url(new TextEncoder().encode(JSON.stringify({alg:'RS256',kid:'key123',typ:'JWT'})));
    const body=encodeBase64Url(new TextEncoder().encode(JSON.stringify(claims)));
    const unsigned=header+'.'+body;
    const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keyPair.privateKey,new TextEncoder().encode(unsigned));
    return unsigned+'.'+encodeBase64Url(new Uint8Array(sig));
  }
  const token=await signed();
  const verified=await verifyGoogleIdToken(token,jwks,'our-client','random-nonce');
  assert.equal(verified.sub,'subject');
  await assert.rejects(()=>verifyGoogleIdToken(token,jwks,'other-client','random-nonce'));
  await assert.rejects(()=>verifyGoogleIdToken(token,jwks,'our-client','wrong-nonce'));
  const editedPayload=encodeBase64Url(new TextEncoder().encode(JSON.stringify({...baseClaims,email:'attacker@example.org'})));
  await assert.rejects(()=>verifyGoogleIdToken(token.split('.')[0]+'.'+editedPayload+'.'+token.split('.')[2],jwks,'our-client','random-nonce'));
  await assert.rejects(()=>signed({...baseClaims,exp:now-1}).then(expired=>verifyGoogleIdToken(expired,jwks,'our-client','random-nonce')));
  await assert.rejects(()=>signed({...baseClaims,iss:'https://evil.example'}).then(token=>verifyGoogleIdToken(token,jwks,'our-client','random-nonce')));
  await assert.rejects(()=>signed({...baseClaims,email_verified:false}).then(token=>verifyGoogleIdToken(token,jwks,'our-client','random-nonce')));
});
