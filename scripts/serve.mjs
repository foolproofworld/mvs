import http from 'node:http';
import {createReadStream, statSync} from 'node:fs';
import {resolve, extname, sep} from 'node:path';
const root = resolve(import.meta.dirname, '..');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.m4a':'audio/mp4'};
http.createServer((req,res)=>{
  let pathname;
  try { pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch {res.writeHead(400).end();return;}
  const allowed = ['/', '/index.html', '/app.js', '/editor.js', '/timing.js', '/style.css', '/review.css', '/char-editor.css', '/data/lyrics.json', '/data/versions.json', '/song-analysis.json', '/analysis/audio/song.m4a'];
  allowed.push('/words.js','/presentation.css','/data/project.json','/archive/lyrics-versions-2026-10-23.zip');
  allowed.push('/visual.html','/visual.js','/visual.css','/visual-state.js','/visual-renderer.js');
  allowed.push('/shots.html','/shots.js','/shots.css','/storyboard-shots.js','/storyboard-renderer.js','/character.js');
  allowed.push('/storyboard.html','/storyboard-page.js','/storyboard-demo.js','/lyric-layer.js');
  if(!allowed.includes(pathname)&&!/^\/data\/versions\/kugou-\d+\.json$/.test(pathname)){res.writeHead(404).end('Not found');return;}
  const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  try {
    const size=statSync(file).size;
    const headers={'Content-Type':mime[extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache'};
    let start=0,end=size-1,status=200;
    if(req.headers.range){
      const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(!m || (!m[1]&&!m[2])){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return;}
      if(!m[1]) start=Math.max(0,size-Number(m[2]));
      else {start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),size-1):end;}
      if(start>end||start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return;}
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;
    }
    headers['Content-Length']=end-start+1;
    res.writeHead(status,headers);
    if(req.method==='HEAD'){res.end();return;}
    createReadStream(file,{start,end}).pipe(res);
  } catch {res.writeHead(404).end('File not ready');}
}).listen(5173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:5173'));
