const sessionName='__Host-sf-session';
const oauthName='__Host-sf-oauth';
const sessionSeconds=8*60*60;
function cookieValue(request,name){
  return request.headers.get('cookie')?.split(/;\s*/).find(value=>value.startsWith(name+'='))?.slice(name.length+1);
}
function cookie(name,value,lifetime){
  return name+'='+value+'; Max-Age='+lifetime+'; Path=/; Secure; HttpOnly; SameSite=Lax';
}
function toBase64(bytes){
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
const randomToken=()=>toBase64(crypto.getRandomValues(new Uint8Array(32)));
async function hash(value){
  return toBase64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))));
}
function redirectWithCookies(destination,cookies=[]){
  const headers=new Headers({location:destination,'cache-control':'no-store','referrer-policy':'no-referrer'});
  for(const entry of cookies)headers.append('set-cookie',entry);
  return new Response(null,{status:303,headers});
}
function authError(message,status){
  return new Response(message,{status,headers:{'content-type':'text/plain;charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer'}});
}
function returnPath(value){
  const allowed=new Set(['/','/storefront.html','/account.html','/checkout.html','/workflow.html','/analysis.html']);
  try{
    const url=new URL(value||'/account.html','https://local.invalid');
    if(!value?.startsWith('/')||url.origin!=='https://local.invalid'||!allowed.has(url.pathname))return '/account.html';
    return url.pathname+url.search;
  }catch{return '/account.html';}
}
async function googleAuth(request,env,url){
  if(request.method!=='GET')return authError('Method not allowed',405);
  if(!env.DB||!env.GOOGLE_CLIENT_ID||!env.GOOGLE_CLIENT_SECRET||!env.COMMERCE_PUBLIC_ORIGIN||url.origin!==env.COMMERCE_PUBLIC_ORIGIN||url.protocol!=='https:'){
    return authError('Sign-in is available on the configured production domain after Google OAuth is set up.',503);
  }
  const callback=url.origin+'/auth/google/callback';
  if(url.pathname==='/signin-with-chatgpt'||url.pathname==='/auth/google'){
    const state=randomToken(), verifier=randomToken();
    const destination=new URL('https://accounts.google.com/o/oauth2/v2/auth');
    destination.search=new URLSearchParams({
      client_id:env.GOOGLE_CLIENT_ID,redirect_uri:callback,response_type:'code',scope:'openid email',
      state,code_challenge:await hash(verifier),code_challenge_method:'S256',prompt:'select_account'
    });
    const data=encodeURIComponent(JSON.stringify({state,verifier,path:returnPath(url.searchParams.get('return_to'))}));
    return redirectWithCookies(destination.href,[cookie(oauthName,data,600)]);
  }
  const clear=cookie(oauthName,'',0);
  let state;
  try{state=JSON.parse(decodeURIComponent(cookieValue(request,oauthName)||''));}
  catch{return authError('Sign-in expired. Please start again.',400);}
  const code=url.searchParams.get('code');
  if(!code||!state.state||state.state!==url.searchParams.get('state')||!/^[\w-]{43}$/.test(state.verifier)){
    return authError('Invalid sign-in response. Please start again.',400);
  }
  const token=await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',body:new URLSearchParams({code,client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,
      redirect_uri:callback,grant_type:'authorization_code',code_verifier:state.verifier}),redirect:'error',signal:AbortSignal.timeout(10000)
  });
  if(!token.ok)return authError('Google rejected the authorization code. Please sign in again.',401);
  const {access_token}=await token.json();
  if(typeof access_token!=='string'||!access_token)return authError('Google sign-in could not be verified.',401);
  const response=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{
    headers:{authorization:'Bearer '+access_token},redirect:'error',signal:AbortSignal.timeout(10000)
  });
  if(!response.ok)return authError('Google profile could not be verified.',401);
  const profile=await response.json();
  if(profile.email_verified!==true||typeof profile.email!=='string'||!/^[\w-]{1,128}$/.test(profile.sub||'')){
    return authError('A verified Google email is required.',403);
  }
  const session=randomToken(), now=Math.floor(Date.now()/1000);
  const entries=[env.DB.prepare('DELETE FROM commerce_sessions WHERE expires_at <= ?').bind(now)];
  const previous=cookieValue(request,sessionName);
  if(/^[\w-]{43}$/.test(previous||''))entries.push(env.DB.prepare('DELETE FROM commerce_sessions WHERE token_hash=?').bind(await hash(previous)));
  entries.push(env.DB.prepare('INSERT INTO commerce_sessions (token_hash,subject,email,expires_at) VALUES (?,?,?,?)')
    .bind(await hash(session),'google:'+profile.sub,profile.email,now+sessionSeconds));
  await env.DB.batch(entries);
  return redirectWithCookies(url.origin+returnPath(state.path),[clear,cookie(sessionName,session,sessionSeconds)]);
}
async function pagesFetch(request,env){
  const url=new URL(request.url);
  try{
    if(['/signin-with-chatgpt','/auth/google','/auth/google/callback'].includes(url.pathname))return await googleAuth(request,env,url);
    const token=cookieValue(request,sessionName);
    const hasToken=/^[\w-]{43}$/.test(token||'');
    if(url.pathname==='/signout-with-chatgpt'||url.pathname==='/auth/logout'){
      if(request.method!=='GET')return authError('Method not allowed',405);
      if(hasToken)await env.DB.prepare('DELETE FROM commerce_sessions WHERE token_hash=?').bind(await hash(token)).run();
      return redirectWithCookies(url.origin+returnPath(url.searchParams.get('return_to')),[cookie(sessionName,'',0),cookie(oauthName,'',0)]);
    }
    const headers=new Headers(request.headers);
    headers.delete('oai-authenticated-user-id');
    headers.delete('oai-authenticated-user-email');
    if(hasToken&&url.origin===env.COMMERCE_PUBLIC_ORIGIN){
      const session=await env.DB.prepare('SELECT subject,email FROM commerce_sessions WHERE token_hash=? AND expires_at>?')
        .bind(await hash(token),Math.floor(Date.now()/1000)).first();
      if(session){
        headers.set('oai-authenticated-user-id',session.subject);
        headers.set('oai-authenticated-user-email',session.email);
      }
    }
    return await commerceWorker.fetch(new Request(request,{headers}),env);
  }catch{
    return authError('The shop is temporarily unavailable.',503);
  }
}
export default {fetch:pagesFetch};
