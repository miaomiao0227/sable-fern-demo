import {mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
const files={};
for(const file of await readdir('dist')){
  if(/^[a-z][a-z0-9-]*\.(html|js|css)$/.test(file)){
    let contents=await readFile('dist/'+file,'utf8');
    if(file.endsWith('.html'))contents=contents.replaceAll('/signin-with-chatgpt','/auth/google').replaceAll('/signout-with-chatgpt','/auth/logout');
    files['/'+file]=contents;
  }
}
const catalog=await readFile('dist/catalog.js','utf8');
const worker=await readFile('worker/index.js','utf8');
const auth=await readFile('worker/pages-auth.js','utf8');
if(!worker.includes('export default {async fetch'))throw new Error('Unexpected commerce Worker export');
await mkdir('pages-dist',{recursive:true});
await writeFile('pages-dist/_worker.js','const assets='+JSON.stringify(files)+';\n'+catalog+'\n'+worker.replace('export default {async fetch','const commerceWorker={async fetch')+'\n'+auth);
