import {createHmac,createHash,timingSafeEqual} from 'node:crypto';
import {handleAssistantApi} from './assistant.js';import {handleGenerateCctp} from './generer-cctp.js';import {handleDefineTerm} from './definir-terme.js';import {handlePlanVision} from './analyser-plan-vision.js';import {handleStatusIA} from './status-ia.js';
const cookieName='metre_owner';const sign=(s,p)=>createHmac('sha256',p).update(s).digest('base64url');const equal=(a,b)=>timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
export function portableSession(cookie,password,now=Date.now()){if(!password||password.length<16)return false;const raw=(cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'',parts=raw.split('.');return parts.length===2&&/^\d+$/.test(parts[0])&&Number(parts[0])>now&&Number(parts[0])<now+9*3600000&&equal(parts[1],sign(parts[0],password));}
export function portableCookie(password,now=Date.now()){const expiry=String(now+8*3600000);return cookieName+'='+expiry+'.'+sign(expiry,password)+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800';}
const json=(r,status=200,headers={})=>new Response(JSON.stringify(r),{status,headers:{'content-type':'application/json;charset=utf-8','cache-control':'private, no-store',...headers}});
const failures=new Map();
export async function handlePortableRequest(request,env={}, {fetcher=fetch,now=Date.now()}={}){
 const url=new URL(request.url),route=url.pathname.split('/').pop(),password=env.APP_PASSWORD||'',configured=password.length>=16,authenticated=portableSession(request.headers.get('cookie'),password,now);
 if(!['GET','HEAD'].includes(request.method)&&request.headers.get('origin')!==url.origin)return json({error:'Origine non autorisée.'},403);
 if(route==='portable-auth'){
  if(request.method==='GET')return json({configured,authenticated});if(request.method!=='POST')return json({error:'Méthode non autorisée.'},405,{allow:'GET, POST'});
  let body;try{const text=await request.text();if(text.length>1024)return json({error:'Demande trop volumineuse.'},413);body=JSON.parse(text);}catch{return json({error:'JSON invalide.'},400);}
  if(body.action==='logout')return json({authenticated:false},200,{'set-cookie':cookieName+'=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'});
  if(!configured)return json({error:'Configurez APP_PASSWORD côté serveur (16 caractères minimum).'},503);
  const ip=request.headers.get('x-real-ip')||'unknown',entry=failures.get(ip);if(entry&&entry.until>now&&entry.n>=6)return json({error:'Trop de tentatives. Réessayez dans deux minutes.'},429,{'retry-after':'120'});
  if(typeof body.password!=='string'||body.password.length>256||!equal(body.password,password)){if(failures.size>1000)failures.clear();failures.set(ip,{n:entry?.until>now?entry.n+1:1,until:now+120000});return json({error:'Mot de passe incorrect.'},401);}
  failures.delete(ip);return json({authenticated:true},200,{'set-cookie':portableCookie(password,now)});
 }
 if(!configured)return json({error:'Connexion IA non configurée : ajoutez APP_PASSWORD dans Vercel.'},503);if(!authenticated)return json({error:'Connexion IA requise : utilisez le bouton « Connexion IA » de l’en-tête.'},401);
 const routes={'analyse-metre':handleAssistantApi,'generer-cctp':handleGenerateCctp,'definir-terme':handleDefineTerm,'analyser-plan-vision':handlePlanVision,'status-ia':handleStatusIA},handler=routes[route];if(!handler)return json({error:'Route inconnue.'},404);
 try{return await handler(request,env,{fetcher});}catch(e){return json({error:e.status?e.message:'Demande impossible.'},e.status||500);}
}
export async function servePortableNodeApi(req,res){
 const host=req.headers.host,protocol=process.env.VERCEL?'https':'http';if(!host)return res.status(400).json({error:'Hôte absent.'});
 let body;try{if(!['GET','HEAD'].includes(req.method)){if(req.body!==undefined)body=typeof req.body==='string'?req.body:JSON.stringify(req.body);else{let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>4*1024*1024)return res.status(413).json({error:'Demande trop volumineuse pour ce déploiement.'});chunks.push(c);}body=Buffer.concat(chunks).toString('utf8');}if(Buffer.byteLength(body)>4*1024*1024)return res.status(413).json({error:'Demande trop volumineuse (4 Mio maximum sur Vercel).'});}
 const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(v!=null)headers.set(k,Array.isArray(v)?v.join('; '):String(v));const controller=new AbortController();req.on?.('aborted',()=>controller.abort());const response=await handlePortableRequest(new Request(protocol+'://'+host+req.url,{method:req.method,headers,body,signal:controller.signal}),{APP_PASSWORD:process.env.APP_PASSWORD,OPENAI_API_KEY:process.env.OPENAI_API_KEY});for(const [k,v]of response.headers)res.setHeader(k,v);res.status(response.status).send(await response.text());
 }catch{res.status(500).json({error:'Passerelle API autonome indisponible.'});}
}
