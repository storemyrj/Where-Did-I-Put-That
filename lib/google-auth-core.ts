/** OAuth/OIDC protocol helpers with no access to secrets or Cloudflare bindings. */

export const SESSION_COOKIE='wdipt_session';
export const OAUTH_COOKIE='wdipt_oauth';
export const SESSION_SECONDS=60*60*24*14;
export const OAUTH_SECONDS=60*10;

export type GoogleClaims={
  sub:string;
  email:string;
  email_verified:boolean;
  name?:string;
  given_name?:string;
  picture?:string;
  nonce:string;
  iss:string;
  aud:string;
  exp:number;
  iat:number;
};

export function encodeBase64Url(data:Uint8Array):string{
  let binary='';
  for(const byte of data)binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
}
export function decodeBase64Url(data:string):Uint8Array{
  if(!/^[a-zA-Z0-9_-]+$/.test(data)||data.length>100_000)throw Error('Malformed encoded input');
  const padded=data.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(data.length/4)*4,'=');
  return Uint8Array.from(atob(padded),char=>char.charCodeAt(0));
}
export function randomUrlToken(bytes=32):string{
  const random=new Uint8Array(bytes);
  crypto.getRandomValues(random);
  return encodeBase64Url(random);
}
export async function sha256Base64Url(value:string):Promise<string>{
  return encodeBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))));
}
export async function hashSessionToken(token:string):Promise<string>{
  return sha256Base64Url(token);
}
export function trustedOrigin(value:string):string{
  let url:URL;
  try{url=new URL(value)}catch{throw Error('APP_PUBLIC_ORIGIN must be a full URL');}
  const loopback=url.hostname==='localhost'||url.hostname==='127.0.0.1';
  if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||!(url.protocol==='https:'||(loopback&&url.protocol==='http:')))throw Error('Invalid APP_PUBLIC_ORIGIN');
  return url.origin;
}
export function oauthRedirectUri(origin:string):string{
  return trustedOrigin(origin)+'/auth/google/callback';
}
export function cookieValue(header:string|null,name:string):string|null{
  if(!header)return null;
  for(const part of header.split(';')){
    const trimmed=part.trim();
    if(trimmed.startsWith(name+'='))return trimmed.slice(name.length+1);
  }
  return null;
}
export function cookieHeader(name:string,value:string,seconds:number,secure:boolean):string{
  return name+'='+value+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+seconds+(secure?'; Secure':'');
}
export function serializeOAuthFlow(payload:{state:string;nonce:string;verifier:string;issuedAt:number}):string{
  return encodeBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}
export function readOAuthFlow(raw:string|null,now=Date.now()):{state:string;nonce:string;verifier:string}|null{
  if(!raw||raw.length>3000)return null;
  try{
    const flow=JSON.parse(new TextDecoder().decode(decodeBase64Url(raw))) as Record<string,unknown>;
    if(typeof flow.state!=='string'||!/^[-_a-zA-Z0-9]{30,}$/.test(flow.state)||typeof flow.nonce!=='string'||!/^[-_a-zA-Z0-9]{30,}$/.test(flow.nonce)||typeof flow.verifier!=='string'||!/^[-_a-zA-Z0-9]{43,128}$/.test(flow.verifier)||typeof flow.issuedAt!=='number'||now-flow.issuedAt<0||now-flow.issuedAt>OAUTH_SECONDS*1000)return null;
    return {state:flow.state,nonce:flow.nonce,verifier:flow.verifier};
  }catch{return null;}
}
export function googleAuthorizationUrl(args:{
  clientId:string;origin:string;state:string;nonce:string;codeChallenge:string;
}):string{
  const u=new URL('https://accounts.google.com/o/oauth2/v2/auth');
  u.search=new URLSearchParams({
    response_type:'code',client_id:args.clientId,redirect_uri:oauthRedirectUri(args.origin),
    scope:'openid profile email',state:args.state,nonce:args.nonce,
    code_challenge:args.codeChallenge,code_challenge_method:'S256',
    access_type:'online',prompt:'select_account',
  }).toString();
  return u.toString();
}
export function safeGooglePicture(raw:unknown):string|null{
  if(typeof raw!=='string'||raw.length>1500)return null;
  try{
    const u=new URL(raw);
    if(u.protocol!=='https:'||!/(^|\.)googleusercontent\.com$/i.test(u.hostname)||u.username||u.password)return null;
    return u.href;
  }catch{return null;}
}
export function safeGoogleProfile(body:unknown):{sub:string;email:string;name:string|null;givenName:string|null;picture:string|null}{
  if(!body||typeof body!=='object')throw Error('Google profile missing');
  const p=body as Record<string,unknown>;
  if(typeof p.sub!=='string'||!p.sub||p.sub.length>255||typeof p.email!=='string'||p.email.length>254||p.email_verified!==true)throw Error('Google identity must have verified email');
  const name=typeof p.name==='string'?p.name.trim().slice(0,150)||null:null;
  const givenName=typeof p.given_name==='string'?p.given_name.trim().slice(0,70)||null:null;
  return {sub:p.sub,email:p.email.trim().toLowerCase(),name,givenName,picture:safeGooglePicture(p.picture)};
}
export async function verifyGoogleIdToken(token:string,jwks:unknown,clientId:string,nonce:string,now=Math.floor(Date.now()/1000)):Promise<GoogleClaims>{
  const parts=token.split('.');
  if(parts.length!==3)throw Error('Invalid Google ID token');
  const header=JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0]))) as Record<string,unknown>;
  if(header.alg!=='RS256'||typeof header.kid!=='string')throw Error('Unsupported Google token signing algorithm');
  const keys=(jwks as {keys?:unknown[]})?.keys;
  if(!Array.isArray(keys))throw Error('Google public signing keys missing');
  const jwk=keys.find(k=>typeof k==='object'&&k!==null&&(k as Record<string,unknown>).kid===header.kid&&(k as Record<string,unknown>).kty==='RSA') as JsonWebKey|undefined;
  if(!jwk)throw Error('Google public signing key not found');
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const signedData=new TextEncoder().encode(parts[0]+'.'+parts[1]);
  const verified=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,new Uint8Array(decodeBase64Url(parts[2])),signedData);
  if(!verified)throw Error('Invalid Google ID token signature');
  const claims=JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1]))) as GoogleClaims;
  if(!['https://accounts.google.com','accounts.google.com'].includes(claims.iss)||claims.aud!==clientId||claims.nonce!==nonce||claims.exp<=now||claims.iat>now+60||!claims.sub||claims.email_verified!==true)throw Error('Google ID token claims rejected');
  return claims;
}
