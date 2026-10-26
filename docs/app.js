/* Musk Signal — dated, source-linked collection. No fabricated live updates. */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const state = { posts: [], query: '', topic: '全部', day: '全部', sort: 'newest', capturedAt: null, windowHours: 72 };
  const topics = ['全部', '航天', '人工智能', '商业', '社会与政治', '其他'];
  const escape = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const dateKey = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hong_Kong', year: 'numeric', month:'2-digit', day:'2-digit' }).format(new Date(d));
  const fmt = (d, opts) => new Intl.DateTimeFormat('zh-CN', { timeZone:'Asia/Hong_Kong', ...opts }).format(new Date(d));
  const shortDate = (d) => fmt(d, { month:'numeric', day:'numeric' });
  const time = (d) => fmt(d, { hour:'2-digit', minute:'2-digit', hour12:false });
  const fullDate = (d) => `${fmt(d, {year:'numeric',month:'2-digit',day:'2-digit'})} ${time(d)}`;
  const validLink = (s) => { try {const u = new URL(s); return u.protocol === 'https:' && !u.username && !u.password ? u.href : '';} catch {return '';} };
  let toastTimer;
  function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 2600); }
  function days() { return [...new Set(state.posts.map((p) => dateKey(p.publishedAt)))].sort().reverse(); }
  function dayDisplay(d) { const [y,m,n] = d.split('-'); return `${Number(m)}月${Number(n)}日`; }
  function baseMatches(p) { return (state.topic === '全部' || p.topic === state.topic) && (!state.query || `${p.title} ${p.summary} ${p.excerpt ?? ''} ${p.topic} ${p.type}`.toLocaleLowerCase().includes(state.query)); }
  function renderFilters() {
    $('#topic-filters').innerHTML = topics.filter((t) => t === '全部' || state.posts.some((p) => p.topic === t)).map((t) => `<button class="filter-button${state.topic === t ? ' selected' : ''}" data-topic="${escape(t)}" aria-pressed="${state.topic === t}">${escape(t)}<span class="topic-count">${t === '全部' ? state.posts.length : state.posts.filter((p) => p.topic === t).length}</span></button>`).join('');
    $('#day-filters').innerHTML = ['全部', ...days()].map((d) => `<button class="day-button${state.day === d ? ' selected' : ''}" data-day="${escape(d)}" aria-pressed="${state.day === d}">${d === '全部' ? '全部日期' : dayDisplay(d)}</button>`).join('');
  }
  function postMarkup(p) {
    const excerpt = p.excerpt ? `<blockquote class="original-excerpt"><span>原文节选</span><div lang="en">${escape(p.excerpt)}</div></blockquote>` : '';
    return `<article class="post-card" data-post="${escape(p.id)}"><header class="post-header"><div class="post-avatar" aria-hidden="true">𝕏</div><div class="post-author"><strong>Elon Musk</strong><svg class="verified-badge" aria-label="已认证"><use href="#badge-unused"/></svg><span class="handle">@elonmusk</span></div><span class="post-type${p.type === '回复' ? ' reply' : ''}">${escape(p.type)}</span></header><h4>${escape(p.title)}</h4><p class="post-summary">${escape(p.summary)}</p>${excerpt}<div class="post-footer"><time class="post-time" datetime="${escape(p.publishedAt)}">${shortDate(p.publishedAt)} ${time(p.publishedAt)}</time><span class="topic-badge">${escape(p.topic)}</span><div class="post-actions"><button class="copy-button" data-copy="${escape(p.url)}" aria-label="复制原帖链接：${escape(p.title)}" title="复制原帖链接"><svg><use href="#i-copy"/></svg></button><a class="original-link" href="${escape(p.url)}" target="_blank" rel="noopener noreferrer">在 X 查看<svg><use href="#i-arrow"/></svg></a></div></div><details class="source-details"><summary>核对来源</summary><a href="${escape(validLink(p.sourceUrl))}" target="_blank" rel="noopener noreferrer">查看此条公开存档</a></details></article>`;
  }
  function render() {
    renderFilters();
    const visible = state.posts.filter((p) => baseMatches(p) && (state.day === '全部' || dateKey(p.publishedAt) === state.day)).sort((a,b) => (new Date(b.publishedAt)-new Date(a.publishedAt)) * (state.sort === 'newest' ? 1 : -1));
    $('#result-note').textContent = state.query || state.topic !== '全部' || state.day !== '全部' ? `找到 ${visible.length} 条相关动态，共收录 ${state.posts.length} 条` : `${state.posts.length} 条可核对动态 · 中文摘要 · 每条直达原帖`;
    $('#feed-end').hidden = visible.length === 0;
    if (!visible.length) { $('#posts').innerHTML = '<div class="empty-state"><svg><use href="#i-search"/></svg><h3>没有找到匹配的动态</h3><p>试试其他关键词，或者清除当前筛选。</p><button class="reset-button" id="reset-filters">清除筛选</button></div>'; return; }
    const grouped = new Map(); visible.forEach((p) => { const d = dateKey(p.publishedAt); if (!grouped.has(d)) grouped.set(d, []); grouped.get(d).push(p); });
    $('#posts').innerHTML = [...grouped].map(([d, posts]) => `<section class="date-section" aria-label="${dayDisplay(d)}动态"><header class="date-header"><h3>${dayDisplay(d)}</h3><span class="weekday">${fmt(`${d}T12:00:00+08:00`,{weekday:'long'})}</span><span class="day-count">${posts.length} 条动态</span></header>${posts.map(postMarkup).join('')}</section>`).join('');
    // A small explicit badge avoids external icon/font dependencies.
    document.querySelectorAll('.post-author .verified-badge').forEach((el) => {el.setAttribute('viewBox','0 0 20 20'); el.innerHTML = '<circle cx="10" cy="10" r="8" fill="currentColor"/><path d="m6 10 2.5 2.5L14 7" fill="none" stroke="white" stroke-width="1.7"/>';});
  }
  function setupMeta() {
    const start = new Date(new Date(state.capturedAt).getTime() - state.windowHours*3600000);
    $('#capture-label').textContent = `收集于 ${shortDate(state.capturedAt)} ${time(state.capturedAt)}`;
    $('#window-label').textContent = `${shortDate(start)} ${time(start)} — ${shortDate(state.capturedAt)} ${time(state.capturedAt)}`;
    $('#method-window').textContent = `${fullDate(start)} 至 ${fullDate(state.capturedAt)}（香港时间，${state.windowHours} 小时）`;
    $('#method-captured').textContent = `${fullDate(state.capturedAt)}（香港时间）`;
    $('#nav-count').textContent = state.posts.length;
    $('#total-count').textContent = `${state.posts.length} 条`;
    $('#aside-count').textContent = state.posts.length;
    $('#topic-count').textContent = new Set(state.posts.map((p) => p.topic)).size;
    const daily = days().map((d) => ({ d, count:state.posts.filter((p) => dateKey(p.publishedAt) === d).length }));
    const maximum = Math.max(1,...daily.map((v) => v.count));
    $('#daily-chart').innerHTML = daily.map(({d,count}) => `<button class="chart-row" data-day="${escape(d)}" aria-label="筛选${dayDisplay(d)}，${count}条动态"><span class="chart-label">${Number(d.slice(5,7))}.${d.slice(8)}</span><span class="bar-track"><span class="bar-fill" style="display:block;width:${count/maximum*100}%"></span></span><span class="chart-value">${count}</span></button>`).join('');
    const until = new Date(new Date(state.capturedAt).getTime()+86400000).toISOString().slice(0,10);
    $('#x-search').href = `https://x.com/search?q=${encodeURIComponent(`from:elonmusk since:${start.toISOString().slice(0,10)} until:${until}`)}&f=live`;
  }
  document.addEventListener('click', async (e) => {
    const topic = e.target.closest('[data-topic]'); if (topic) {state.topic = topic.dataset.topic;render();}
    const day = e.target.closest('[data-day]'); if (day) {state.day = day.dataset.day;render(); if(day.closest('#daily-chart')) $('#feed').scrollIntoView({behavior:'smooth'});}
    if (e.target.closest('#reset-filters')) {state.query = '';state.topic = '全部';state.day = '全部';$('#search').value = '';render();}
    const copy = e.target.closest('[data-copy]'); if (copy) { try {await navigator.clipboard.writeText(copy.dataset.copy);toast('原帖链接已复制');} catch {toast('当前浏览器不允许复制，请使用“在 X 查看”打开原帖');} }
    if (e.target.closest('[data-open-method]')) {$('#method-dialog').showModal();$('#sidebar').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');}
    if (e.target.closest('#close-dialog,#method-done')) $('#method-dialog').close();
    if (e.target.closest('#sidebar a')) {$('#sidebar').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');}
    if (!e.target.closest('#sidebar,#menu-toggle')) {$('#sidebar').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');}
  });
  $('#method-dialog').addEventListener('click',(e) => {if(e.target === $('#method-dialog')) {const r = e.target.getBoundingClientRect();if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close();}});
  $('#menu-toggle').addEventListener('click',() => {const open = $('#sidebar').classList.toggle('open');$('#menu-toggle').setAttribute('aria-expanded',String(open));});
  $('#search').addEventListener('input',(e) => {state.query = e.target.value.trim().toLocaleLowerCase();render();});
  $('#sort').addEventListener('change',(e) => {state.sort = e.target.value;render();});
  document.addEventListener('keydown',(e) => {if(e.key === '/' && !e.ctrlKey && !e.metaKey && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !$('#method-dialog').open) {e.preventDefault();$('#search').focus();} if(e.key === 'Escape') {$('#sidebar').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');}});
  fetch('./posts.json').then((r) => {if(!r.ok) throw new Error('data');return r.json();}).then((data) => {
    state.capturedAt = data.meta.capturedAt; state.windowHours = data.meta.windowHours ?? 72;
    if (!Number.isFinite(Date.parse(state.capturedAt))) throw new Error('date');
    const end = new Date(state.capturedAt).getTime(), start = end - state.windowHours*3600000;
    state.posts = data.posts.filter((p) => /^https:\/\/x\.com\/elonmusk\/status\/\d+$/.test(p.url) && Number.isFinite(Date.parse(p.publishedAt)) && Date.parse(p.publishedAt) >= start && Date.parse(p.publishedAt) <= end && validLink(p.sourceUrl));
    setupMeta();render();
  }).catch(() => {$('#capture-label').textContent = '快照载入失败';$('#result-note').textContent = '暂时无法读取收录数据';$('#posts').innerHTML = '<div class="empty-state"><h3>快照暂时没有载入</h3><p>请重新加载页面，或直接访问 X 个人主页。</p><button class="reset-button" id="reload-page">重新加载页面</button></div>';$('#reload-page').addEventListener('click',() => location.reload());});
})();
