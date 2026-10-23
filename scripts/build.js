'use strict';
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const matter=require('gray-matter');
const MarkdownIt=require('markdown-it');
const katex=require('markdown-it-katex');
const mathRenderer=require('katex');
const hljs=require('highlight.js');
const config=require('../site.config');
const view=require('../templates/pages');
const {e,t}=view;
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'dist');
const template=fs.readFileSync(path.join(ROOT,'templates/layout.html'),'utf8');
const normalizeSlug=s=>String(s||'').trim().replace(/\s+/g,'-').replace(/_/g,'-').replace(/lougu/gi,'luogu').replace(/muitiset/gi,'multiset').replace(/^(ABC|ARC)(\d+)([a-z])$/,(_,a,b,c)=>a+b+c.toUpperCase()).replace(/-+/g,'-');
const strip=s=>String(s).replace(/<[^>]+>/g,' ').replace(/&(?:amp|lt|gt|quot|#39);/g,c=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[c])).replace(/\s+/g,' ').trim();
function plainMarkdown(s){return md.parse(s.replace(/\{%[\s\S]*?%\}/g,''),{}).filter(token=>token.type==='inline').map(token=>(token.children||[]).filter(child=>['text','code_inline','softbreak','hardbreak'].includes(child.type)).map(child=>child.content||' ').join('')).join(' ').replace(/https?:\/\/\S+/g,'').replace(/\s+/g,' ').trim();}
function excerpt(data,content){if(data.excerpt)return String(data.excerpt).trim();const first=content.split('<!--more-->')[0];const text=plainMarkdown(first).replace(/^(?:Link|简介|定义|题目描述)\s*/,'');return text.length>155?text.slice(0,155)+'…':text;}
fs.rmSync(OUT,{recursive:true,force:true});
fs.mkdirSync(path.join(OUT,'articles'),{recursive:true});
fs.cpSync(path.join(ROOT,'assets'),path.join(OUT,'assets'),{recursive:true});
const assetName=name=>{const source=fs.readFileSync(path.join(ROOT,'assets',name));const ext=path.extname(name);const target=name.slice(0,-ext.length)+'.'+crypto.createHash('sha256').update(source).digest('hex').slice(0,10)+ext;fs.renameSync(path.join(OUT,'assets',name),path.join(OUT,'assets',target));return '/assets/'+target;};
const style=assetName('style.css'),script=assetName('app.js');
const vendor=path.join(OUT,'assets/vendor');
fs.mkdirSync(vendor,{recursive:true});
const katexRoot=path.join(ROOT,'node_modules/katex/dist');
fs.copyFileSync(path.join(katexRoot,'katex.min.css'),path.join(vendor,'katex.min.css'));
fs.cpSync(path.join(katexRoot,'fonts'),path.join(vendor,'fonts'),{recursive:true});
const md=new MarkdownIt({html:true,linkify:true,typographer:true,highlight(code,lang){if(lang&&hljs.getLanguage(lang)){return `<pre class="code-block"><code class="hljs language-${e(lang)}">${hljs.highlight(code,{language:lang,ignoreIllegals:true}).value}</code></pre>`;}return `<pre class="code-block"><code>${e(code)}</code></pre>`;}}).use(katex);
// Keep the existing dollar-delimiter parser and render using current KaTeX.
const renderMath=(source,displayMode)=>mathRenderer.renderToString(source.replace(/\^'/g,'^{\\prime}'),{throwOnError:false,strict:'ignore',displayMode});
md.renderer.rules.math_inline=(tokens,i)=>renderMath(tokens[i].content,false);
md.renderer.rules.math_block=(tokens,i)=>renderMath(tokens[i].content,true)+'\n';
const entries=[];
const slugs=new Set();
for(const file of fs.readdirSync(path.join(ROOT,'posts')).filter(f=>f.endsWith('.md'))){
  const {data,content}=matter(fs.readFileSync(path.join(ROOT,'posts',file),'utf8'));
  const slug=normalizeSlug(data.slug||file.slice(0,-3));
  if(!slug||slug.includes('/')||slug.includes('\\')||slugs.has(slug))throw Error(`Invalid or duplicate slug: ${file}`);
  slugs.add(slug);
  if(config.unpublished.includes(slug)||data.password||data.draft===true)continue;
  const date=data.date?new Date(data.date).toISOString().slice(0,10):'';
  const tags=Array.isArray(data.tags)?data.tags.map(String):data.tags?String(data.tags).split(',').map(x=>x.trim()).filter(Boolean):[];
  entries.push({title:String(data.title||file.slice(0,-3)),date,slug,htmlFile:slug+'.html',excerpt:excerpt(data,content),tags,categories:String(data.categories||''),readingMins:Math.max(1,Math.ceil(content.replace(/[#*`$\[\]()\s]/g,'').length/400)),content});
}
entries.sort((a,b)=>b.date.localeCompare(a.date)||a.slug.localeCompare(b.slug));
const known=new Set(entries.map(p=>p.slug));
function fixLinks(content){return content.replace(/https?:\/\/(?:www\.)?qianianxy\.cn\/\d{4}\/\d{2}\/\d{2}\/([^\s/)]+)\/?/g,(full,raw)=>{let slug;try{slug=normalizeSlug(decodeURIComponent(raw));}catch(_){return full;}return known.has(slug)?'/articles/'+encodeURIComponent(slug)+'.html':full;});}
function document({title,description,url='',active='',content,article=false,extra='',bodyClass=''}){
 const values={TITLE:e(title),DESCRIPTION:e(description),URL:e(config.url+(url?'/'+url:'/')),BASE:e(config.url),OG_TYPE:article?'article':'website',EXTRA_HEAD:extra,VENDOR_CSS:article?'<link rel="stylesheet" href="/assets/vendor/katex.min.css">':'',STYLE:style,SCRIPT:script,BODY_CLASS:bodyClass,NAV:view.nav(active),CONTENT:content,FOOTER:view.footer()};
 return template.replace(/\{\{([A-Z_]+)\}\}/g,(_,key)=>values[key]??'');
}
function write(file,options){fs.writeFileSync(path.join(OUT,file),document({...options,url:file==='index.html'?'':file}));}
const posts=entries.map(({content,...p})=>p);
const search=[];
for(let i=0;i<entries.length;i++){
 const p=entries[i];
 const prepared=fixLinks(p.content).replace(/\{%\s*fold\s+([^%]+)\s*%\}/g,(_,label)=>`<details class="fold-block"><summary>${e(label.trim())}</summary>`).replace(/\{%\s*endfold\s*%\}/g,'</details>');
 const tokens=md.parse(prepared,{}),toc=[];
 let heading=0;
 for(let j=0;j<tokens.length;j++){
  const token=tokens[j];
  if(token.type==='heading_open'){
   const inline=tokens[j+1];const text=inline.children?inline.children.filter(x=>x.type==='text'||x.type==='code_inline'||x.type==='math_inline').map(x=>x.content).join(''):inline.content;
   const id='section-'+(++heading);token.attrSet('id',id);
   if(Number(token.tag.slice(1))<=4)toc.push({id,text,level:Number(token.tag.slice(1))});
  }
  if(token.type==='image')token.attrSet('loading','lazy');
  if(token.type==='inline')for(const child of token.children||[])if(child.type==='image'){
   child.attrSet('loading','lazy');child.attrSet('decoding','async');
   const original=child.attrGet('src');
   const replacements=[['11023579-8e5da803cfa21d91','kmp-prefix.svg','KMP 前缀函数示意：ABABAC 的 next 数组为 0、0、1、2、3、0'],['202405051726316','cartesian-tree.svg','笛卡尔树示意：位置满足二叉搜索树顺序，数值满足小根堆性质'],['202405051740873','euler-tour.svg','根据正文 Euler 序重建的树']];
   const restored=replacements.find(([key])=>original.includes(key));
   if(restored){child.attrSet('src','/assets/diagrams/'+restored[1]);child.attrSet('alt',restored[2]);child.content=restored[2];child.children=[{type:'text',content:restored[2]}];child.attrSet('class','restored-diagram');}
  }
 }
 let body=md.renderer.render(tokens,md.options,{}).replace(/<table>/g,'<div class="table-scroll"><table>').replace(/<\/table>/g,'</table></div>').replace(/<iframe /g,'<iframe loading="lazy" title="文章内嵌视频" ').replace(/(<img [^>]*class="restored-diagram"[^>]*>)/g,`$1${t('示意图根据正文重绘。','Diagram redrawn from the article.','span','diagram-caption')}`);
 write('articles/'+p.htmlFile,{title:p.title+' — qnxy',description:p.excerpt,active:'blog',bodyClass:'page-article',article:true,extra:`<meta property="article:published_time" content="${p.date}">`,content:view.article(p,body,toc,posts[i+1],posts[i-1])});
 search.push({slug:p.slug,text:strip(md.render(fixLinks(p.content).replace(/\{%[\s\S]*?%\}/g,'')))});
}
write('index.html',{title:'qnxy — 在逻辑之间，留一点好奇。',description:'qnxy 的个人笔记：数学、算法题解与开发项目。记录思考，也记录探索的痕迹。',active:'home',bodyClass:'page-home',content:view.home(posts)});
write('blog.html',{title:'文章归档 — qnxy',description:'算法题解、数学笔记，以及沿途的小发现。搜索与浏览 qnxy 的全部公开文章。',active:'blog',bodyClass:'page-archive',content:view.archive(posts)});
write('projects.html',{title:'项目 — qnxy',description:'从个人网站到量化工具，qnxy 动手探索的结果。',active:'projects',content:view.projects()});
write('about.html',{title:'关于 — qnxy',description:config.education.zh,active:'about',content:view.about()});
write('404.html',{title:'404 — qnxy',description:'这一页，还没有答案。',content:view.notFound(),extra:'<meta name="robots" content="noindex">'});
write('contact.html',{title:'联系 — qnxy',description:'联系 qnxy',active:'about',content:`<div class="wrap not-found"><h1>${t('保持联系','Let’s connect')}</h1><p><a class="primary-link" href="/about.html#contact">${t('前往联系方式','Contact details')} ↗</a></p></div>`,extra:'<meta http-equiv="refresh" content="0;url=/about.html#contact"><meta name="robots" content="noindex">'});
fs.writeFileSync(path.join(OUT,'posts.json'),JSON.stringify(posts,null,2)+'\n');
fs.writeFileSync(path.join(OUT,'search-index.json'),JSON.stringify(search)+'\n');
const pages=['','blog.html','projects.html','about.html',...posts.map(p=>'articles/'+p.htmlFile)];
fs.writeFileSync(path.join(OUT,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+pages.map(p=>`  <url><loc>${e(config.url+'/'+encodeURI(p))}</loc></url>`).join('\n')+'\n</urlset>\n');
fs.writeFileSync(path.join(OUT,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${config.url}/sitemap.xml\n`);
const aliases=[];
for(const p of entries){
 const aliasesIn=p.content.matchAll(/https?:\/\/(?:www\.)?qianianxy\.cn\/(\d{4}\/\d{2}\/\d{2}\/[^\s/)]+)\/?/g);
 for(const [full,raw]of aliasesIn){const leaf=decodeURIComponent(raw.split('/').pop());const target=normalizeSlug(leaf);if(known.has(target))aliases.push({from:'/'+decodeURIComponent(raw)+'/',to:'/articles/'+encodeURIComponent(target)+'.html'});}
}
for(const {from,to}of aliases){const dir=path.join(OUT,from);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${to}"><link rel="canonical" href="${config.url+to}"><title>文章已迁移 — qnxy</title><a href="${to}">前往文章 / Continue to article</a></html>`);}
console.log(`Built ${posts.length} public articles from ${slugs.size} Markdown sources → dist/`);
console.log(`Unpublished sources excluded from HTML, metadata and search. Build uses local data only.`);
