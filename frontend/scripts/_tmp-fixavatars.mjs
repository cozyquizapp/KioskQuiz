import sharp from 'sharp';
import fs from 'fs';
const DRY = !process.argv.includes('--write');
const dir='public/avatars/cozyquiz';
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.png'));
let fixed=0;
for (const f of files) {
  const p=dir+'/'+f;
  const {data,info}=await sharp(p).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const W=info.width,H=info.height,C=info.channels;
  const seen=new Int32Array(W*H).fill(-1); const blobs=[];
  for(let i=0;i<W*H;i++){
    if(seen[i]>=0||data[i*C+3]<=24) continue;
    const id=blobs.length; const st=[i]; seen[i]=id;
    let n=0,minX=W,maxX=0,minY=H,maxY=0;
    while(st.length){
      const q=st.pop(); n++;
      const x=q%W,y=(q/W)|0;
      if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y;
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,ny=y+dy;
        if(nx<0||ny<0||nx>=W||ny>=H) continue;
        const r=ny*W+nx;
        if(seen[r]<0&&data[r*C+3]>24){seen[r]=id;st.push(r);}
      }
    }
    blobs.push({id,n,minX,maxX,minY,maxY});
  }
  if(!blobs.length) continue;
  const main=blobs.reduce((a,b)=>b.n>a.n?b:a);
  // Splitter = Blob, dessen Kasten KOMPLETT im aeusseren 10-%-Streifen links
  // oder rechts liegt. Bewusst eng: ein abgesetzter Sonnenstrahl oder eine
  // Wolkenflocke sitzt nie ganz am Bildrand, ein Nachbar-Rest immer.
  const strip=Math.round(W*0.10);
  const slivers=blobs.filter(b=>b.id!==main.id && (b.maxX<strip || b.minX>=W-strip));
  if(!slivers.length) continue;
  fixed++;
  const px=Math.round(slivers.reduce((a,b)=>a+b.n,0));
  console.log(`  ${f.padEnd(20)} ${slivers.length} Splitter, ${px} Pixel`);
  if (DRY) continue;
  // Splitter loeschen
  const out=Buffer.from(data);
  const kill=new Set(slivers.map(s=>s.id));
  for(let i=0;i<W*H;i++) if(kill.has(seen[i])) out[i*C+3]=0;
  // neu zuschneiden und zentrieren, Fuellgrad wie geliefert (ca. 86 %)
  const cleaned=await sharp(out,{raw:{width:W,height:H,channels:C}}).png().toBuffer();
  const meta=await sharp(cleaned).trim({threshold:8}).toBuffer({resolveWithObject:true});
  const mw=meta.info.width, mh=meta.info.height;
  const target=Math.round(W*0.86);
  const scale=Math.min(target/mw,target/mh);
  const nw=Math.round(mw*scale), nh=Math.round(mh*scale);
  const motif=await sharp(meta.data).resize(nw,nh,{fit:'fill',kernel:'lanczos3'}).toBuffer();
  await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
    .composite([{input:motif,left:Math.round((W-nw)/2),top:Math.round((H-nh)/2)}])
    .png({compressionLevel:9}).toFile(p);
}
console.log(`\n${DRY?'TROCKENLAUF':'GESCHRIEBEN'}: ${fixed} von ${files.length} Dateien betroffen`);
