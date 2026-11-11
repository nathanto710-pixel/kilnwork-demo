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
    const cg = $('.cursor-glow'); let cgx = 0, cgy = 0, cgq = false;
    addEventListener('pointermove', (e) => {
      cgx = e.clientX; cgy = e.clientY;
      if (!cgq) { cgq = true; requestAnimationFrame(() => { cgq = false; cg.style.transform = `translate3d(${cgx}px,${cgy}px,0)`; }); }
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

  /* hero shader light: flowing ember fog (raw WebGL, no library). Falls back to the CSS beams. */
  const gc = $('#glow');
  if (gc && !reduce) {
    const gl = gc.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: false });
    if (gl) {
      const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
      const fs = `precision mediump float;uniform vec2 r;uniform float t;uniform vec2 m;
        float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
          return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
        float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
        void main(){
          vec2 uv=gl_FragCoord.xy/r; vec2 q=uv; q.x=(q.x-.5)*r.x/r.y;
          vec2 w=vec2(fbm(q*1.6+vec2(0.,-t*.07)),fbm(q*1.6+vec2(5.2,t*.05)));
          float f=fbm(q*2.2+w*1.6+vec2(m.x*.25,-t*.11));
          float d=length(vec2(q.x*.8,uv.y+.12));
          float rise=smoothstep(1.05,.0,d);
          float rays=pow(max(0.,sin(atan(q.x,uv.y+.25)*14.+f*5.+t*.15)),3.)*.35;
          float v=pow(f,1.6)*rise*1.9+rays*rise*f;
          vec3 c=mix(vec3(.50,.10,.01),vec3(1.,.50,.20),f)*v;
          c+=vec3(1.,.82,.62)*pow(v,3.)*.55;
          gl_FragColor=vec4(c,clamp(v*1.25,0.,1.));
        }`;
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
      const a = sh(gl.VERTEX_SHADER, vs), b = sh(gl.FRAGMENT_SHADER, fs);
      const pr = gl.createProgram();
      if (a && b) { gl.attachShader(pr, a); gl.attachShader(pr, b); gl.linkProgram(pr); }
      if (a && b && gl.getProgramParameter(pr, gl.LINK_STATUS)) {
        gl.useProgram(pr);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        const uR = gl.getUniformLocation(pr, 'r'), uT = gl.getUniformLocation(pr, 't'), uM = gl.getUniformLocation(pr, 'm');
        let seen = true, mx = 0, tx = 0;
        const fit = () => { const k = Math.min(0.4, 520 / Math.max(1, gc.clientWidth)); gc.width = Math.max(2, Math.round(gc.clientWidth * k)); gc.height = Math.max(2, Math.round(gc.clientHeight * k)); gl.viewport(0, 0, gc.width, gc.height); };
        new ResizeObserver(fit).observe(gc); fit();
        new IntersectionObserver(([e]) => { seen = e.isIntersecting; }).observe(gc);
        addEventListener('pointermove', (e) => { tx = e.clientX / innerWidth - 0.5; }, { passive: true });
        gc.closest('.hero').classList.add('has-glow');
        let lastGl = 0;
        const frame = (ms) => {
          if (seen && !document.hidden && ms - lastGl > 32) { lastGl = ms; mx += (tx - mx) * 0.08; gl.uniform2f(uR, gc.width, gc.height); gl.uniform1f(uT, ms / 1000); gl.uniform2f(uM, mx, 0); gl.drawArrays(gl.TRIANGLES, 0, 3); }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }
    }
  }

  /* hero dust: glowing motes rising from the horizon */
  const cv = $('#dust');
  if (cv && !reduce) {
    const ctx = cv.getContext('2d');
    let w, h, dpr, motes = [], visible = true;
    const size = () => {
      dpr = 1;
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(60, w / 22));
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
    /* one pre-rendered glowing dot, stamped with drawImage (canvas shadowBlur per dot is very slow) */
    const dot = document.createElement('canvas'); dot.width = dot.height = 32;
    { const dx = dot.getContext('2d'), g = dx.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(255,214,170,1)'); g.addColorStop(0.25, 'rgba(255,150,80,.55)'); g.addColorStop(1, 'rgba(255,120,50,0)');
      dx.fillStyle = g; dx.fillRect(0, 0, 32, 32); }
    let lastDust = 0;
    const tick = (t) => {
      if (visible && t - lastDust > 30) {
        lastDust = t;
        ctx.clearRect(0, 0, w, h);
        for (const m of motes) {
          m.y -= m.v * 2; m.x += (m.d + Math.sin(t / 1600 + m.p) * 0.12) * 2;
          if (m.y < -10) Object.assign(m, spawn(false));
          const life = Math.min(1, m.y / h * 1.6);
          ctx.globalAlpha = (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t / 700 + m.p))) * life * 0.8;
          const sz = m.r * 9;
          ctx.drawImage(dot, m.x - sz / 2, m.y - sz / 2, sz, sz);
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

  /* smooth scrolling with inertia on desktop (Lenis). Phones keep their native scroll. */
  if (window.Lenis && fine && !reduce) {
    const lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
    window.__lenis = lenis;
    if (window.gsap && window.ScrollTrigger) {
      lenis.on('scroll', () => ScrollTrigger.update());
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const loop = (time) => { lenis.raf(time); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
    $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id.length > 1 ? document.querySelector(id) : null;
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { duration: 1.4 });
    }));
  }

  /* scroll story: How it works plays as you scroll (GSAP ScrollTrigger). Without GSAP the plain section stays. */
  if (window.gsap && window.ScrollTrigger && !reduce && $('#story')) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    document.documentElement.classList.add('has-st');
    const plain = $('#how'); if (plain) plain.removeAttribute('id');
    $('#story').id = 'how';
    const ss = $$('.ss'), wide = () => innerWidth > 900;
    const small = () => (wide() ? 1 : Math.min(1, ($('.story__stage').clientHeight - 10) / 440));
    gsap.set(ss[0], { opacity: 1, y: 0 });
    gsap.set('#stPhone', { scale: small });
    gsap.set('#stMsg', { opacity: 1, clipPath: 'inset(0 100% 0 0 round 18px)' });
    gsap.set('#stCheck', { scale: 0 });
    gsap.set('.stt', { opacity: 0, y: 8 });
    const t = gsap.timeline({ defaults: { ease: 'power2.out' }, scrollTrigger: { trigger: '.story', start: 'top top', end: '+=240%', pin: '.story__pin', scrub: 0.6, invalidateOnRefresh: true } });
    t.fromTo('#stBar', { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: 1 }, 0);
    /* 1. the skill drops into the tray */
    t.fromTo('#stChip', { y: -230, x: 70, rotation: 24, scale: 1.5, opacity: 0 }, { y: 0, x: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.2 }, 0.03);
    t.to('#stCheck', { scale: 1, duration: 0.05, ease: 'back.out(3)' }, 0.23);
    t.to('.st-tray', { boxShadow: 'inset 0 0 0 1px rgba(255,138,76,.6), 0 0 40px -6px rgba(255,138,76,.5)', duration: 0.06 }, 0.2);
    /* 2. ask in plain words */
    t.to(ss[0], { opacity: 0, y: -30, duration: 0.05, ease: 'power2.in' }, 0.3);
    t.to(ss[1], { opacity: 1, y: 0, duration: 0.06 }, 0.34);
    t.to('#stMsg', { clipPath: 'inset(0 0% 0 0 round 18px)', duration: 0.14, ease: 'none' }, 0.38);
    t.to('.st-ticks', { opacity: 1, duration: 0.04 }, 0.52);
    t.to('.stt', { opacity: 1, y: 0, duration: 0.04, stagger: 0.035 }, 0.53);
    /* 3. results fan out */
    t.to(ss[1], { opacity: 0, y: -30, duration: 0.05, ease: 'power2.in' }, 0.64);
    t.to(ss[2], { opacity: 1, y: 0, duration: 0.06 }, 0.68);
    t.to('#stPhone', { scale: () => small() * 0.86, opacity: 0.35, duration: 0.12 }, 0.68);
    const spread = () => (wide() ? 150 : 104), k = () => (wide() ? 1 : 0.82);
    [['#stO1', -1, -9], ['#stO2', 0, 0], ['#stO3', 1, 9]].forEach(([id, dir, rot], i) => {
      t.fromTo(id, { opacity: 0, x: 0, y: 60, rotation: 0, scale: 0.5 }, { opacity: 1, x: () => dir * spread(), y: () => (dir === 0 ? -18 : 6), rotation: rot, scale: k, duration: 0.14, ease: 'back.out(1.4)' }, 0.72 + i * 0.03);
    });
    t.fromTo('#stBadge', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.07, ease: 'back.out(2)' }, 0.9);
    addEventListener('load', () => ScrollTrigger.refresh());
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
  const shell = $('.modal__shell');
  let srcEl = null;
  const canVT = !!document.startViewTransition && !reduce;
  /* the sample grows out of the card you clicked (View Transitions), with a plain fade where unsupported */
  const morph = (from, to, change) => {
    if (!canVT || !from) { change(); return; }
    from.style.viewTransitionName = 'demo';
    modal.classList.add('vt');
    const vt = document.startViewTransition(() => { from.style.viewTransitionName = ''; change(); if (to) to.style.viewTransitionName = 'demo'; });
    vt.finished.finally(() => { if (to) to.style.viewTransitionName = ''; modal.classList.remove('vt'); });
  };
  const openDemo = (key, title, from) => {
    const url = `demos/${key}.html`;
    lastFocus = document.activeElement; srcEl = from || null;
    frame.src = url; mOpen.href = url; mTitle.textContent = title;
    morph(srcEl, shell, () => {
      modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false');
      document.documentElement.style.overflow = 'hidden';
    });
    window.__lenis?.stop();
    $('#modalClose').focus();
  };
  const closeDemo = () => {
    morph(shell, srcEl, () => {
      modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true');
      document.documentElement.style.overflow = '';
    });
    window.__lenis?.start();
    setTimeout(() => { if (!modal.classList.contains('is-open')) frame.removeAttribute('src'); }, 700);
    lastFocus?.focus({ preventScroll: true });
  };
  $$('button[data-demo]').forEach((b) => b.addEventListener('click', () => openDemo(b.dataset.demo, b.dataset.title, b.classList.contains('rc') ? b : b.closest('.card')?.querySelector('.art'))));
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
