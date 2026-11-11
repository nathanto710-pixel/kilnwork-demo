(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* headline word split */
  $$('[data-split]').forEach((el) => {
    let i = 0;
    const wrap = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const w = document.createElement('span'); w.className = 'w';
            const wi = document.createElement('span'); wi.className = 'wi';
            wi.style.setProperty('--i', i++); wi.textContent = part;
            w.append(wi); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrap(n);
      });
    };
    wrap(el);
    setTimeout(() => el.classList.add('is-split'), 60);
  });

  /* scroll reveals */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach((el) => io.observe(el));

  /* file tree row stagger */
  $$('.tree li').forEach((li, n) => li.style.setProperty('--n', n));

  /* waveform bars */
  const wave = $('#wave');
  if (wave) {
    const ns = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < 86; i++) {
      const h = 8 + Math.abs(Math.sin(i * 0.55) * 26 + Math.sin(i * 1.7) * 12);
      const r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', 20 + i * 6.05); r.setAttribute('y', 178 - h / 2);
      r.setAttribute('width', 3); r.setAttribute('height', h); r.setAttribute('rx', 1.5);
      r.style.animationDelay = `${-(i % 9) * 0.16}s`;
      wave.append(r);
    }
  }

  /* pointer: cursor glow, card spotlight, magnetic buttons, tilt */
  if (fine && !reduce) {
    document.body.classList.add('has-pointer');
    const root = document.documentElement;
    addEventListener('pointermove', (e) => {
      root.style.setProperty('--cx', e.clientX + 'px');
      root.style.setProperty('--cy', e.clientY + 'px');
    }, { passive: true });

    $$('[data-spot]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', e.clientX - r.left + 'px');
        el.style.setProperty('--my', e.clientY - r.top + 'px');
      }, { passive: true });
    });

    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.22;
        const y = (e.clientY - r.top - r.height / 2) * 0.3;
        el.style.transform = `translate(${x}px,${y}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    const tilt = $('[data-tilt]');
    if (tilt) {
      const stage = tilt.parentElement;
      stage.addEventListener('pointermove', (e) => {
        const r = stage.getBoundingClientRect();
        tilt.style.setProperty('--rx', (((e.clientX - r.left) / r.width) - 0.5) * 9);
        tilt.style.setProperty('--ry', -(((e.clientY - r.top) / r.height) - 0.5) * 9 - 6);
      });
      stage.addEventListener('pointerleave', () => { tilt.style.setProperty('--rx', 0); tilt.style.setProperty('--ry', 0); });
    }
  }

  /* hero dust: glowing motes rising from the horizon */
  const cv = $('#dust');
  if (cv && !reduce) {
    const ctx = cv.getContext('2d');
    let w, h, dpr, motes = [], visible = true;
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(110, w / 13));
      motes = Array.from({ length: count }, () => spawn(true));
    };
    const spawn = (anywhere) => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: Math.random() * 1.5 + 0.3,
      v: Math.random() * 0.35 + 0.08,
      d: (Math.random() - 0.5) * 0.25,
      p: Math.random() * Math.PI * 2,
    });
    const tick = (t) => {
      if (visible) {
        ctx.clearRect(0, 0, w, h);
        for (const m of motes) {
          m.y -= m.v; m.x += m.d + Math.sin(t / 1600 + m.p) * 0.12;
          if (m.y < -10) Object.assign(m, spawn(false));
          const life = Math.min(1, m.y / h * 1.6);
          const a = (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t / 700 + m.p))) * life * (1 - m.y / h * 0.0) ;
          ctx.beginPath();
          ctx.fillStyle = `rgba(255,${170 + m.r * 30 | 0},${110 + m.r * 40 | 0},${a * 0.8})`;
          ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(255,140,70,.9)';
          ctx.arc(m.x, m.y, m.r, 0, 6.283);
          ctx.fill();
        }
      }
      requestAnimationFrame(tick);
    };
    new ResizeObserver(size).observe(cv);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(cv);
    size(); requestAnimationFrame(tick);
  }

  /* hero terminal loop (illustrative runs) */
  const body = $('#termBody'), tagEl = $('#termTag');
  const runs = [
    { tag: 'video-edit', ask: 'edit this clip for Reels', steps: ['Transcribing the audio', 'Cutting silences and stumbles', 'Syncing captions to each word', 'Adding motion graphics'], done: 'Draft ready to review' },
    { tag: 'email-build', ask: 'build the launch email from this brief', steps: ['Reading the brief', 'Writing the copy', 'Coding the HTML layout', 'Checking it on mobile widths'], done: 'Email HTML ready to paste' },
    { tag: 'carousel', ask: 'turn this story into a carousel', steps: ['Finding the hook', 'Laying out the slides', 'Exporting PNG files', 'Writing the caption'], done: 'Carousel ready to review' },
    { tag: 'competitor-scan', ask: 'what are our competitors posting?', steps: ['Collecting their public content', 'Grouping themes and formats', 'Comparing positioning', 'Listing the gaps'], done: 'Report ready to read' },
  ];
  const type = async (el, text, speed = 34) => {
    const caret = document.createElement('i'); caret.className = 'caret';
    const span = document.createElement('span'); el.append(span, caret);
    for (const ch of text) { span.textContent += ch; await sleep(speed + Math.random() * 30); }
    return caret;
  };
  const loop = async () => {
    let i = 0;
    for (;;) {
      const run = runs[i++ % runs.length];
      body.innerHTML = ''; tagEl.textContent = run.tag;
      const p = document.createElement('div'); p.className = 'p'; body.append(p);
      const caret = await type(p, run.ask);
      await sleep(450); caret.remove();
      for (const s of run.steps) {
        const d = document.createElement('div'); d.className = 'ok';
        d.innerHTML = '<b>✓</b>'; d.append(s); body.append(d);
        await sleep(620);
      }
      const d = document.createElement('div'); d.className = 'ok done';
      d.innerHTML = '<b>✳</b>'; d.append(run.done); body.append(d);
      await sleep(2600);
    }
  };
  if (body) {
    if (reduce) {
      const r = runs[0];
      body.innerHTML = `<div class="p">${r.ask}</div>` + r.steps.map((s) => `<div class="ok" style="opacity:1;transform:none"><b>✓</b>${s}</div>`).join('');
    } else setTimeout(loop, 1500);
  }

  /* hero chat loop (illustrative conversations, results are the real samples) */
  const chat = $('#chatBody'), chatTag = $('#chatTag');
  const convos = [
    { tag: 'Video editing', ask: 'Turn this into a short video for Instagram', steps: ['Planning the scenes', 'Adding titles and motion', 'Rendering the video'], thumb: 'demos/lowtide-vox.jpg', title: 'Your video is ready', meta: '30 seconds, vertical' },
    { tag: 'Carousels', ask: 'Make a carousel from this story', steps: ['Finding the hook', 'Laying out the slides', 'Writing the caption'], thumb: 'demos/img/latte.jpg', title: 'Your carousel is ready', meta: '5 slides and a caption' },
    { tag: 'Emails', ask: 'Write the launch email for our list', steps: ['Writing the copy', 'Designing the layout', 'Checking it on a phone'], thumb: 'demos/img/roast1.jpg', title: 'Your email is ready', meta: 'Looks right on phone and computer' },
  ];
  const el = (cls, html = '') => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; return d; };
  const chatLoop = async () => {
    let i = 0;
    for (;;) {
      const c = convos[i++ % convos.length];
      chat.innerHTML = ''; chatTag.textContent = c.tag;
      const me = el('msg msg--me'); chat.append(me);
      const caret = await type(me, c.ask, 30);
      await sleep(350); caret.remove();
      const bot = el('msg msg--bot'); chat.append(bot);
      for (const s of c.steps) { bot.append(el('tick', `<i></i>${s}`)); await sleep(650); }
      await sleep(250);
      chat.append(el('result', `<span class="result__img" style="background-image:url(${c.thumb})"></span><span><b>${c.title}</b><em>${c.meta}</em></span>`));
      await sleep(3200);
    }
  };
  if (chat) {
    if (reduce) {
      const c = convos[0];
      chat.append(el('msg msg--me', c.ask), el('msg msg--bot', c.steps.map((s) => `<div class="tick" style="opacity:1;transform:none"><i></i>${s}</div>`).join('')),
        el('result', `<span class="result__img" style="background-image:url(${c.thumb})"></span><span><b>${c.title}</b><em>${c.meta}</em></span>`));
    } else setTimeout(chatLoop, 1500);
  }

  /* script card typing */
  const typeA = $('#typeA');
  const hooks = ['Nobody tells you this about your first launch.', 'You are editing videos the slow way.', 'Three seconds. That is all a hook gets.'];
  if (typeA) {
    if (reduce) typeA.textContent = hooks[0];
    else (async () => {
      let i = 0;
      for (;;) {
        typeA.innerHTML = '';
        await type(typeA, hooks[i++ % hooks.length], 42);
        await sleep(2400);
      }
    })();
  }

  /* mobile menu */
  const burger = $('#burger'), menu = $('#menu');
  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    menu.setAttribute('aria-hidden', !open);
  };
  burger?.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));

  /* sample viewer */
  const modal = $('#modal'), frame = $('#modalFrame'), mTitle = $('#modalTitle'), mOpen = $('#modalOpen');
  let lastFocus = null;
  const openDemo = (key, title) => {
    const url = `demos/${key}.html`;
    lastFocus = document.activeElement;
    frame.src = url; mOpen.href = url; mTitle.textContent = title;
    modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    $('#modalClose').focus();
  };
  const closeDemo = () => {
    modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    setTimeout(() => { if (!modal.classList.contains('is-open')) frame.removeAttribute('src'); }, 500);
    lastFocus?.focus();
  };
  $$('button[data-demo]').forEach((b) => b.addEventListener('click', () => openDemo(b.dataset.demo, b.dataset.title)));
  $('#modalClose')?.addEventListener('click', closeDemo);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeDemo(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('is-open')) closeDemo(); });

  /* waitlist form.
     TODO: not connected to any list yet. Wire this to the real provider before launch. */
  const form = $('#join'), msg = $('#joinMsg');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#email');
    if (!input.checkValidity()) { msg.textContent = 'Please enter a valid email address.'; input.focus(); return; }
    msg.textContent = 'Preview only: this form is not connected yet, so nothing was saved.';
  });
})();
