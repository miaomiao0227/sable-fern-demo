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
const reviewOnly=process.argv.includes('--review');
const auth=reviewOnly?[
  'export default {fetch(request,env){',
  '  const url=new URL(request.url);',
  '  if(url.pathname==="/")return Response.redirect(new URL("/review/storefront.html",url),302);',
  '  if(url.pathname==="/review"||url.pathname.startsWith("/review/"))return commerceWorker.fetch(request,env);',
  '  return new Response("Not found",{status:404});',
  '}};'
].join('\n'):await readFile('worker/pages-auth.js','utf8');
if(!worker.includes('export default {async fetch'))throw new Error('Unexpected commerce Worker export');
await mkdir('pages-dist',{recursive:true});
await writeFile('pages-dist/_worker.js','const assets='+JSON.stringify(files)+';\n'+catalog+'\n'+worker.replace('export default {async fetch','const commerceWorker={async fetch')+'\n'+auth);
