/* Navigation and reading controls progressively enhance the static content. */
(() => {
  'use strict';
  const menu = document.querySelector('#site-menu');
  const toggle = document.querySelector('.menu-toggle');
  const closeMenu = () => {
    menu?.classList.remove('is-open');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', '展开导航');
  };
  toggle?.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '收起导航' : '展开导航');
  });
  document.addEventListener('click', event => { if (!event.target.closest('.site-nav')) closeMenu(); });
  menu?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  window.addEventListener('resize', () => { if (innerWidth > 700) closeMenu(); });

  const filters = [...document.querySelectorAll('[data-topic-filter]')];
  filters.forEach(button => button.addEventListener('click', () => {
    const selected = button.dataset.topicFilter;
    filters.forEach(filter => {
      filter.classList.toggle('is-active', filter === button);
      filter.setAttribute('aria-pressed', String(filter === button));
    });
    let count = 0;
    document.querySelectorAll('[data-topic-group]').forEach(card => {
      card.hidden = selected !== '全部' && card.dataset.topicGroup !== selected;
      if (!card.hidden) count++;
    });
    document.querySelector('#topic-status').textContent = `显示 ${count} 个${selected === '全部' ? '' : selected}专题`;
  }));

  const search = document.querySelector('#site-search');
  const input = document.querySelector('#site-search-input');
  const status = document.querySelector('#search-status');
  const results = document.querySelector('#site-search-results');
  let indexPromise, index, timer, opener;
  const getIndex = () => {
    if (!indexPromise) indexPromise = fetch('/search-index.json').then(response => {
      if (!response.ok) throw Error('search unavailable');
      return response.json();
    }).then(data => { index = data; return data; }).catch(error => { indexPromise = null; throw error; });
    return indexPromise;
  };
  function highlighted(text, words) {
    const fragment = document.createDocumentFragment();
    const pattern = new RegExp(words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
    let offset = 0;
    for (const match of text.matchAll(pattern)) {
      fragment.append(text.slice(offset, match.index));
      const mark = document.createElement('mark'); mark.textContent = match[0]; fragment.append(mark);
      offset = match.index + match[0].length;
    }
    fragment.append(text.slice(offset));
    return fragment;
  }
  async function performSearch() {
    const query = input.value.trim().toLowerCase();
    results.replaceChildren();
    if (!query) { status.textContent = '输入关键词，搜索文章标题与正文。'; return; }
    status.textContent = index ? '正在搜索…' : '正在加载文章索引…';
    try { await getIndex(); } catch {
      status.textContent = '暂时无法加载搜索。请检查网络后重新输入关键词。'; return;
    }
    if (input.value.trim().toLowerCase() !== query) return;
    const words = [...new Set(query.split(/\s+/))];
    const matches = index.map(item => {
      const title = item.title.toLowerCase(), content = item.content.toLowerCase();
      return { item, score: words.reduce((score,word) => score + (title.includes(word) ? 10 : 0), 0),
        match: words.every(word => title.includes(word) || content.includes(word)) };
    }).filter(result => result.match).sort((a,b) => b.score - a.score);
    status.textContent = matches.length ? `找到 ${matches.length} 篇文章${matches.length > 50 ? '，显示前 50 篇；可增加关键词缩小范围' : ''}` : '没有找到匹配的文章，试试更短的关键词。';
    for (const {item} of matches.slice(0,50)) {
      const link = document.createElement('a'); link.className = 'search-result'; link.href = item.url;
      const title = document.createElement('h3'); title.append(highlighted(item.title, words));
      const position = Math.max(0, item.content.toLowerCase().indexOf(words[0]) - 35);
      const excerpt = item.content.slice(position, position + 150);
      const description = document.createElement('p'); description.append(highlighted((position ? '…' : '') + excerpt + (position + 150 < item.content.length ? '…' : ''),words));
      link.append(title,description); results.append(link);
    }
  }
  function openSearch(trigger) {
    opener = trigger || document.activeElement; closeMenu();
    if (!search.open) search.showModal();
    input.focus();
    getIndex().catch(() => { status.textContent = '搜索索引暂时不可用，输入关键词可重试。'; });
  }
  document.querySelectorAll('[data-open-search]').forEach(button => button.addEventListener('click', () => openSearch(button)));
  document.querySelector('[data-close-search]')?.addEventListener('click', () => search.close());
  search?.addEventListener('close', () => opener?.focus());
  search?.addEventListener('click', event => {
    const bounds = search.getBoundingClientRect();
    if (event.target === search && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) search.close();
  });
  input?.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(performSearch, 160); });
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); }
    if (event.key === 'Escape' && menu?.classList.contains('is-open')) { closeMenu(); toggle.focus(); }
  });

  const topButton = document.querySelector('.back-to-top');
  const progress = document.querySelector('.reading-progress>span');
  const article = document.querySelector('.markdown-body');
  const tocLinks = [...document.querySelectorAll('#reading-toc a')];
  const headings = tocLinks.map(link => document.getElementById(decodeURIComponent(link.hash.slice(1)))).filter(Boolean);
  let scheduled = false;
  function updateReading() {
    scheduled = false;
    topButton.hidden = scrollY < 600;
    if (!article) return;
    const top = article.getBoundingClientRect().top + scrollY - 100;
    const travel = Math.max(1, article.offsetHeight - innerHeight + 150);
    progress.style.transform = `scaleX(${Math.min(1,Math.max(0,(scrollY-top)/travel))})`;
    const current = [...headings].reverse().find(heading => heading.getBoundingClientRect().top <= 150) || headings[0];
    tocLinks.forEach(link => {
      const active = decodeURIComponent(link.hash.slice(1)) === current?.id;
      link.classList.toggle('is-active',active);
      if (active) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current');
    });
  }
  const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateReading); } };
  addEventListener('scroll',schedule,{passive:true}); addEventListener('resize',schedule); updateReading();
  topButton?.addEventListener('click', () => {
    scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    document.querySelector('.site-brand').focus({preventScroll:true});
  });
  document.querySelectorAll('.mobile-contents a').forEach(link => link.addEventListener('click', () => { document.querySelector('.mobile-contents details').open = false; }));
  document.querySelectorAll('.markdown-body pre>code:not(.mermaid)').forEach(code => {
    const block = code.closest('figure.highlight') || code.parentElement;
    const frame = document.createElement('div'); frame.className = 'code-frame';
    block.before(frame); frame.append(block);
    const toolbar = document.createElement('div'); toolbar.className = 'code-toolbar';
    const language = document.createElement('span');
    language.textContent = [...code.classList].find(name => name !== 'hljs')?.replace(/^language-/, '').toUpperCase() || 'TEXT';
    const control = document.createElement('button'); control.className = 'code-copy'; control.type = 'button';
    control.textContent = '复制代码'; control.setAttribute('aria-label', '复制代码'); control.setAttribute('aria-live', 'polite');
    control.addEventListener('click', async () => {
      try {
        const text = code.innerText;
        if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
        else {
          const area = document.createElement('textarea'); area.value = text;
          area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
          document.body.append(area); area.select();
          const success = document.execCommand('copy'); area.remove(); control.focus();
          if (!success) throw Error('copy denied');
        }
        control.textContent = '已复制 ✓';
      } catch { control.textContent = '复制失败，请手动选择'; }
      setTimeout(() => { control.textContent = '复制代码'; }, 2200);
    });
    toolbar.append(language, control); frame.prepend(toolbar);
  });
  document.querySelectorAll('.markdown-body table,.markdown-body pre,.markdown-body mjx-container[display="true"]').forEach(element => {
    if (element.scrollWidth > element.clientWidth) { element.tabIndex = 0; element.setAttribute('aria-label','可横向滚动的内容'); }
  });
})();
