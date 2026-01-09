const fs=require('fs');
const txt=fs.readFileSync('backend/src/server.ts','utf8');
let stack=[];
let inSingle=false,inDouble=false,inTemplate=false,escape=false;
for(let i=0;i<txt.length;i++){
  const ch=txt[i];
  const prev=txt[i-1];
  if(escape){escape=false;continue;}
  if(ch==='\\'){escape=true;continue;}
  if(!inSingle && !inDouble && !inTemplate){
    if(ch==="'"){inSingle=true;continue;}
    if(ch==='"'){inDouble=true;continue;}
    if(ch==='`'){inTemplate=true;continue;}
  } else if(inSingle){ if(ch==="'" && prev!=='\\'){inSingle=false;} continue; }
  else if(inDouble){ if(ch==='"' && prev!=='\\'){inDouble=false;} continue; }
  else if(inTemplate){ if(ch==='`' && prev!=='\\'){inTemplate=false; continue;} }
  if(inTemplate && ch==='{' ){ stack.push({pos:i}); }
  else if(inTemplate && ch==='}'){ stack.pop(); }
  else if(!inSingle && !inDouble && !inTemplate){
    if(ch==='{' ) stack.push({pos:i});
    else if(ch==='}'){ stack.pop(); }
  }
}
console.log('unclosed', stack.length);
if(stack.length){const last=stack[stack.length-1].pos;console.log('last pos', last);console.log('context', txt.slice(last-60,last+80));}
