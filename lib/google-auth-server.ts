import {env} from 'cloudflare:workers';
import {database} from '@/lib/storage';
import {
  SESSION_COOKIE,OAUTH_COOKIE,SESSION_SECONDS,hashSessionToken,
  cookieValue,cookieHeader,safeGoogleProfile,googleAuthorizationUrl,
  oauthRedirectUri,randomUrlToken,sha256Base64Url,serializeOAuthFlow,readOAuthFlow,
  verifyGoogleIdToken,trustedOrigin,
} from '@/lib/google-auth-core';

export type GoogleSessionUser={
  userId:string;
  displayName:string;
  email:string;
  fullName:string|null;
  givenName:string|null;
  picture:string|null;
};
export function googleMode():boolean{return env.AUTH_PROVIDER==='google'}
export function googleConfigured():boolean{
  return googleMode()&&!!env.GOOGLE_CLIENT_ID&&!!env.GOOGLE_CLIENT_SECRET&&!!env.APP_PUBLIC_ORIGIN;
}
function config(){
  if(!googleConfigured())throw Error('Google OAuth has not been configured');
  return {clientId:env.GOOGLE_CLIENT_ID!,clientSecret:env.GOOGLE_CLIENT_SECRET!,origin:trustedOrigin(env.APP_PUBLIC_ORIGIN!)};
}
function redirect(destination:string,request:Request):Response{
  return new Response(null,{status:303,headers:{Location:new URL(destination,request.url).href}});
}
function cookieHeaders(response:Response,cookies:string[]):Response{
  cookies.forEach(cookie=>response.headers.append('Set-Cookie',cookie));
  response.headers.set('Cache-Control','no-store');
  response.headers.set('Referrer-Policy','no-referrer');
  return response;
}
function expiredCookie(name:string,secure:boolean):string{return cookieHeader(name,'',0,secure)}
function loginUrl(error?:string):string{return '/login'+(error?'?error='+encodeURIComponent(error):'')}
function sameOrigin(request:Request,origin:string):boolean{
  // Provider callbacks do not send Origin; compare the actual request URL.
  return new URL(request.url).origin===origin;
}

export async function googleLoginStart(request:Request):Promise<Response>{
  if(!googleMode())return redirect('/',request);
  if(!googleConfigured())return redirect(loginUrl('configuration'),request);
  const settings=config();
  if(!sameOrigin(request,settings.origin))return Response.json({error:'Incorrect host for Google sign-in.'},{status:400});
  const state=randomUrlToken();
  const nonce=randomUrlToken();
  const verifier=randomUrlToken(48);
  const codeChallenge=await sha256Base64Url(verifier);
  const url=googleAuthorizationUrl({...settings,state,nonce,codeChallenge});
  const response=new Response(null,{status:302,headers:{Location:url}});
  return cookieHeaders(response,[cookieHeader(OAUTH_COOKIE,serializeOAuthFlow({state,nonce,verifier,issuedAt:Date.now()}),600,settings.origin.startsWith('https://'))]);
}

type GoogleUserInfo={
  sub?:unknown;
  email?:unknown;
  email_verified?:unknown;
  name?:unknown;
  given_name?:unknown;
  picture?:unknown;
};
async function googleIdentity(code:string,verifier:string,nonce:string){
  const settings=config();
  const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({
      code,client_id:settings.clientId,client_secret:settings.clientSecret,
      redirect_uri:oauthRedirectUri(settings.origin),grant_type:'authorization_code',code_verifier:verifier,
    }),
  });
  if(!tokenResponse.ok)throw Error('Google OAuth code exchange failed');
  const token=(await tokenResponse.json()) as {id_token?:unknown;access_token?:unknown};
  if(typeof token.id_token!=='string'||typeof token.access_token!=='string')throw Error('Google did not return both required tokens');
  const keysResponse=await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if(!keysResponse.ok)throw Error('Google public signing keys unavailable');
  const claims=await verifyGoogleIdToken(token.id_token,await keysResponse.json(),settings.clientId,nonce);
  const profileResponse=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{
    headers:{Authorization:'Bearer '+token.access_token},
  });
  if(!profileResponse.ok)throw Error('Google user profile unavailable');
  const userinfo=(await profileResponse.json()) as GoogleUserInfo;
  if(userinfo.sub!==claims.sub||typeof userinfo.email!=='string'||userinfo.email.toLowerCase()!==claims.email.toLowerCase())throw Error('Google profile and verified identity disagree');
  // userinfo and the verified ID token must match. Permit Google to omit
  // optional profile fields but never accept unverified email.
  return safeGoogleProfile({
    sub:claims.sub,email:claims.email,email_verified:claims.email_verified,
    name:userinfo.name??claims.name,given_name:userinfo.given_name??claims.given_name,
    picture:userinfo.picture??claims.picture,
  });
}
async function linkGoogleIdentity(profile:ReturnType<typeof safeGoogleProfile>):Promise<string>{
  const db=database();
  const existing=await db.prepare('SELECT user_id FROM google_identities WHERE google_sub=?').bind(profile.sub).first<{user_id:string}>();
  let userId=existing?.user_id;
  if(!userId){
    // The previous Cloudflare Access identity used this stable user-id shape.
    // A VERIFIED Google email is allowed to claim its exact legacy identity.
    const legacyId='cloudflare:'+profile.email;
    const existingUser=await db.prepare('SELECT id FROM users WHERE id=?').bind(legacyId).first<{id:string}>();
    const legacyItems=await db.prepare('SELECT id FROM items WHERE user_id=? LIMIT 1').bind(legacyId).first<{id:string}>();
    if(existingUser||legacyItems)userId=legacyId;
    else {
      // Older ChatGPT-authenticated accounts may have other opaque IDs.
      // Reuse only when there is one unambiguous matching verified email.
      const matches=await db.prepare('SELECT id FROM users WHERE LOWER(email)=? LIMIT 2').bind(profile.email).all<{id:string}>();
      userId=matches.results.length===1?matches.results[0].id:'google:'+profile.sub;
    }
  }
  const now=new Date().toISOString();
  await db.prepare(`
    INSERT INTO google_identities(google_sub,user_id,email,full_name,given_name,picture_url,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?)
    ON CONFLICT(google_sub) DO UPDATE SET email=excluded.email,
      full_name=excluded.full_name,given_name=excluded.given_name,
      picture_url=excluded.picture_url,updated_at=excluded.updated_at
  `).bind(profile.sub,userId,profile.email,profile.name,profile.givenName,profile.picture,now,now).run();
  return userId;
}

