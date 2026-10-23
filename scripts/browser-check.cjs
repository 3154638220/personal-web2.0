'use strict';
// Run with a Node version supported by your Playwright installation.
// PLAYWRIGHT_MODULE_PATH may point to a separately installed Playwright package.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const base=process.env.SITE_URL||'http://127.0.0.1:8082';
const review=path.resolve(__dirname,'../review');fs.mkdirSync(review,{recursive:true});
const posts=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../dist/posts.json')));
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1050},permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage(),errors=[],results=[];
 page.on('pageerror',error=>errors.push(error.message));
 const check=(name)=>{results.push(name);console.log('PASS:',name);};
 async function goto(url){await page.goto(base+url,{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);}
 async function archiveReady(){await page.waitForFunction(()=>document.querySelectorAll('#archive-results .post-row').length===20);}
 const withinPage=async()=>await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
 try{
 await goto('/blog.html');await archiveReady();assert((await page.locator('#result-count').innerText()).includes(`共 ${posts.length} 篇文章`));
 assert.equal(await page.locator('#pagination [aria-current=page]').innerText(),'1');
 await page.locator('#pagination button[data-page="2"]').first().click();assert.match(await page.locator('#result-count').innerText(),/2 \/ 5/);assert.equal(await page.locator('.post-number').first().innerText(),'21');
 await page.reload();await page.waitForFunction(()=>document.querySelector('.post-number')?.textContent==='21');
 check('Pagination, count and reload persistence');
 await page.locator('#category').selectOption('笔记');await page.waitForFunction(()=>document.querySelector('#result-count').textContent.includes('15 篇'));
 await page.locator('#tag').selectOption('KMP');await page.waitForFunction(()=>document.querySelectorAll('#archive-results .post-row').length===1);
 await page.locator('#search').fill('不存在的结果qnxy123');await page.waitForSelector('.empty-state');
 await page.locator('button[type=reset]').click();await archiveReady();check('Category + tag + query combinations, empty state and reset');
 // Full-text-only keyword: obtain a code identifier absent from title/summary.
 await page.locator('#search').fill('insert');await page.waitForFunction(()=>document.querySelectorAll('#archive-results .post-row').length>0 && document.querySelectorAll('#archive-results .post-row').length<20);
 const found=await page.locator('#archive-results .post-row h3').allTextContents();assert(found.some(x=>x.includes('线性基')));check('Full-text code search');
 await page.locator('button[type=reset]').click();await archiveReady();await page.locator('#sort').selectOption('oldest');await page.waitForFunction(()=>document.querySelector('.post-meta time').textContent==='2024-05-04');check('Oldest-first ordering');
 await page.locator('[data-action=language]').click();assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.match(await page.locator('#result-count').innerText(),/entries/);
 await page.locator('[data-action=theme]').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await page.reload();await page.waitForFunction(()=>document.querySelector('#result-count').textContent.includes('entries'));
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');check('Bilingual UI, dark theme and preference persistence');
 await page.locator('[data-action=language]').click();await page.locator('[data-action=theme]').click();
 await page.setViewportSize({width:375,height:812});await goto('/');await page.locator('[data-action=menu]').click();assert.equal(await page.locator('[data-action=menu]').getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await page.locator('[data-action=menu]').getAttribute('aria-expanded'),'false');
 await page.locator('[data-action=menu]').click();await page.locator('#site-nav a[href="/blog.html"]').click();await archiveReady();check('Mobile navigation and Escape focus behavior');
 await goto('/articles/'+encodeURIComponent('线性基')+'.html');assert.equal(await page.locator('.toc details').getAttribute('open'),null);await page.locator('.toc summary').click();await page.locator('.toc a').first().click();assert.equal(await page.locator('.toc details').getAttribute('open'),null);
 assert.equal(await page.locator('.copy-code').first().textContent(),'');assert.equal(await page.locator('.copy-code svg').first().count(),1);await page.locator('.copy-code').first().click();await page.waitForFunction(()=>document.querySelector('.copy-code').dataset.state==='success');assert.equal(await page.locator('.copy-code').first().textContent(),'');const clipboard=await page.evaluate(()=>navigator.clipboard.readText());assert(clipboard.includes('#include'));
 await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await page.waitForFunction(()=>document.querySelector('#reading-progress').style.transform==='scaleX(1)');check('Mobile TOC, clipboard and reading progress');
 await page.setViewportSize({width:1440,height:1050});await page.reload();assert(await page.locator('.toc details').getAttribute('open')!==null);assert.equal(await page.locator('.article-body').evaluate(el=>Math.round(el.getBoundingClientRect().width)),720);assert(await page.locator('.toc').evaluate(el=>el.getBoundingClientRect().right < document.querySelector('.article-body').getBoundingClientRect().left));check('Desktop left sticky TOC and 720px body');
 for(const width of [375,768,1440]){
  await page.setViewportSize({width,height:width===1440?1050:900});
  for(const [name,url] of [['home','/'],['archive','/blog.html'],['article','/articles/'+encodeURIComponent('二元一次不定方程')+'.html'],['projects','/projects.html'],['about','/about.html']]){
   await goto(url);if(name==='archive')await archiveReady();assert(await withinPage(),`Overflow on ${url} at ${width}`);
   for(const theme of ['light','dark']){await page.evaluate(theme=>{localStorage.setItem('qnxy-theme',theme);document.documentElement.dataset.theme=theme;},theme);await page.screenshot({path:path.join(review,`${name}-${width}-${theme}.png`),fullPage:name!=='article',animations:'disabled'});}
   await page.evaluate(()=>{localStorage.setItem('qnxy-theme','light');document.documentElement.dataset.theme='light';});
  }
  check(`${width}px: five pages, light/dark screenshots, no page overflow`);
 }
 // Inspect every article on the smallest viewport to catch long formulas/code.
 await page.setViewportSize({width:375,height:812});
 for(const p of posts){await goto('/articles/'+encodeURIComponent(p.htmlFile));assert(await withinPage(),`Article overflow: ${p.slug}`);assert.equal(await page.locator('.katex-error').count(),0,`Formula error: ${p.slug}`);}
 check(`All ${posts.length} articles: mobile overflow and formula checks`);
 const noJS=await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:812}});const staticPage=await noJS.newPage();await staticPage.goto(base+'/blog.html');assert.equal(await staticPage.locator('#archive-results .post-row').count(),posts.length);await staticPage.goto(base+'/articles/'+encodeURIComponent('线性基')+'.html');assert((await staticPage.locator('.article-body').innerText()).includes('线性基'));await noJS.close();check('No JavaScript: full static archive and article body');
 const fallback=await browser.newContext();const fallbackPage=await fallback.newPage();await fallbackPage.route('**/search-index.json',route=>route.abort());await fallbackPage.goto(base+'/blog.html');await fallbackPage.waitForFunction(()=>document.querySelector('#search-error').hidden===false);assert.equal(await fallbackPage.locator('#archive-results .post-row').count(),20);await fallback.close();check('Search-index failure degrades to metadata search');
 assert.deepEqual(errors,[],'No browser exceptions');
 fs.writeFileSync(path.join(review,'browser-results.json'),JSON.stringify({date:new Date().toISOString(),base,checks:results,errors,screenshots:fs.readdirSync(review).filter(x=>x.endsWith('.png')).length},null,2)+'\n');
 console.log('ALL BROWSER CHECKS PASSED');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
