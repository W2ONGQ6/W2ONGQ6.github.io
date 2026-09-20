(function () {
  const root = document.documentElement;
  if (/^https?:$/.test(location.protocol)) {
    document.querySelectorAll('[data-blog-home]').forEach(link => { link.href = '/'; });
  }

  document.querySelectorAll('[data-action="theme"]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('docs-theme', next); } catch { /* Storage may be unavailable for local files. */ }
    });
  });

  document.querySelectorAll('[data-action="print"]').forEach((button) => {
    button.addEventListener('click', () => window.print());
  });

  const progress = document.querySelector('.reading-progress');
  if (progress) {
    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }
})();