export async function googleLoginCallback(request:Request):Promise<Response>{
  if(!googleMode())return redirect('/',request);
  if(!googleConfigured())return redirect(loginUrl('configuration'),request);
  const settings=config();
  if(!sameOrigin(request,settings.origin))return Response.json({error:'Incorrect Google callback origin.'},{status:400});
  const url=new URL(request.url);
  const flow=readOAuthFlow(cookieValue(request.headers.get('cookie'),OAUTH_COOKIE));
  const isHttps=settings.origin.startsWith('https://');
  const clear=expiredCookie(OAUTH_COOKIE,isHttps);
  if(url.searchParams.has('error'))return cookieHeaders(redirect(loginUrl('cancelled'),request),[clear]);
  if(!flow||url.searchParams.get('state')!==flow.state||!url.searchParams.get('code'))return cookieHeaders(redirect(loginUrl('expired'),request),[clear]);
  try{
    const profile=await googleIdentity(url.searchParams.get('code')!,flow.verifier,flow.nonce);
    await linkGoogleIdentity(profile);
    const session=randomUrlToken(40);
    const hash=await hashSessionToken(session);
    const now=Date.now();
    await database().prepare('INSERT INTO auth_sessions(token_hash,google_sub,created_at,expires_at) VALUES(?,?,?,?)')
      .bind(hash,profile.sub,new Date(now).toISOString(),new Date(now+SESSION_SECONDS*1000).toISOString()).run();
    return cookieHeaders(redirect('/',request),[
      clear,
      cookieHeader(SESSION_COOKIE,session,SESSION_SECONDS,isHttps),
    ]);
  }catch(error){
    console.error('Google sign-in error:',error instanceof Error?error.message:'unknown');
    return cookieHeaders(redirect(loginUrl('failed'),request),[clear]);
  }
}

export async function googleSessionUser(cookie:string|null):Promise<GoogleSessionUser|null>{
  const token=cookieValue(cookie,SESSION_COOKIE);
  if(!token||!/^[a-zA-Z0-9_-]{43,128}$/.test(token))return null;
  const hash=await hashSessionToken(token);
  const record=await database().prepare(`
    SELECT g.user_id,g.email,g.full_name,g.given_name,g.picture_url
    FROM auth_sessions s JOIN google_identities g ON s.google_sub=g.google_sub
    WHERE s.token_hash=? AND s.expires_at>?
  `).bind(hash,new Date().toISOString()).first<{
    user_id:string;email:string;full_name:string|null;given_name:string|null;picture_url:string|null;
  }>();
  if(!record)return null;
  return {
    userId:record.user_id,email:record.email,
    displayName:record.full_name||record.given_name||record.email,
    fullName:record.full_name,givenName:record.given_name,picture:record.picture_url,
  };
}
export async function googleLogout(request:Request):Promise<Response>{
  if(!googleMode())return Response.redirect(new URL('/cdn-cgi/access/logout',request.url),303);
  const configured=config();
  if(!sameOrigin(request,configured.origin)||request.headers.get('origin')&&request.headers.get('origin')!==configured.origin)return Response.json({error:'Forbidden'},{status:403});
  const token=cookieValue(request.headers.get('cookie'),SESSION_COOKIE);
  if(token&&/^[a-zA-Z0-9_-]{43,128}$/.test(token)){
    await database().prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(await hashSessionToken(token)).run();
  }
  return cookieHeaders(redirect('/login',request),[expiredCookie(SESSION_COOKIE,configured.origin.startsWith('https://'))]);
}
