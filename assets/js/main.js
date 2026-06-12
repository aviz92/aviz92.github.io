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

  // ---- Category + sub-category filter ----
  const filterBtns = document.querySelectorAll('.filter-btn:not(.filter-btn--sub)');
  const subFilterBars = document.querySelectorAll('.sub-filter-bar');
  const cards = document.querySelectorAll('#post-grid .card');
  const noPostsMsg = document.querySelector('.no-posts-msg');

  if (filterBtns.length && cards.length) {
    updateFeaturedCard();

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.filter;

        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Filter cards by primary category
        let visibleCount = 0;
        cards.forEach(card => {
          const match = cat === 'all' || card.dataset.category === cat;
          card.classList.toggle('card--hidden', !match);
          if (match) visibleCount++;
        });

        if (noPostsMsg) noPostsMsg.hidden = visibleCount > 0;
        updateFeaturedCard();

        // Show matching sub-filter bar, hide others
        subFilterBars.forEach(bar => {
          const show = cat !== 'all' && bar.dataset.parent === cat;
          bar.classList.toggle('is-open', show);
          if (show) {
            bar.querySelectorAll('.filter-btn--sub').forEach(b => b.classList.remove('active'));
            bar.querySelector('[data-sub-filter="all"]').classList.add('active');
          }
        });
      });
    });

    // Sub-category filter
    subFilterBars.forEach(bar => {
      bar.querySelectorAll('.filter-btn--sub').forEach(btn => {
        btn.addEventListener('click', () => {
          const subCat = btn.dataset.subFilter;
          const parent = bar.dataset.parent;

          bar.querySelectorAll('.filter-btn--sub').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          let visibleCount = 0;
          cards.forEach(card => {
            if (card.dataset.category !== parent) {
              card.classList.add('card--hidden');
              return;
            }
            const match = subCat === 'all' || card.dataset.subcategory === subCat;
            card.classList.toggle('card--hidden', !match);
            if (match) visibleCount++;
          });

          if (noPostsMsg) noPostsMsg.hidden = visibleCount > 0;
          updateFeaturedCard();
        });
      });
    });
  }

  function updateFeaturedCard() {
    cards.forEach(c => c.classList.remove('card--featured'));
    const first = [...cards].find(c => !c.classList.contains('card--hidden'));
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
        const rect = s.getBoundingClientRect();
        if (rect.top < window.innerHeight) {
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
