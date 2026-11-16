import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';

export function demoRecordingUrl(value) {
  const url=new URL(value);
  if(url.protocol!=='http:'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password)
    throw new Error('Enregistre uniquement une instance locale HTTP, sans identifiants.');
  url.pathname='/';url.search='?demo=true';url.hash='';return url.href;
}
export function runProcess(command,args,{timeout=120000,cwd}={}) {
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{shell:false,cwd,windowsHide:true,stdio:['ignore','pipe','pipe']});
    let out='',err='',expired=false;
    child.stdout.on('data',b=>out=(out+b).slice(-32000));child.stderr.on('data',b=>err=(err+b).slice(-32000));
    const timer=setTimeout(()=>{expired=true;child.kill('SIGKILL');},timeout);
    child.on('error',error=>{clearTimeout(timer);reject(error);});
    child.on('close',code=>{clearTimeout(timer);if(code===0&&!expired)resolve({out,err});else reject(new Error(expired?'Délai dépassé pour '+command:command+' : '+err.slice(-2000)));});
  });
}
export async function mediaDuration(ffmpeg,file) {
  const {err}=await runProcess(ffmpeg,['-hide_banner','-i',file,'-t','0','-f','null','-']);
  const match=err.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if(!match)throw new Error('Durée du média introuvable : '+file);
  return Number(match[1])*3600+Number(match[2])*60+Number(match[3]);
}
export function montageArgs({video,audio,output,duration,offset=0,captureDuration=duration}) {
  if(!Number.isFinite(duration)||duration<=0||!Number.isFinite(offset)||offset<0)throw new Error('Durée de montage invalide.');
  if(!Number.isFinite(captureDuration)||captureDuration<=0)throw new Error('Capture vide.');
  // Toute l'action reste visible. Le temps de la capture est adapté à la voix,
  // puis la dernière image est prolongée : aucune fin de scénario n'est coupée.
  return ['-hide_banner','-loglevel','error','-y','-ss',String(offset),'-i',video,'-i',audio,
    '-map','0:v:0','-map','1:a:0','-vf','trim=duration='+captureDuration+',setpts=(PTS-STARTPTS)*'+(duration/captureDuration)+',scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=25,tpad=stop_mode=clone:stop_duration='+duration,
    '-af','apad','-t',String(duration),'-c:v','libx264','-preset','fast','-crf','25','-pix_fmt','yuv420p',
    '-c:a','aac','-b:a','96k','-ar','48000','-movflags','+faststart',output];
}
const stamp=seconds=>{
  const n=Math.round(seconds*1000);
  return String(Math.floor(n/3600000)).padStart(2,'0')+':'+String(Math.floor(n/60000)%60).padStart(2,'0')+':'+String(Math.floor(n/1000)%60).padStart(2,'0')+'.'+String(n%1000).padStart(3,'0');
};
export function captionsFor(text,duration) {
  const words=text.trim().split(/\s+/),chunks=[];let line='';
  for(const word of words){if((line+' '+word).length>110&&line){chunks.push(line);line='';}line+=(line?' ':'')+word;}
  if(line)chunks.push(line);
  let cursor=0;
  return 'WEBVTT\n\n'+chunks.map((chunk,i)=>{const start=cursor;cursor+=duration*chunk.split(/\s+/).length/words.length;
    return `${i+1}\n${stamp(start)} --> ${stamp(Math.max(start+.001,cursor))}\n${chunk.replace(/-->/g,'→').replace(/[<>]/g,'')}\n`;}).join('\n');
}
export async function assertPublishable(file) {
  const info=await stat(file);
  if(info.size<1024)throw new Error('Vidéo vide : '+file);
  if(info.size>24*1024*1024)throw new Error('Vidéo supérieure à 24 Mio : raccourcis le scénario ou augmente la compression avant publication.');
  return info.size;
}
