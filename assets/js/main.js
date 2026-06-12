document.addEventListener('DOMContentLoaded', () => {

  // ---- Code block headers: language label + copy button ----
  document.querySelectorAll('div.highlighter-rouge, figure.highlight').forEach((block) => {
    const langMatch = block.className.match(/language-(\S+)/);
    const lang = langMatch ? langMatch[1] : 'text';

    const header = document.createElement('div');
    header.className = 'code-header';

    const label = document.createElement('span');
    label.textContent = lang;

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Copy';
    button.addEventListener('click', async () => {
      const code = block.querySelector('pre');
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code.innerText);
        button.textContent = 'Copied ✓';
        button.classList.add('copied');
        setTimeout(() => {
          button.textContent = 'Copy';
          button.classList.remove('copied');
        }, 1500);
      } catch {
        button.textContent = 'Failed';
      }
    });

    header.append(label, button);
    block.prepend(header);
  });

  // ---- Category filter + sub-category filter + pagination ----
  const POSTS_PER_PAGE = 6;
  let currentPage = 1;
  let activeFilter = 'all';
  let activeSubFilter = 'all';

  const filterBtns = document.querySelectorAll('.filter-btn:not(.filter-btn--sub)');
  const subFilterBars = document.querySelectorAll('.sub-filter-bar');
  const cards = [...document.querySelectorAll('#post-grid .card')];
  const noPostsMsg = document.querySelector('.no-posts-msg');
  const pager = document.querySelector('.post-pager');

  if (filterBtns.length && cards.length) {
    applyFiltersAndPagination();

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter;
        activeSubFilter = 'all';
        currentPage = 1;

        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        subFilterBars.forEach(bar => {
          const show = activeFilter !== 'all' && bar.dataset.parent === activeFilter;
          bar.classList.toggle('is-open', show);
          if (show) {
            bar.querySelectorAll('.filter-btn--sub').forEach(b => b.classList.remove('active'));
            bar.querySelector('[data-sub-filter="all"]').classList.add('active');
          }
        });

        applyFiltersAndPagination();
      });
    });

    subFilterBars.forEach(bar => {
      bar.querySelectorAll('.filter-btn--sub').forEach(btn => {
        btn.addEventListener('click', () => {
          activeSubFilter = btn.dataset.subFilter;
          currentPage = 1;

          bar.querySelectorAll('.filter-btn--sub').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          applyFiltersAndPagination();
        });
      });
    });
  }

  function getFilteredCards() {
    return cards.filter(card => {
      const matchCat = activeFilter === 'all' || card.dataset.category === activeFilter;
      const matchSub = activeSubFilter === 'all' || card.dataset.subcategory === activeSubFilter;
      return matchCat && matchSub;
    });
  }

  function applyFiltersAndPagination() {
    const filtered = getFilteredCards();
    const totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE));
    currentPage = Math.min(currentPage, totalPages);

    const start = (currentPage - 1) * POSTS_PER_PAGE;
    const pageSet = new Set(filtered.slice(start, start + POSTS_PER_PAGE));

    cards.forEach(card => card.classList.toggle('card--hidden', !pageSet.has(card)));

    if (noPostsMsg) noPostsMsg.hidden = filtered.length > 0;
    updateFeaturedCard();
    renderPagination(currentPage, totalPages);
  }

  function renderPagination(page, total) {
    if (!pager) return;
    pager.textContent = '';

    const inner = document.createElement('div');
    inner.className = 'pager__inner';

    const makeBtn = (label, targetPage, isActive = false) => {
      const btn = document.createElement('button');
      btn.className = 'pager__btn' + (isActive ? ' active' : '');
      btn.textContent = label;
      btn.dataset.page = targetPage;
      btn.addEventListener('click', () => {
        currentPage = targetPage;
        applyFiltersAndPagination();
        document.getElementById('posts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return btn;
    };

    if (page > 1) inner.append(makeBtn('← Prev', page - 1));
    for (let i = 1; i <= total; i++) inner.append(makeBtn(String(i), i, i === page));
    if (page < total) inner.append(makeBtn('Next →', page + 1));

    pager.append(inner);
  }

  function updateFeaturedCard() {
    cards.forEach(c => c.classList.remove('card--featured'));
    const first = cards.find(c => !c.classList.contains('card--hidden'));
    if (first) first.classList.add('card--featured');
  }

  // ---- Section reveal on scroll ----
  const revealSections = document.querySelectorAll('.section-reveal');

  if (revealSections.length) {
    if (!('IntersectionObserver' in window)) {
      revealSections.forEach(s => s.classList.add('visible'));
    } else {
      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '0px 0px -60px 0px', threshold: 0.05 }
      );

      revealSections.forEach(s => {
        if (s.getBoundingClientRect().top < window.innerHeight) {
          s.classList.add('visible');
        } else {
          revealObserver.observe(s);
        }
      });
    }
  }

  // ---- Scroll-spy: active nav section link ----
  const sections = document.querySelectorAll('section[id]');
  const sectionLinks = document.querySelectorAll('.nav-section-link');

  if (sections.length && sectionLinks.length) {
    const spyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            sectionLinks.forEach(link => link.classList.remove('active'));
            const active = document.querySelector(`.nav-section-link[href="#${entry.target.id}"]`);
            if (active) active.classList.add('active');
          }
        });
      },
      { rootMargin: '-35% 0px -65% 0px' }
    );
    sections.forEach(s => spyObserver.observe(s));
  }

});
