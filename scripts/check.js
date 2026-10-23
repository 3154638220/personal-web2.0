'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),matter=require('gray-matter');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'dist'),config=require('../site.config');
const sourceFiles=fs.readdirSync(path.join(ROOT,'posts')).filter(x=>x.endsWith('.md'));
const posts=JSON.parse(fs.readFileSync(path.join(OUT,'posts.json')));
const index=JSON.parse(fs.readFileSync(path.join(OUT,'search-index.json')));
assert(sourceFiles.length>=85,'All migrated Markdown sources remain');
const expected=sourceFiles.filter(f=>{
 const {data}=matter(fs.readFileSync(path.join(ROOT,'posts',f),'utf8'));
 return !data.password&&data.draft!==true&&!config.unpublished.includes(data.slug||f.slice(0,-3));
}).length;
assert.equal(posts.length,expected,'Every eligible article is public');
assert.equal(index.length,posts.length);
assert.equal(fs.readdirSync(path.join(OUT,'articles')).length,posts.length);
assert.deepEqual(Object.keys(posts[0]),['title','date','slug','htmlFile','excerpt','tags','categories','readingMins']);
assert.deepEqual(index.map(x=>x.slug).sort(),posts.map(x=>x.slug).sort());
for(const slug of config.featured)assert(posts.some(p=>p.slug===slug),'Featured article exists');
const passwords=sourceFiles.map(f=>matter(fs.readFileSync(path.join(ROOT,'posts',f),'utf8')).data.password).filter(Boolean).map(String);
const files=[];
function walk(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,d.name);if(d.isDirectory())walk(f);else files.push(f);}}
walk(OUT);
assert(!files.some(f=>f.endsWith('.md')),'Source must not deploy');
let links=0,formulas=0;
for(const file of files){
 if(!/\.(html|css|js|json|xml|txt|svg)$/.test(file))continue;
 const text=fs.readFileSync(file,'utf8');
 for(const slug of config.unpublished)assert(!text.includes(slug),`Unpublished slug leaked in ${file}`);
 for(const password of passwords)assert(!text.includes(password),`Password leaked in ${file}`);
 assert(!file.endsWith('.md'),'Source must not deploy');
 if(!file.endsWith('.html'))continue;
 assert(!text.includes('{{'),'Unresolved template variable');
 assert(text.includes('<html lang="'),'Document language exists');
 assert(text.includes('rel="canonical"'),'Canonical URL exists');
 for(const match of text.matchAll(/(?:href|src)="([^"#]*)(?:#[^"]*)?"/g)){
  const raw=match[1].replace(/&amp;/g,'&');if(!raw||/^(?:[a-z]+:|\/\/)/i.test(raw))continue;
  const clean=decodeURIComponent(raw.split('?')[0]);let target=clean.startsWith('/')?path.join(OUT,clean):path.resolve(path.dirname(file),clean);
  if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
  assert(fs.existsSync(target),`Broken local link ${raw} from ${path.relative(OUT,file)}`);links++;
 }
 if(file.includes('/articles/')){
  const ids=[...text.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(new Set(ids).size,ids.length,`Unique IDs in ${file}`);
  for(const [,hash]of text.matchAll(/href="#([^"]+)"/g))assert(ids.includes(hash),`Broken anchor ${hash}`);
  formulas+=(text.match(/class="katex"/g)||[]).length;
  assert(!text.includes('class="katex-error"'),`Formula parse error in ${file}`);
 }
}
assert(formulas>100,'Math is rendered');
assert(fs.readFileSync(path.join(OUT,'articles/CF1971H.html'),'utf8').includes('/articles/2-SAT.html'),'Legacy link repaired');
for(const slug of config.unpublished)assert(!fs.existsSync(path.join(OUT,'articles',slug+'.html')),`Hidden article must not be generated: ${slug}`);
assert(fs.readFileSync(path.join(OUT,'articles/KMP.html'),'utf8').includes('<img'),'Images retained');
for(const slug of ['KMP','笛卡尔树','Russians']){
 const text=fs.readFileSync(path.join(OUT,'articles',slug+'.html'),'utf8');
 assert(text.includes('/assets/diagrams/'),'Failed external diagram replaced with a local diagram');
}
console.log(`PASS: ${sourceFiles.length} sources, ${posts.length} public articles, ${links} local links, ${formulas} formulas; unpublished content excluded.`);
