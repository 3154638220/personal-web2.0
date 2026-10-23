'use strict';
(() => {
  const root=document.documentElement;
  let lang=root.lang==='en'?'en':'zh';
  const tr=(zh,en)=>lang==='en'?en:zh;
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const save=(key,value)=>{try{localStorage.setItem(key,value);}catch(_){}};
  let onLanguage=()=>{};
  function translate(){
    root.lang=lang==='en'?'en':'zh-CN';
    document.querySelectorAll('[data-zh][data-en]').forEach(el=>{el.textContent=el.dataset[lang];});
    document.querySelectorAll('[data-placeholder-zh]').forEach(el=>{el.placeholder=el.dataset[lang==='en'?'placeholderEn':'placeholderZh'];});
    document.querySelectorAll('[data-label-zh]').forEach(el=>{el.setAttribute('aria-label',el.dataset[lang==='en'?'labelEn':'labelZh']);});
    const button=document.querySelector('[data-action=language]');
    if(button){button.textContent=lang==='en'?'中文':'EN';button.setAttribute('aria-label',tr('Switch to English','切换为中文'));}
    updateThemeButton();
    onLanguage();
  }
  function updateThemeButton(){
    const dark=root.dataset.theme==='dark';
    const button=document.querySelector('[data-action=theme]');
    if(!button)return;
    button.setAttribute('aria-label',dark?tr('切换至浅色','Switch to light'):tr('切换至深色','Switch to dark'));
    button.title=button.getAttribute('aria-label');
    button.setAttribute('aria-pressed',String(dark));
    button.innerHTML=dark?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20.5 13.2A8.6 8.6 0 0 1 10.8 3.5a8.7 8.7 0 1 0 9.7 9.7Z"/></svg>';
    document.querySelector('meta[name=theme-color]')?.setAttribute('content',dark?'#171f1b':'#F7F5EF');
  }
  document.querySelector('[data-action=language]')?.addEventListener('click',()=>{lang=lang==='zh'?'en':'zh';save('qnxy-lang',lang);translate();});
  document.querySelector('[data-action=theme]')?.addEventListener('click',()=>{root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';save('qnxy-theme',root.dataset.theme);updateThemeButton();});
  const menu=document.querySelector('[data-action=menu]'),nav=document.querySelector('#site-nav');
  function closeMenu(){menu?.setAttribute('aria-expanded','false');nav?.classList.remove('is-open');}
  menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav?.classList.toggle('is-open',open);});
  nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('click',event=>{if(!nav?.contains(event.target)&&!menu?.contains(event.target))closeMenu();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
  matchMedia('(min-width: 601px)').addEventListener('change',event=>{if(event.matches)closeMenu();});
  translate();

  const form=document.querySelector('#archive-form');
  if(form){
    const result=document.querySelector('#archive-results'),counter=document.querySelector('#result-count'),pagination=document.querySelector('#pagination'),error=document.querySelector('#search-error');
    const q=form.querySelector('#search'),category=form.querySelector('#category'),tag=form.querySelector('#tag'),sort=form.querySelector('#sort');
    const state={posts:[],search:new Map(),ready:false,page:1,searchFailed:false};
    const params=new URLSearchParams(location.search);
    for(const input of [q,category,tag,sort]){const value=params.get(input.name);if(value!==null)input.value=value;}
    if(!sort.value)sort.value='newest';
    state.page=Math.max(1,Number.parseInt(params.get('page')||'1',10)||1);
    function updateUrl(){const params=new URLSearchParams();for(const input of [q,category,tag,sort])if(input.value&&(input!==sort||input.value!=='newest'))params.set(input.name,input.value);if(state.page>1)params.set('page',state.page);history.replaceState(null,'',location.pathname+(params.size?'?'+params.toString():'')+location.hash);}
    function row(p,index){return `<article class="post-row"><span class="post-number mono">${String(index+1).padStart(2,'0')}</span><div class="post-copy"><div class="post-meta mono"><time datetime="${escape(p.date)}">${escape(p.date)}</time><span class="meta-divider">/</span><span>${escape(p.categories||tr('随笔','Notes'))}</span></div><h3><a href="/articles/${encodeURIComponent(p.htmlFile)}">${escape(p.title)} <span class="row-arrow" aria-hidden="true">↗</span></a></h3><p>${escape(p.excerpt)}</p><div class="post-tags">${p.tags.slice(0,3).map(x=>`<a href="/blog.html?tag=${encodeURIComponent(x)}">${escape(x)}</a>`).join('')}</div></div><span class="reading-time mono">${p.readingMins} ${tr('分钟','MIN')}</span></article>`;}
    function render(){
      if(!state.ready)return;
      const words=q.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      let matches=state.posts.filter(p=>(!category.value||p.categories===category.value)&&(!tag.value||p.tags.includes(tag.value))&&words.every(word=>(p.title+' '+p.excerpt+' '+p.tags.join(' ')+' '+(state.search.get(p.slug)||'')).toLocaleLowerCase().includes(word)));
      if(sort.value==='oldest')matches=matches.slice().reverse();
      const pages=Math.max(1,Math.ceil(matches.length/20));state.page=Math.min(pages,Math.max(1,state.page));
      const start=(state.page-1)*20;
      counter.textContent=tr(`共 ${matches.length} 篇文章 · 第 ${state.page} / ${pages} 页`,`${matches.length} entries · Page ${state.page} of ${pages}`);
      result.innerHTML=matches.length?matches.slice(start,start+20).map((p,i)=>row(p,start+i)).join(''):`<div class="empty-state"><span class="empty-mark" aria-hidden="true">∅</span><h3>${tr('还没有找到这一页思路','No matching thoughts yet')}</h3><p>${tr('试试其他关键词，或者清空筛选。','Try another keyword, or reset the filters.')}</p></div>`;
      pagination.hidden=pages<=1;
      pagination.innerHTML=pages<=1?'':`<button type="button" data-page="${state.page-1}" ${state.page===1?'disabled':''} aria-label="${tr('上一页','Previous page')}">←</button>`+Array.from({length:pages},(_,i)=>`<button type="button" data-page="${i+1}" ${state.page===i+1?'aria-current="page"':''} aria-label="${tr('第 '+(i+1)+' 页','Page '+(i+1))}">${i+1}</button>`).join('')+`<button type="button" data-page="${state.page+1}" ${state.page===pages?'disabled':''} aria-label="${tr('下一页','Next page')}">→</button>`;
      if(state.searchFailed){error.hidden=false;error.textContent=tr('正文索引加载失败，当前搜索标题、摘要和标签。刷新页面可重试。','Full-text index unavailable. Searching titles, summaries and tags. Refresh to retry.');}
      updateUrl();
    }
    let debounce;
    function changed(){state.page=1;render();}
    form.addEventListener('submit',event=>{event.preventDefault();clearTimeout(debounce);changed();});
    q.addEventListener('input',event=>{if(event.isComposing)return;clearTimeout(debounce);debounce=setTimeout(changed,130);});
    q.addEventListener('compositionend',()=>{clearTimeout(debounce);changed();});
    for(const control of [category,tag,sort])control.addEventListener('change',changed);
    form.addEventListener('reset',()=>{clearTimeout(debounce);setTimeout(changed,0);});
    pagination.addEventListener('click',event=>{const button=event.target.closest('button[data-page]');if(!button||button.disabled)return;state.page=Number(button.dataset.page);render();result.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});pagination.querySelector(`[data-page="${state.page}"][aria-current]`)?.focus({preventScroll:true});});
    document.addEventListener('keydown',event=>{if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)&&!event.target.isContentEditable){event.preventDefault();q.focus();}});
    onLanguage=render;
    async function load(url){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);try{const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error('HTTP '+response.status);return await response.json();}finally{clearTimeout(timeout);}}
    Promise.allSettled([load('/posts.json'),load('/search-index.json')]).then(([posts,index])=>{
      if(posts.status!=='fulfilled'){error.hidden=false;error.textContent=tr('搜索暂时不可用，下方仍可浏览全部文章。刷新页面可重试。','Search is unavailable. All articles remain listed below. Refresh to retry.');return;}
      state.posts=posts.value;state.ready=true;
      if(index.status==='fulfilled')state.search=new Map(index.value.map(x=>[x.slug,x.text]));else state.searchFailed=true;
      render();
    });
  }
  const article=document.querySelector('#article-body');
  if(article){
    const toc=document.querySelector('.toc details'),mobile=matchMedia('(max-width: 1199px)');
    if(toc){toc.open=!mobile.matches;mobile.addEventListener('change',()=>{toc.open=!mobile.matches;});}
    article.querySelectorAll('pre').forEach(pre=>{
      const code=pre.querySelector('code');if(!code)return;
      const label=document.createElement('span');label.className='code-language';label.setAttribute('aria-hidden','true');label.textContent=[...code.classList].find(x=>x.startsWith('language-'))?.slice(9)||'CODE';pre.prepend(label);
      const icons={
        copy:'<rect x="8" y="8" width="11" height="12" rx="2"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>',
        success:'<path d="m5 12 4 4L19 6"/>',
        error:'<path d="m6 6 12 12M18 6 6 18"/>'
      };
      const button=document.createElement('button');button.type='button';button.className='copy-code';
      function showState(state){
        const labels={copy:['复制代码','Copy code'],success:['代码已复制','Code copied'],error:['复制失败，点击重试','Copy failed, retry']};
        button.dataset.state=state;
        [button.dataset.labelZh,button.dataset.labelEn]=labels[state];
        button.setAttribute('aria-label',tr(...labels[state]));
        button.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icons[state]}</svg>`;
      }
      showState('copy');pre.prepend(button);
      let resetTimer,busy=false;
      button.addEventListener('click',async()=>{
        if(busy)return;
        busy=true;clearTimeout(resetTimer);button.setAttribute('aria-busy','true');
        try{
          if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(code.textContent);
          else{
            const area=document.createElement('textarea');area.value=code.textContent;area.style.cssText='position:fixed;left:-9999px';document.body.append(area);
            let copied=false;
            try{area.select();copied=document.execCommand('copy');}finally{area.remove();button.focus();}
            if(!copied)throw Error('copy failed');
          }
          showState('success');
        }catch(_){showState('error');}
        finally{busy=false;button.removeAttribute('aria-busy');}
        resetTimer=setTimeout(()=>showState('copy'),1800);
      });
    });
    const progress=document.querySelector('#reading-progress');let ticking=false;
    function updateProgress(){const top=article.getBoundingClientRect().top+scrollY;const available=Math.max(1,article.offsetHeight-innerHeight*.5);progress.style.transform=`scaleX(${Math.min(1,Math.max(0,(scrollY-top+innerHeight*.35)/available))})`;ticking=false;}
    addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(updateProgress);}},{passive:true});addEventListener('resize',updateProgress);updateProgress();
    if('ResizeObserver'in window)new ResizeObserver(updateProgress).observe(article);
    const headings=[...article.querySelectorAll('h1[id],h2[id],h3[id],h4[id]')];
    const links=[...document.querySelectorAll('.toc a')];
    if('IntersectionObserver'in window){const visible=new Set();const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting)visible.add(entry.target.id);else visible.delete(entry.target.id);}const first=headings.find(h=>visible.has(h.id));if(first)links.forEach(link=>link.classList.toggle('active',link.hash==='#'+first.id));},{rootMargin:'-110px 0px -55% 0px'});headings.forEach(h=>observer.observe(h));}
    links.forEach(link=>link.addEventListener('click',()=>{if(mobile.matches&&toc)toc.open=false;}));
  }
})();
