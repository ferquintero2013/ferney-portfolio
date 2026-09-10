/* ============================================================
   Ferney Quintero — Automation Studio
   Vanilla JS. No dependencies, no framework, no build step.
   ============================================================ */

(() => {
    'use strict';

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

    /* ------------------------------------------------------------------
       DATA — single source of truth for cards, modal, palette, terminal
       ------------------------------------------------------------------ */
    const PROJECTS = [
        {
            id: 'amapola-board',
            name: 'Amapola Board',
            year: '2026',
            role: 'Design + build',
            tags: ['JavaScript', 'Supabase', 'Vercel', 'Realtime'],
            short: 'A Jira-shaped ticket manager I built because every off-the-shelf board asked for a seat licence per teammate. Vanilla JS front end, Supabase realtime underneath.',
            metrics: [
                { v: '0', k: 'Dependencies' },
                { v: '<100ms', k: 'Sync latency' },
                { v: '5', k: 'Team members live' }
            ],
            problem: 'The team needed a shared board with epics, backlog and assignments, but licence costs scaled per person and none of the tools could be driven by an AI agent.',
            build: [
                'Vanilla HTML/CSS/JS front end — no framework, loads instantly',
                'Supabase Postgres with row-level security and realtime channels',
                'Drag-and-drop tickets across columns with optimistic UI',
                'Epics, backlog grooming and per-member assignment',
                'Deployed on Vercel with preview environments per branch'
            ],
            outcome: 'Replaced a paid board for the whole team, and — because the schema is mine — it became the backend that the MCP server on the next card writes into.',
            stack: ['HTML', 'CSS', 'JavaScript', 'Supabase', 'PostgreSQL', 'RLS', 'Vercel'],
            links: [{ label: 'Private demo on request', href: null }],
            schematic: 'board'
        },
        {
            id: 'amapola-mcp',
            name: 'Amapola MCP Server',
            year: '2026',
            role: 'Architecture + build',
            tags: ['Next.js', 'MCP', 'OAuth 2.1', 'AI Agent'],
            short: 'A Model Context Protocol server that lets my AI agent read and write tickets on Amapola Board directly. The agent files its own work.',
            metrics: [
                { v: '8+', k: 'Agent tools' },
                { v: 'OAuth 2.1', k: 'PKCE auth' },
                { v: 'Edge', k: 'Vercel functions' }
            ],
            problem: 'I kept copying context between my AI assistant and the board by hand. If the agent could see the tickets, it could keep them current itself.',
            build: [
                'Next.js 15 App Router exposing an MCP endpoint',
                'OAuth 2.1 with PKCE, JWT-based authorization per client',
                'Eight-plus tools: create, update, move, query, subtask handling',
                'Zod schemas validating every tool call before it touches the DB',
                'Runs on Vercel Functions, stateless and horizontally scalable'
            ],
            outcome: 'Standups write themselves. The agent reads the board, moves tickets as work lands, and I stopped being the integration layer between my tools.',
            stack: ['Next.js 15', 'TypeScript', 'MCP', 'OAuth 2.1', 'PKCE', 'JWT', 'Zod', 'Vercel'],
            links: [
                { label: 'API endpoint ↗', href: 'https://amapola-mcp.vercel.app/api/mcp' },
                { label: 'GitHub ↗', href: 'https://github.com/ferquintero2013' }
            ],
            schematic: 'mcp'
        },
        {
            id: 'lambda-bot',
            name: 'AI Lambda Instagram Bot',
            year: '2025',
            role: 'Automation engineering',
            tags: ['n8n', 'OpenAI', 'Chatbot', 'Automation'],
            short: 'An Instagram agent built in n8n that qualifies leads in DMs, answers like a person, and hands the warm ones to the CRM with context attached.',
            metrics: [
                { v: '24/7', k: 'Coverage' },
                { v: 'gpt-4.1-mini', k: 'Model' },
                { v: 'Auto', k: 'CRM handoff' }
            ],
            problem: 'Instagram DMs arrived faster than the team could answer them, and the good leads were buried under the same five repeated questions.',
            build: [
                'n8n workflow orchestrating the whole conversation lifecycle',
                'OpenAI gpt-4.1-mini with a prompt that adapts to the buying stage',
                'ManyChat bridge for native Instagram messaging',
                'Qualification scoring before anything reaches a human',
                'Structured handoff into the CRM with full transcript and intent'
            ],
            outcome: 'Every DM gets answered in seconds, and the sales team opens conversations that are already qualified instead of starting from "hi".',
            stack: ['n8n', 'OpenAI', 'ManyChat', 'Instagram API', 'Webhooks', 'CRM'],
            links: [{ label: 'Walkthrough on request', href: null }],
            schematic: 'bot'
        },
        {
            id: 'ghl-attribution',
            name: 'GHL Attribution Engine',
            year: '2025',
            role: 'Automation engineering',
            tags: ['Automation', 'GoHighLevel', 'Marketing', 'Workflows'],
            short: 'UTM tracking and AI-assisted attribution for GoHighLevel, so marketing spend can finally be traced to the deals it actually created.',
            metrics: [
                { v: 'End-to-end', k: 'UTM capture' },
                { v: 'AI', k: 'Attribution scoring' },
                { v: 'Per-campaign', k: 'ROI view' }
            ],
            problem: 'Leads landed in GHL stripped of their origin. Campaigns were judged on gut feeling because nobody could tell which ad produced which sale.',
            build: [
                'UTM capture that survives redirects and form submissions',
                'Attribution engine matching touchpoints to closed opportunities',
                'AI-assisted classification of noisy or partial referral data',
                'Lead scoring wired into the workflow triggers',
                'Campaign dashboards the marketing team reads without me'
            ],
            outcome: 'Budget decisions moved from opinion to evidence — underperforming campaigns get cut in days instead of quarters.',
            stack: ['GoHighLevel', 'n8n', 'UTM', 'Webhooks', 'REST APIs', 'Lead scoring'],
            links: [{ label: 'Case walkthrough on request', href: null }],
            schematic: 'attribution'
        }
    ];

    const SKILLS = [
        { k: 'AI & automation', v: 'n8n, Zapier, multi-agent systems, workflow orchestration', lvl: 'Core' },
        { k: 'LLM tooling', v: 'OpenAI, Anthropic Claude, MCP, prompt & context design', lvl: 'Core' },
        { k: 'Backend & APIs', v: 'Next.js, Node.js, REST, webhooks, serverless functions', lvl: 'Strong' },
        { k: 'Databases', v: 'Supabase, PostgreSQL, realtime channels, row-level security', lvl: 'Strong' },
        { k: 'Frontend', v: 'HTML, CSS, JavaScript, React, Next.js', lvl: 'Strong' },
        { k: 'Auth & security', v: 'OAuth 2.1, PKCE, JWT, RLS policies', lvl: 'Solid' },
        { k: 'Integrations', v: 'ManyChat, GoHighLevel, Shopify, Amazon, Odoo, Meta APIs', lvl: 'Core' },
        { k: 'Foundations', v: 'Java, Scala, ERP development, Scrum & project delivery', lvl: '10 yrs' },
        { k: 'DevOps', v: 'Vercel, Git, CI previews, deployment automation', lvl: 'Solid' }
    ];

    const TICKER = ['n8n', 'OpenAI', 'Claude / MCP', 'Next.js', 'Supabase', 'PostgreSQL',
        'ManyChat', 'GoHighLevel', 'Shopify', 'Amazon', 'Odoo', 'OAuth 2.1',
        'Vercel', 'Node.js', 'Multi-agent systems', 'Webhooks'];

    /* ------------------------------------------------------------------
       TOAST
       ------------------------------------------------------------------ */
    const toastEl = $('#toast');
    let toastTimer;
    function toast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
    }

    /* ------------------------------------------------------------------
       THEME
       ------------------------------------------------------------------ */
    const root = document.documentElement;
    const stored = (() => { try { return localStorage.getItem('fq-theme'); } catch { return null; } })();
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(stored || (prefersDark ? 'dark' : 'light'), false);

    function setTheme(mode, announce = true) {
        root.setAttribute('data-theme', mode);
        const meta = $('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', mode === 'dark' ? '#121211' : '#f4f0e8');
        try { localStorage.setItem('fq-theme', mode); } catch { /* private mode */ }
        if (announce) toast(mode === 'dark' ? 'Lights off' : 'Lights on');
    }
    function toggleTheme() {
        setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    }
    $('#theme-toggle').addEventListener('click', toggleTheme);

    /* ------------------------------------------------------------------
       CUSTOM CURSOR
       ------------------------------------------------------------------ */
    if (!isTouch && !reduceMotion) {
        const dot = $('.cursor'), ring = $('.cursor-ring');
        let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;

        addEventListener('mousemove', e => {
            mx = e.clientX; my = e.clientY;
            dot.style.transform = `translate(${mx}px, ${my}px)`;
        }, { passive: true });

        (function follow() {
            rx += (mx - rx) * 0.16;
            ry += (my - ry) * 0.16;
            ring.style.transform = `translate(${rx}px, ${ry}px)`;
            requestAnimationFrame(follow);
        })();

        const hoverSel = 'a, button, .project-card, [data-cursor], input, .skill-row';
        document.addEventListener('mouseover', e => {
            const t = e.target.closest(hoverSel);
            if (!t) return;
            document.body.classList.add('cursor-active');
            ring.dataset.label = t.dataset.cursor || '';
        });
        document.addEventListener('mouseout', e => {
            if (!e.target.closest(hoverSel)) return;
            document.body.classList.remove('cursor-active');
            ring.dataset.label = '';
        });
    }

    /* ------------------------------------------------------------------
       MAGNETIC BUTTONS
       ------------------------------------------------------------------ */
    if (!isTouch && !reduceMotion) {
        $$('[data-magnetic]').forEach(el => {
            el.addEventListener('mousemove', e => {
                const r = el.getBoundingClientRect();
                const x = e.clientX - r.left - r.width / 2;
                const y = e.clientY - r.top - r.height / 2;
                el.style.transform = `translate(${x * 0.22}px, ${y * 0.3}px)`;
            });
            el.addEventListener('mouseleave', () => { el.style.transform = ''; });
        });
    }

    /* ------------------------------------------------------------------
       TEXT SCRAMBLE
       ------------------------------------------------------------------ */
    const GLYPHS = '!<>-_\\/[]{}—=+*^?#________';
    function scramble(el, text, duration = 900) {
        if (reduceMotion) { el.textContent = text; return; }
        const from = el.textContent;
        const len = Math.max(from.length, text.length);
        const queue = [];
        for (let i = 0; i < len; i++) {
            const start = Math.floor(Math.random() * 40);
            const end = start + Math.floor(Math.random() * 40) + 10;
            queue.push({ from: from[i] || '', to: text[i] || '', start, end, char: '' });
        }
        let frame = 0;
        cancelAnimationFrame(el._scrambleId);
        (function tick() {
            let out = '', done = 0;
            for (const q of queue) {
                if (frame >= q.end) { done++; out += q.to; }
                else if (frame >= q.start) {
                    if (!q.char || Math.random() < 0.28) q.char = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
                    out += q.char;
                } else out += q.from;
            }
            el.textContent = out;
            if (done < queue.length) { frame++; el._scrambleId = requestAnimationFrame(tick); }
        })();
    }

    $$('[data-scramble]').forEach(el => {
        const text = el.textContent.trim();
        el.dataset.text = text;
        setTimeout(() => scramble(el, text), 220);
        el.addEventListener('mouseenter', () => scramble(el, el.dataset.text, 600));
    });

    /* ------------------------------------------------------------------
       HERO — interactive automation graph on canvas
       ------------------------------------------------------------------ */
    (function heroGraph() {
        const canvas = $('#flow-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const readout = $('#node-readout');
        let defaultReadout = readout ? readout.textContent : '';

        const LABELS = [
            ['WEBHOOK', 'DM IN', 'CRON'],
            ['ROUTER', 'VALIDATE', 'QUEUE'],
            ['GPT-4.1', 'CLAUDE', 'SCORE'],
            ['SUPABASE', 'CRM', 'SLACK']
        ];

        let W = 0, H = 0, dpr = 1;
        let nodes = [], edges = [], packets = [];
        let mouse = { x: -9999, y: -9999, down: false };
        let dragging = null, dragMoved = false, hovered = null;
        let turbo = false, running = true;

        function layout() {
            const rect = canvas.getBoundingClientRect();
            dpr = Math.min(devicePixelRatio || 1, 2);
            W = rect.width; H = rect.height;
            canvas.width = W * dpr; canvas.height = H * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            nodes = [];
            const cols = LABELS.length;
            const marginX = W < 760 ? 0.12 : 0.1;
            const usableW = W * (1 - marginX * 2);

            LABELS.forEach((col, ci) => {
                const rows = col.length;
                col.forEach((label, ri) => {
                    const x = W * marginX + (usableW / (cols - 1)) * ci;
                    const y = H * 0.2 + (H * 0.6 / (rows - 1)) * ri + (ci % 2 ? H * 0.05 : -H * 0.03);
                    nodes.push({
                        id: `${ci}-${ri}`, col: ci, label,
                        hx: x, hy: y, x, y, vx: 0, vy: 0,
                        r: 5, glow: 0, pulse: 0
                    });
                });
            });

            edges = [];
            for (let ci = 0; ci < cols - 1; ci++) {
                const a = nodes.filter(n => n.col === ci);
                const b = nodes.filter(n => n.col === ci + 1);
                a.forEach((from, i) => {
                    edges.push({ from, to: b[i % b.length] });
                    edges.push({ from, to: b[(i + 1) % b.length] });
                });
            }
        }

        function css(name) {
            return getComputedStyle(root).getPropertyValue(name).trim();
        }

        function spawnPacket(edge) {
            if (packets.length > 90) return;
            packets.push({ edge, t: 0, speed: 0.004 + Math.random() * 0.006 });
        }

        function fireFrom(node) {
            edges.filter(e => e.from === node).forEach(spawnPacket);
            node.pulse = 1;
        }

        function step() {
            const coral = css('--coral') || '#ed684a';
            const blue = css('--blue') || '#315d73';
            const inkish = css('--text') || '#171717';

            ctx.clearRect(0, 0, W, H);

            // physics
            hovered = null;
            for (const n of nodes) {
                if (dragging === n) {
                    n.x = mouse.x; n.y = mouse.y; n.vx = n.vy = 0;
                } else {
                    n.vx += (n.hx - n.x) * 0.012;
                    n.vy += (n.hy - n.y) * 0.012;
                    const dx = n.x - mouse.x, dy = n.y - mouse.y;
                    const d = Math.hypot(dx, dy);
                    if (d < 140 && d > 0.1) {
                        const f = (1 - d / 140) * 0.9;
                        n.vx += (dx / d) * f;
                        n.vy += (dy / d) * f;
                    }
                    n.vx *= 0.9; n.vy *= 0.9;
                    n.x += n.vx; n.y += n.vy;
                }
                const dist = Math.hypot(n.x - mouse.x, n.y - mouse.y);
                const target = dist < 110 ? 1 - dist / 110 : 0;
                n.glow += (target - n.glow) * 0.14;
                if (dist < 26) hovered = n;
                if (n.pulse > 0) n.pulse = Math.max(0, n.pulse - 0.02);
            }

            // edges
            ctx.lineWidth = 1;
            for (const e of edges) {
                const g = Math.max(e.from.glow, e.to.glow);
                ctx.strokeStyle = hexAlpha(g > 0.05 ? coral : inkish, 0.07 + g * 0.5);
                ctx.beginPath();
                ctx.moveTo(e.from.x, e.from.y);
                const mx = (e.from.x + e.to.x) / 2;
                ctx.bezierCurveTo(mx, e.from.y, mx, e.to.y, e.to.x, e.to.y);
                ctx.stroke();
            }

            // packets
            for (let i = packets.length - 1; i >= 0; i--) {
                const p = packets[i];
                p.t += p.speed * (turbo ? 2.6 : 1);
                if (p.t >= 1) {
                    p.edge.to.pulse = Math.min(1, p.edge.to.pulse + 0.7);
                    packets.splice(i, 1);
                    continue;
                }
                const { from, to } = p.edge;
                const mx = (from.x + to.x) / 2;
                const pt = bezier(p.t, from, { x: mx, y: from.y }, { x: mx, y: to.y }, to);
                ctx.fillStyle = coral;
                ctx.globalAlpha = Math.sin(p.t * Math.PI) * 0.9 + 0.1;
                ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
                ctx.globalAlpha = 1;
            }

            // nodes
            for (const n of nodes) {
                const active = n.glow > 0.04 || n.pulse > 0;
                const size = n.r + n.pulse * 5;

                if (n.pulse > 0) {
                    ctx.strokeStyle = hexAlpha(coral, n.pulse * 0.55);
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, 10 + (1 - n.pulse) * 26, 0, Math.PI * 2);
                    ctx.stroke();
                }

                ctx.fillStyle = hexAlpha(active ? coral : inkish, 0.18 + n.glow * 0.8 + n.pulse * 0.5);
                ctx.fillRect(n.x - size / 2, n.y - size / 2, size, size);

                ctx.strokeStyle = hexAlpha(n.glow > 0.3 ? coral : blue, 0.12 + n.glow * 0.7);
                ctx.strokeRect(n.x - 9, n.y - 9, 18, 18);

                if (n.glow > 0.12) {
                    ctx.fillStyle = hexAlpha(inkish, n.glow * 0.85);
                    ctx.font = '10px "DM Mono", monospace';
                    ctx.fillText(n.label, n.x + 15, n.y + 3.5);
                }
            }

            if (readout) {
                const txt = hovered ? `NODE :: ${hovered.label} — drag me / click to fire`
                    : (dragging ? 'MOVING NODE…' : defaultReadout);
                if (readout.textContent !== txt) readout.textContent = txt;
            }

            canvas.style.cursor = hovered ? 'grab' : 'default';
            if (running) requestAnimationFrame(step);
        }

        function bezier(t, p0, p1, p2, p3) {
            const u = 1 - t;
            return {
                x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
                y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
            };
        }

        function hexAlpha(color, a) {
            a = Math.max(0, Math.min(1, a));
            if (color.startsWith('#')) {
                let h = color.slice(1);
                if (h.length === 3) h = h.split('').map(c => c + c).join('');
                const n = parseInt(h, 16);
                return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
            }
            return color;
        }

        function pointFromEvent(e) {
            const r = canvas.getBoundingClientRect();
            return { x: e.clientX - r.left, y: e.clientY - r.top };
        }

        // Pointer interaction is desktop-only: on touch the canvas covers the hero,
        // and capturing drags there would fight with page scrolling.
        if (!isTouch) {
            canvas.addEventListener('pointermove', e => {
                const p = pointFromEvent(e);
                mouse.x = p.x; mouse.y = p.y;
                if (dragging) dragMoved = true;
            });
            canvas.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
            canvas.addEventListener('pointerdown', e => {
                const p = pointFromEvent(e);
                mouse.x = p.x; mouse.y = p.y;
                const hit = nodes.find(n => Math.hypot(n.x - p.x, n.y - p.y) < 22);
                if (hit) {
                    dragging = hit; dragMoved = false;
                    canvas.setPointerCapture(e.pointerId);
                    canvas.style.cursor = 'grabbing';
                }
            });
            canvas.addEventListener('pointerup', e => {
                const p = pointFromEvent(e);
                if (dragging && !dragMoved) fireFrom(dragging);
                else if (!dragging) {
                    const hit = nodes.find(n => Math.hypot(n.x - p.x, n.y - p.y) < 26);
                    if (hit) fireFrom(hit);
                }
                dragging = null;
            });
        } else if (readout) {
            defaultReadout = 'Live pipeline · always running';
            readout.textContent = defaultReadout;
        }

        // ambient traffic
        setInterval(() => {
            if (document.hidden || !edges.length) return;
            const sources = nodes.filter(n => n.col === 0);
            const n = sources[Math.floor(Math.random() * sources.length)];
            edges.filter(e => e.from === n).slice(0, 1).forEach(spawnPacket);
        }, reduceMotion ? 4000 : 1100);

        addEventListener('resize', () => { layout(); });
        layout();
        if (reduceMotion) {
            // draw one static frame
            running = false;
            step();
        } else {
            step();
        }

        window.__flow = {
            burst() {
                nodes.filter(n => n.col === 0).forEach(fireFrom);
            },
            turbo(on) { turbo = on; }
        };
    })();

    /* ------------------------------------------------------------------
       TICKER
       ------------------------------------------------------------------ */
    (function ticker() {
        const track = $('#ticker-track');
        if (!track) return;
        const items = [...TICKER, ...TICKER].map(t => `<span>${t}</span>`).join('');
        track.innerHTML = items;
    })();

    /* ------------------------------------------------------------------
       PROJECTS — cards, filters, case-study drawer
       ------------------------------------------------------------------ */
    const grid = $('#projects-grid');
    const filtersEl = $('#filters');

    function renderProjects() {
        grid.innerHTML = PROJECTS.map((p, i) => `
            <article class="project-card" role="button" tabindex="0" data-id="${p.id}"
                     data-tags="${p.tags.join('|')}" data-cursor="Open case study"
                     aria-label="Open case study: ${p.name}">
                <span class="project-num">0${i + 1} / ${p.year}</span>
                <h3>${p.name}</h3>
                <div class="project-tags">${p.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
                <p class="project-desc">${p.short}</p>
                <div class="project-metrics">
                    ${p.metrics.map(m => `<div class="metric"><b>${m.v}</b><span>${m.k}</span></div>`).join('')}
                </div>
                <div class="project-foot"><span>Read the case study</span><span class="arrow">↗</span></div>
            </article>
        `).join('');
        $('#work-count').textContent = String(PROJECTS.length).padStart(2, '0');
    }

    function renderFilters() {
        const tags = ['All', ...new Set(PROJECTS.flatMap(p => p.tags))];
        filtersEl.innerHTML = tags.map((t, i) =>
            `<button class="filter${i === 0 ? ' active' : ''}" data-filter="${t}">${t}</button>`
        ).join('');
    }

    function applyFilter(tag) {
        $$('.filter').forEach(f => f.classList.toggle('active', f.dataset.filter === tag));
        let shown = 0;
        $$('.project-card').forEach(card => {
            const match = tag === 'All' || card.dataset.tags.split('|').includes(tag);
            card.classList.toggle('is-hidden', !match);
            if (match) shown++;
        });
        $('#work-count').textContent = String(shown).padStart(2, '0');
    }

    filtersEl.addEventListener('click', e => {
        const btn = e.target.closest('.filter');
        if (btn) applyFilter(btn.dataset.filter);
    });

    grid.addEventListener('click', e => {
        const card = e.target.closest('.project-card');
        if (card) openCase(card.dataset.id);
    });

    grid.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const card = e.target.closest('.project-card');
        if (card) { e.preventDefault(); openCase(card.dataset.id); }
    });

    /* ---- schematics: bespoke diagrams, drawn in the site palette ---- */
    function schematic(kind) {
        const box = (x, y, w, h, label, accent) => `
            <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none"
                  stroke="${accent ? 'var(--coral)' : 'currentColor'}" stroke-width="1"/>
            <text x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle"
                  font-family="DM Mono, monospace" font-size="10"
                  fill="${accent ? 'var(--coral)' : 'currentColor'}">${label}</text>`;
        const arrow = (x1, y1, x2, y2) => `
            <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor"
                  stroke-width="1" stroke-dasharray="3 3" marker-end="url(#ar)"/>`;

        const maps = {
            board: `
                ${box(30, 40, 120, 46, 'BROWSER')}
                ${box(210, 40, 130, 46, 'SUPABASE', true)}
                ${box(400, 40, 120, 46, 'REALTIME')}
                ${box(30, 130, 120, 46, 'TICKETS')}
                ${box(210, 130, 130, 46, 'EPICS')}
                ${box(400, 130, 120, 46, 'BACKLOG')}
                ${arrow(150, 63, 205, 63)}${arrow(340, 63, 395, 63)}
                ${arrow(90, 86, 90, 126)}${arrow(275, 86, 275, 126)}${arrow(460, 86, 460, 126)}
                ${arrow(150, 153, 205, 153)}${arrow(340, 153, 395, 153)}`,
            mcp: `
                ${box(30, 90, 110, 46, 'AI AGENT', true)}
                ${box(190, 40, 130, 46, 'OAUTH 2.1')}
                ${box(190, 140, 130, 46, 'MCP TOOLS')}
                ${box(370, 90, 150, 46, 'AMAPOLA DB')}
                ${arrow(140, 105, 185, 68)}${arrow(140, 120, 185, 158)}
                ${arrow(320, 68, 370, 105)}${arrow(320, 158, 370, 120)}
                <text x="255" y="118" text-anchor="middle" font-family="DM Mono, monospace"
                      font-size="9" fill="currentColor" opacity=".6">JWT / PKCE</text>`,
            bot: `
                ${box(30, 90, 110, 46, 'IG DM')}
                ${box(180, 90, 120, 46, 'MANYCHAT')}
                ${box(340, 40, 120, 46, 'GPT-4.1', true)}
                ${box(340, 140, 120, 46, 'SCORING')}
                ${box(500, 90, 90, 46, 'CRM')}
                ${arrow(140, 113, 175, 113)}${arrow(300, 105, 337, 68)}${arrow(300, 120, 337, 162)}
                ${arrow(460, 68, 498, 105)}${arrow(460, 162, 498, 120)}`,
            attribution: `
                ${box(30, 40, 120, 42, 'AD CLICK')}
                ${box(30, 120, 120, 42, 'UTM CAPTURE', true)}
                ${box(210, 80, 130, 42, 'GHL LEAD')}
                ${box(390, 40, 130, 42, 'MATCH ENGINE')}
                ${box(390, 120, 130, 42, 'ROI VIEW', true)}
                ${arrow(90, 82, 90, 116)}${arrow(150, 141, 205, 110)}
                ${arrow(340, 95, 386, 66)}${arrow(455, 82, 455, 116)}`
        };

        return `<svg viewBox="0 0 620 220" role="img" aria-label="Architecture diagram" style="color:var(--text-dim)">
            <defs><marker id="ar" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <polygon points="0 0, 7 3.5, 0 7" fill="var(--coral)"/></marker></defs>
            ${maps[kind] || ''}
        </svg>`;
    }

    /* ---- drawer ---- */
    const modal = $('#modal');
    const modalBody = $('#modal-body');
    let lastFocus = null;

    function openCase(id) {
        const p = PROJECTS.find(x => x.id === id);
        if (!p) return;
        lastFocus = document.activeElement;
        $('#modal-eyebrow').textContent = `Case study · ${p.year} · ${p.role}`;
        modalBody.innerHTML = `
            <h2 id="modal-title">${p.name}</h2>
            <p class="lede">${p.short}</p>
            <div class="modal-figure">${schematic(p.schematic)}</div>
            <p class="modal-caption">Fig. 01 — how it fits together</p>

            <div class="modal-section"><h4>The problem</h4><p>${p.problem}</p></div>
            <div class="modal-section"><h4>What I built</h4>
                <ul>${p.build.map(b => `<li>${b}</li>`).join('')}</ul>
            </div>
            <div class="modal-section"><h4>Outcome</h4><p>${p.outcome}</p></div>
            <div class="modal-section"><h4>Stack</h4>
                <div class="stack-chips">${p.stack.map(s => `<i>${s}</i>`).join('')}</div>
            </div>
            <div class="modal-links">
                ${p.links.map(l => l.href
                    ? `<a class="btn" href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`
                    : `<a class="btn" href="https://wa.me/573213986410" target="_blank" rel="noopener">${l.label} <span>↗</span></a>`
                ).join('')}
            </div>`;
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        $('.modal-close').focus();
        history.replaceState(null, '', `#${p.id}`);
    }

    function closeCase() {
        if (!modal.classList.contains('open')) return;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (lastFocus) lastFocus.focus();
        history.replaceState(null, '', '#work');
    }

    $$('[data-close]').forEach(el => el.addEventListener('click', closeCase));

    /* ------------------------------------------------------------------
       SKILLS
       ------------------------------------------------------------------ */
    $('#skills-list').innerHTML = SKILLS.map(s => `
        <div class="skill-row" data-cursor="${s.lvl}">
            <h4>${s.k}</h4><p>${s.v}</p><i>${s.lvl}</i>
        </div>`).join('');

    /* ------------------------------------------------------------------
       TERMINAL
       ------------------------------------------------------------------ */
    (function terminal() {
        const body = $('#term-body');
        const input = $('#term-input');
        const hints = $('#lab-hints');
        const history = [];
        let hIndex = -1;

        const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

        const print = (text, cls = '') => {
            const line = document.createElement('div');
            line.className = `term-line ${cls}`.trim();
            line.innerHTML = text === '' ? '&nbsp;' : text;
            body.appendChild(line);
            body.scrollTop = body.scrollHeight;
            return line;
        };

        const COMMANDS = {
            help: () => {
                print('Available commands:', 'accent');
                Object.entries(HELP).forEach(([k, v]) => print(`  ${k.padEnd(14)}${v}`, 'dim'));
            },
            whoami: () => {
                print('Ferney Quintero — AI automation engineer, Bogotá CO', 'accent');
                print('10+ years shipping software. Now building automations and multi-agent');
                print('systems that survive contact with real users.');
                print('Winner — EmprendIA LATAM Hackathon, Best AI Automation (n8n).', 'dim');
            },
            stack: () => {
                SKILLS.forEach(s => print(`  ${s.k.padEnd(20)}<span style="opacity:.65">${s.v}</span>`));
            },
            projects: () => {
                PROJECTS.forEach((p, i) => print(`  0${i + 1}  ${p.id.padEnd(18)}<span style="opacity:.65">${p.name} · ${p.year}</span>`));
                print("Run 'open <id>' to read the case study.", 'dim');
            },
            open: arg => {
                if (!arg) return print("usage: open <project-id> — run 'projects' for the list", 'err');
                const p = PROJECTS.find(x => x.id === arg || x.id.startsWith(arg));
                if (!p) return print(`no project matching "${esc(arg)}"`, 'err');
                print(`opening ${p.name}…`, 'accent');
                setTimeout(() => openCase(p.id), 260);
            },
            contact: () => {
                print('WhatsApp  <a href="https://wa.me/573213986410" target="_blank" rel="noopener">+57 321 398 6410</a>');
                print('Email     <a href="mailto:ferquintero2013@gmail.com">ferquintero2013@gmail.com</a>');
                print('GitHub    <a href="https://github.com/ferquintero2013" target="_blank" rel="noopener">github.com/ferquintero2013</a>');
                print('LinkedIn  <a href="https://www.linkedin.com/in/ferney-quintero-7301b547/" target="_blank" rel="noopener">in/ferney-quintero</a>');
            },
            hire: () => {
                print('Currently taking a small number of projects.', 'accent');
                print('Best fit: workflow automation, AI agents, CRM/e-commerce integrations.');
                print('Opening WhatsApp…', 'dim');
                setTimeout(() => window.open('https://wa.me/573213986410', '_blank', 'noopener'), 700);
            },
            theme: () => { toggleTheme(); print(`theme → ${root.getAttribute('data-theme')}`, 'dim'); },
            date: () => print(new Date().toString()),
            clear: () => { body.innerHTML = ''; },
            sudo: () => print("nice try. you already have root here — it's a static site.", 'err'),
            coffee: () => print('☕ brewing… this is the actual bottleneck in every pipeline.', 'accent'),
            n8n: () => {
                print('n8n status: <span style="color:#7fdc7f">● running</span>');
                print('  workflows active   40+');
                print('  favourite node     Code (sorry)', 'dim');
            },
            burst: () => {
                window.__flow && window.__flow.burst();
                print('fired a packet down every entry node ↑', 'accent');
            },
            ls: () => COMMANDS.projects()
        };

        const HELP = {
            help: 'this list',
            whoami: 'who is behind this site',
            stack: 'tools I work with daily',
            projects: 'list case studies',
            'open <id>': 'open a case study',
            contact: 'every way to reach me',
            hire: 'start a project',
            burst: 'fire packets through the hero graph',
            theme: 'toggle light / dark',
            clear: 'wipe the screen'
        };

        const HINTS = ['whoami', 'projects', 'stack', 'burst', 'hire'];
        hints.innerHTML = HINTS.map(h => `<button class="hint" data-cmd="${h}">${h}</button>`).join('');
        hints.addEventListener('click', e => {
            const b = e.target.closest('.hint');
            if (b) { run(b.dataset.cmd); input.focus(); }
        });

        function run(raw) {
            const line = raw.trim();
            if (!line) return;
            print(esc(line), 'cmd');
            history.unshift(line); hIndex = -1;
            const [cmd, ...rest] = line.split(/\s+/);
            const fn = COMMANDS[Object.prototype.hasOwnProperty.call(COMMANDS, cmd.toLowerCase()) ? cmd.toLowerCase() : ''];
            if (fn) fn(rest.join(' '));
            else {
                const near = Object.keys(COMMANDS).find(k => k.startsWith(cmd.toLowerCase()[0]));
                print(`command not found: ${esc(cmd)}${near ? ` — did you mean '${near}'?` : ''}`, 'err');
            }
            print('');
        }

        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') { run(input.value); input.value = ''; }
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (hIndex < history.length - 1) input.value = history[++hIndex];
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                input.value = hIndex > 0 ? history[--hIndex] : (hIndex = -1, '');
            } else if (e.key === 'Tab') {
                e.preventDefault();
                const match = Object.keys(COMMANDS).find(k => k.startsWith(input.value.toLowerCase()));
                if (match) input.value = match + ' ';
            }
        });

        $('.terminal').addEventListener('click', e => {
            if (!e.target.closest('a')) input.focus();
        });

        // boot sequence
        const boot = [
            ['ferney@automation-studio · portfolio shell v2.0', 'dim'],
            ['connected — 4 case studies loaded, 40+ workflows indexed', 'dim'],
            ['', ''],
            ["type <b>help</b> to see what this thing does.", 'accent'],
            ['', '']
        ];
        boot.forEach(([t, c], i) => setTimeout(() => print(t, c), reduceMotion ? 0 : 260 * i));
    })();

    /* ------------------------------------------------------------------
       COMMAND PALETTE
       ------------------------------------------------------------------ */
    (function palette() {
        const box = $('#palette');
        const input = $('#palette-input');
        const list = $('#palette-list');
        let items = [], cursor = 0;

        const ACTIONS = [
            { icon: '§', label: 'Go to Index', hint: 'section', run: () => go('#home') },
            { icon: '§', label: 'Go to Work', hint: 'section', run: () => go('#work') },
            { icon: '§', label: 'Go to Terminal', hint: 'section', run: () => go('#lab') },
            { icon: '§', label: 'Go to About', hint: 'section', run: () => go('#about') },
            { icon: '§', label: 'Go to Contact', hint: 'section', run: () => go('#contact') },
            ...PROJECTS.map(p => ({ icon: '◆', label: `Case study — ${p.name}`, hint: p.year, run: () => openCase(p.id) })),
            { icon: '◐', label: 'Toggle light / dark theme', hint: 'action', run: toggleTheme },
            { icon: '↗', label: 'Message me on WhatsApp', hint: 'link', run: () => window.open('https://wa.me/573213986410', '_blank', 'noopener') },
            { icon: '↗', label: 'Copy email address', hint: 'action', run: copyEmail },
            { icon: '↗', label: 'Open GitHub', hint: 'link', run: () => window.open('https://github.com/ferquintero2013', '_blank', 'noopener') },
            { icon: '↗', label: 'Open LinkedIn', hint: 'link', run: () => window.open('https://www.linkedin.com/in/ferney-quintero-7301b547/', '_blank', 'noopener') },
            { icon: '⚡', label: 'Fire the hero graph', hint: 'easter egg', run: () => { go('#home'); setTimeout(() => window.__flow && window.__flow.burst(), 600); } }
        ];

        function go(hash) {
            const el = $(hash);
            if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        }

        function copyEmail() {
            const mail = 'ferquintero2013@gmail.com';
            navigator.clipboard?.writeText(mail)
                .then(() => toast('Email copied — ' + mail))
                .catch(() => toast(mail));
        }

        function render(query = '') {
            const q = query.toLowerCase().trim();
            items = ACTIONS.filter(a => a.label.toLowerCase().includes(q) || a.hint.includes(q));
            cursor = 0;
            list.innerHTML = items.length
                ? items.map((a, i) => `<li role="option" data-i="${i}" aria-selected="${i === 0}">
                      <em>${a.icon}</em>${a.label}<b>${a.hint}</b></li>`).join('')
                : '<li class="palette-empty">Nothing matches that.</li>';
        }

        function move(delta) {
            if (!items.length) return;
            cursor = (cursor + delta + items.length) % items.length;
            $$('#palette-list li').forEach((li, i) => li.setAttribute('aria-selected', i === cursor));
            const active = list.children[cursor];
            if (active) active.scrollIntoView({ block: 'nearest' });
        }

        function open() {
            box.classList.add('open');
            input.value = '';
            render();
            setTimeout(() => input.focus(), 20);
        }
        function close() { box.classList.remove('open'); }

        input.addEventListener('input', () => render(input.value));
        input.addEventListener('keydown', e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
            else if (e.key === 'Enter') { e.preventDefault(); if (items[cursor]) { close(); items[cursor].run(); } }
            else if (e.key === 'Escape') close();
        });
        list.addEventListener('click', e => {
            const li = e.target.closest('li[data-i]');
            if (li) { close(); items[+li.dataset.i].run(); }
        });
        $('[data-close-palette]').addEventListener('click', close);
        $('#palette-open').addEventListener('click', open);

        addEventListener('keydown', e => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open(); }
            else if (e.key === 'Escape') { close(); closeCase(); }
            else if (e.key === '/' && document.activeElement === document.body) { e.preventDefault(); open(); }
        });

        // label the shortcut for the actual platform
        $$('[data-kbd]').forEach(el => { el.textContent = isMac ? '⌘K' : 'Ctrl K'; });
    })();

    /* ------------------------------------------------------------------
       REVEALS, COUNTERS, PROGRESS, ACTIVE NAV
       ------------------------------------------------------------------ */
    renderProjects();
    renderFilters();

    const revealTargets = [...$$('[data-reveal]'), ...$$('.project-card'), ...$$('.skill-row')];
    revealTargets.forEach((el, i) => {
        if (!el.hasAttribute('data-reveal')) {
            el.setAttribute('data-reveal', '');
            el.style.transitionDelay = `${(i % 6) * 60}ms`;
        }
    });

    const io = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('in');
            obs.unobserve(entry.target);
            $$('[data-count]', entry.target).forEach(countUp);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    $$('[data-reveal]').forEach(el => io.observe(el));

    function countUp(el) {
        const target = +el.dataset.count;
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        if (reduceMotion) { el.textContent = prefix + target + suffix; return; }
        const dur = 1100, t0 = performance.now();
        (function frame(now) {
            const p = Math.min(1, (now - t0) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = prefix + Math.round(target * eased) + suffix;
            if (p < 1) requestAnimationFrame(frame);
        })(t0);
    }

    const progress = $('.progress');
    const navLinks = $$('.nav-link');
    const sections = ['home', 'work', 'lab', 'about', 'contact'].map(id => $('#' + id)).filter(Boolean);

    let ticking = false;
    addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const max = document.body.scrollHeight - innerHeight;
            progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;

            let current = sections[0]?.id;
            for (const s of sections) {
                if (scrollY >= s.offsetTop - innerHeight * 0.35) current = s.id;
            }
            navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + current));
            ticking = false;
        });
    }, { passive: true });

    /* ------------------------------------------------------------------
       CLOCK — Bogotá time
       ------------------------------------------------------------------ */
    (function clock() {
        const el = $('#clock'), el2 = $('#contact-clock'), avail = $('#availability');
        const tick = () => {
            const now = new Date();
            const fmt = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            }).format(now);
            if (el) el.textContent = fmt;
            if (el2) el2.textContent = 'Local time ' + fmt.slice(0, 5);

            const hour = +new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Bogota', hour: '2-digit', hour12: false }).format(now);
            if (avail) avail.textContent = hour >= 8 && hour < 20 ? 'Online right now' : 'Available for select projects';
        };
        tick();
        setInterval(tick, 1000);
        const y = $('#year');
        if (y) y.textContent = new Date().getFullYear();
    })();

    /* ------------------------------------------------------------------
       DEEP LINKS + EASTER EGG
       ------------------------------------------------------------------ */
    const initial = location.hash.slice(1);
    if (initial && PROJECTS.some(p => p.id === initial)) setTimeout(() => openCase(initial), 500);

    const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let kIndex = 0;
    addEventListener('keydown', e => {
        if (e.key.toLowerCase() === KONAMI[kIndex].toLowerCase()) {
            if (++kIndex === KONAMI.length) {
                kIndex = 0;
                window.__flow && (window.__flow.turbo(true), window.__flow.burst());
                toast('Turbo mode — the pipeline is flooded');
                setTimeout(() => window.__flow && window.__flow.turbo(false), 9000);
            }
        } else kIndex = 0;
    });

    console.log('%cFerney Quintero — Automation Studio', 'font: 600 15px sans-serif; color:#ed684a');
    console.log('%cHand-built, no framework. Try the terminal on the page, or press ' + (isMac ? '⌘K' : 'Ctrl+K') + '.', 'color:#6f706a');
})();
