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

  // ---- Archives / all-posts: cascading dropdowns + pagination ----
  const ARCHIVE_PER_PAGE = 15;
  const archiveRows = [...document.querySelectorAll('.archives__row')];
  const archivePager = document.querySelector('.archives-pager');
  const catSel = document.querySelector('#arc-cat');
  const subSel = document.querySelector('#arc-sub');
  const tagSel = document.querySelector('#arc-tag');
  const archiveNoMsg = document.querySelector('.post.archives .no-posts-msg');

  if (archiveRows.length && catSel) {
    let archivePage = 1;

    function buildOptions(select, values, allLabel) {
      const prev = select.value;
      select.textContent = '';
      const allOpt = document.createElement('option');
      allOpt.value = 'all';
      allOpt.textContent = allLabel;
      select.append(allOpt);
      values.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        if (v === prev) opt.selected = true;
        select.append(opt);
      });
      if (prev !== 'all' && !values.includes(prev)) select.value = 'all';
    }

    function updateSubOptions() {
      if (!subSel) return;
      const cat = catSel.value;
      const rows = cat === 'all' ? archiveRows : archiveRows.filter(r => r.dataset.category === cat);
      const subs = [...new Set(
        rows.filter(r => r.dataset.subcategory && r.dataset.subcategory !== r.dataset.category)
            .map(r => r.dataset.subcategory)
      )].sort();
      buildOptions(subSel, subs, 'All sub-categories');
    }

    function updateTagOptions() {
      if (!tagSel) return;
      const cat = catSel.value;
      const sub = subSel ? subSel.value : 'all';
      const rows = archiveRows.filter(r => {
        const mc = cat === 'all' || r.dataset.category === cat;
        const ms = sub === 'all' || r.dataset.subcategory === sub;
        return mc && ms;
      });
      const tags = [...new Set(
        rows.flatMap(r => (r.dataset.tags || '').split(' ').filter(Boolean))
      )].sort();
      buildOptions(tagSel, tags, 'All tags');
    }

    function getFilteredArchiveRows() {
      const cat = catSel.value;
      const sub = subSel ? subSel.value : 'all';
      const tag = tagSel ? tagSel.value : 'all';
      return archiveRows.filter(row => {
        const mc = cat === 'all' || row.dataset.category === cat;
        const ms = sub === 'all' || row.dataset.subcategory === sub;
        const mt = tag === 'all' || (row.dataset.tags || '').split(' ').includes(tag);
        return mc && ms && mt;
      });
    }

    function renderArchivePage(page) {
      const filtered = getFilteredArchiveRows();
      const total = Math.max(1, Math.ceil(filtered.length / ARCHIVE_PER_PAGE));
      archivePage = Math.min(Math.max(page, 1), total);
      const start = (archivePage - 1) * ARCHIVE_PER_PAGE;
      const visible = new Set(filtered.slice(start, start + ARCHIVE_PER_PAGE));

      archiveRows.forEach(row => { row.style.display = visible.has(row) ? '' : 'none'; });

      document.querySelectorAll('.archives__group').forEach(group => {
        const hasVisible = [...group.querySelectorAll('.archives__row')].some(r => r.style.display !== 'none');
        group.style.display = hasVisible ? '' : 'none';
      });

      if (archiveNoMsg) archiveNoMsg.hidden = filtered.length > 0;
      if (archivePager) renderArchivePager(archivePage, total);
    }

    function renderArchivePager(page, total) {
      archivePager.textContent = '';
      const inner = document.createElement('div');
      inner.className = 'pager__inner';

      const makeBtn = (label, targetPage, isActive = false) => {
        const btn = document.createElement('button');
        btn.className = 'pager__btn' + (isActive ? ' active' : '');
        btn.textContent = label;
        btn.addEventListener('click', () => {
          renderArchivePage(targetPage);
          document.querySelector('.post.archives')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return btn;
      };

      if (page > 1) inner.append(makeBtn('← Prev', page - 1));
      for (let i = 1; i <= total; i++) inner.append(makeBtn(String(i), i, i === page));
      if (page < total) inner.append(makeBtn('Next →', page + 1));

      archivePager.append(inner);
    }

    catSel.addEventListener('change', () => {
      archivePage = 1;
      updateSubOptions();
      updateTagOptions();
      renderArchivePage(1);
    });

    subSel?.addEventListener('change', () => {
      archivePage = 1;
      updateTagOptions();
      renderArchivePage(1);
    });

    tagSel?.addEventListener('change', () => {
      archivePage = 1;
      renderArchivePage(1);
    });

    // Init: populate all selects from row data, then render
    const allCats = [...new Set(archiveRows.map(r => r.dataset.category).filter(Boolean))].sort();
    buildOptions(catSel, allCats, 'All categories');
    updateSubOptions();
    updateTagOptions();
    renderArchivePage(1);
  }

  // ---- Project category filter + pagination ----
  const PROJECTS_PER_PAGE = 9;
  const projCards = [...document.querySelectorAll('.project-card')];
  const projSelect = document.querySelector('#proj-cat');
  const projPager = document.querySelector('.project-pager');
  let projPage = 1;

  if (projCards.length && projSelect) {
    const cats = [...new Set(projCards.map(c => c.dataset.cat))].sort();
    cats.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
      projSelect.append(opt);
    });
    // cross-category view used by the hero "PyPI packages" stat
    projSelect.append(new Option('On PyPI', 'pypi'));

    function renderProjects() {
      const val = projSelect.value;
      const filtered = projCards.filter(c =>
        val === 'all' || c.dataset.cat === val || (val === 'pypi' && 'pypi' in c.dataset));
      const totalPages = Math.max(1, Math.ceil(filtered.length / PROJECTS_PER_PAGE));
      projPage = Math.min(projPage, totalPages);

      const start = (projPage - 1) * PROJECTS_PER_PAGE;
      const visible = new Set(filtered.slice(start, start + PROJECTS_PER_PAGE));
      projCards.forEach(card => { card.hidden = !visible.has(card); });

      renderProjPager(projPage, totalPages);
    }

    function renderProjPager(page, total) {
      if (!projPager) return;
      projPager.textContent = '';
      if (total <= 1) return;

      const inner = document.createElement('div');
      inner.className = 'pager__inner';

      const makeBtn = (label, targetPage, isActive = false) => {
        const btn = document.createElement('button');
        btn.className = 'pager__btn' + (isActive ? ' active' : '');
        btn.textContent = label;
        btn.addEventListener('click', () => {
          projPage = targetPage;
          renderProjects();
          document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return btn;
      };

      if (page > 1) inner.append(makeBtn('← Prev', page - 1));
      for (let i = 1; i <= total; i++) inner.append(makeBtn(String(i), i, i === page));
      if (page < total) inner.append(makeBtn('Next →', page + 1));

      projPager.append(inner);
    }

    projSelect.addEventListener('change', () => {
      projPage = 1;
      renderProjects();
    });

    renderProjects();
  }

  // ---- Reveal on scroll: .section-reveal sections and .rv elements ----
  // Items inside [data-stagger] get increasing delays so a group cascades in.
  document.querySelectorAll('[data-stagger]').forEach(group => {
    group.querySelectorAll('.rv').forEach((el, i) => el.style.setProperty('--d', `${i * 0.08}s`));
  });

  const revealEls = document.querySelectorAll('.section-reveal, .rv');
  const reveal = el => el.classList.add('visible', 'in');

  if (revealEls.length) {
    if (!('IntersectionObserver' in window)) {
      revealEls.forEach(reveal);
    } else {
      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              reveal(entry.target);
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '0px 0px -60px 0px', threshold: 0.05 }
      );
      // wait two frames so above-the-fold items paint hidden first and animate in
      requestAnimationFrame(() => requestAnimationFrame(() => {
        revealEls.forEach(el => revealObserver.observe(el));
      }));
    }
  }

  // ---- Deck buttons: jump to the project grid pre-filtered ----
  const projCatSelect = document.querySelector('#proj-cat');

  document.querySelectorAll('[data-proj-cat]').forEach(link => {
    link.addEventListener('click', () => {
      if (!projCatSelect) return;
      projCatSelect.value = link.dataset.projCat;
      projCatSelect.dispatchEvent(new Event('change'));
    });
  });

  // ---- Hero stats count up from zero once they scroll into view ----
  const counters = [...document.querySelectorAll('[data-count]')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (counters.length && !reduceMotion && 'IntersectionObserver' in window) {
    const countUp = (el) => {
      const target = Number(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const start = performance.now();
      const duration = 1400;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 4); // ease-out, matches --ease
        el.textContent = `${Math.round(target * eased)}${suffix}`;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const countObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          countUp(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(el => countObserver.observe(el));
  }

  // hero stat cards take turns showing their "Show me" hint while on screen
  const statLinks = [...document.querySelectorAll('.hero__stats .stat')];

  if (statLinks.length && !reduceMotion && 'IntersectionObserver' in window) {
    const statList = document.querySelector('.hero__stats');
    let hinted = -1;
    let hintTimer = null;
    const nextHint = () => {
      statLinks.forEach(l => l.classList.remove('hint'));
      hinted = (hinted + 1) % statLinks.length;
      statLinks[hinted].classList.add('hint');
    };
    const stopHints = () => {
      clearInterval(hintTimer);
      hintTimer = null;
      statLinks.forEach(l => l.classList.remove('hint'));
    };
    statList.addEventListener('mouseenter', stopHints);

    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hintTimer && !statList.matches(':hover')) {
        hintTimer = setInterval(nextHint, 2400);
      } else if (!entry.isIntersecting) {
        stopHints();
      }
    }, { threshold: 0.6 }).observe(statList);
  }

  // ---- Selected work: the step crossing the viewport middle drives the pinned stage ----
  const storySteps = [...document.querySelectorAll('.story__step')];

  if (storySteps.length && 'IntersectionObserver' in window) {
    const storySets = [...document.querySelectorAll('.story__set')];
    const railTicks = [...document.querySelectorAll('.story__rail i')];
    const storyNum = document.querySelector('.story__num');
    const storyNumText = storyNum.querySelector('span');
    let activeStep = 0;

    const setActiveStep = (i) => {
      if (i === activeStep) return;
      activeStep = i;
      [storySteps, storySets, railTicks].forEach(group => {
        group.forEach((el, j) => el.classList.toggle('on', j === i));
      });
      storyNum.classList.add('swap');
      storyNumText.textContent = String(i + 1).padStart(2, '0');
      void storyNum.offsetWidth; // restart the numeral's slide-in transition
      storyNum.classList.remove('swap');
    };

    const stepObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveStep(Number(entry.target.dataset.i));
        });
      },
      { rootMargin: '-45% 0px -45% 0px' }
    );
    storySteps.forEach(step => stepObserver.observe(step));
  }

  // ---- Scroll-linked motion: progress bar, nav collapse, process line, deck ----
  // One passive listener, throttled to a frame; all reads happen before writes.
  const progressBar = document.querySelector('.progress');
  const siteNav = document.querySelector('.site-nav');
  const processSteps = document.querySelector('.process__steps');
  const processFill = document.querySelector('.process__fill');
  const processItems = processSteps ? [...processSteps.querySelectorAll('.process__step')] : [];
  const deckCards = [...document.querySelectorAll('.deck__card')];
  let scrollTicking = false;

  function updateScrollMotion() {
    const y = window.scrollY;
    const vh = window.innerHeight;
    const maxScroll = document.documentElement.scrollHeight - vh;
    const processRect = processSteps ? processSteps.getBoundingClientRect() : null;
    const deckTops = deckCards.map(card => card.getBoundingClientRect().top);
    const deckHeights = deckCards.map(card => card.offsetHeight);

    if (progressBar) progressBar.style.transform = `scaleX(${maxScroll > 0 ? y / maxScroll : 0})`;
    if (siteNav) siteNav.classList.toggle('is-scrolled', y > 80);

    if (processRect && processFill) {
      // 0 as the steps rise into the lower part of the viewport, 1 once they pass the middle
      const raw = (vh * 0.85 - processRect.top) / (vh * 0.4 + processRect.height * 0.5);
      const p = Math.min(1, Math.max(0, raw));
      processFill.style.setProperty('--p', p.toFixed(3));
      const last = Math.max(1, processItems.length - 1);
      processItems.forEach((step, i) => step.classList.toggle('lit', p > 0 && p >= i / last - 0.001));
    }

    deckCards.forEach((card, i) => {
      const nextTop = deckTops[i + 1];
      card.classList.toggle('under', nextTop !== undefined && nextTop - deckTops[i] < deckHeights[i] * 0.5);
    });

    scrollTicking = false;
  }

  if (progressBar || processFill || deckCards.length) {
    window.addEventListener('scroll', () => {
      if (!scrollTicking) {
        scrollTicking = true;
        requestAnimationFrame(updateScrollMotion);
      }
    }, { passive: true });
    window.addEventListener('resize', updateScrollMotion);
    updateScrollMotion();
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
