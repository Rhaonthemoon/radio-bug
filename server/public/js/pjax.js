/**
 * BUG Radio — Lightweight PJAX
 * Intercepts internal navigation, swaps only <main>, keeps the player alive.
 */

(function () {
    'use strict';

    // ── helpers ────────────────────────────────────────────────────

    function isInternal(url) {
        try {
            const u = new URL(url, location.href);
            return u.origin === location.origin;
        } catch { return false; }
    }

    function extractMain(html) {
        const parser = new DOMParser();
        const doc    = parser.parseFromString(html, 'text/html');
        return {
            main:  doc.querySelector('main'),
            title: doc.title,
            path:  null   // filled by caller
        };
    }

    // Update active class on both desktop and mobile nav
    function updateNav(path) {
        document.querySelectorAll('.main-nav a, .mobile-nav a').forEach(a => {
            const href = new URL(a.href, location.href).pathname;
            a.classList.toggle('active', href === path);
        });
    }

    // Re-run Alpine on the new content (Alpine keeps existing components alive)
    function reinitAlpine(el) {
        if (window.Alpine) {
            // Alpine 3: walk new nodes and initialise
            el.querySelectorAll('[x-data]').forEach(node => {
                if (!node._x_dataStack) {
                    window.Alpine.initTree(node);
                }
            });
        }
    }


    // ── core navigate ──────────────────────────────────────────────

    async function navigate(url, pushState = true) {
        const path = new URL(url, location.href).pathname;

        // Show a subtle loading indicator
        document.documentElement.classList.add('pjax-loading');

        try {
            const res = await fetch(url, {
                headers: { 'X-PJAX': '1' },
                cache: 'no-store'
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const html   = await res.text();
            const parsed = extractMain(html);

            if (!parsed.main) throw new Error('No <main> found');

            // Swap content
            const currentMain = document.querySelector('main');
            currentMain.innerHTML = parsed.main.innerHTML;

            // Re-esegui gli script inline/src nel nuovo contenuto
            currentMain.querySelectorAll('script').forEach(oldScript => {
                const newScript = document.createElement('script');
                [...oldScript.attributes].forEach(attr => newScript.setAttribute(attr.name, attr.value));
                newScript.textContent = oldScript.textContent;
                oldScript.replaceWith(newScript);
            });

            // Update page title and URL
            document.title = parsed.title;
            if (pushState) history.pushState({ url }, parsed.title, url);

            // Update nav, scroll to top
            updateNav(path);
            window.scrollTo({ top: 0, behavior: 'instant' });

            // Re-init Alpine components inside new main
            reinitAlpine(currentMain);

            // Cambia le immagini di sfondo ad ogni navigazione
            const n  = Math.floor(Math.random() * 12) + 1;
            const sx = Math.floor(Math.random() * 12) + 1;
            document.documentElement.style.setProperty('--bg-sfondo',    `url("/public/assets/sfondi/${n}.png")`);
            document.documentElement.style.setProperty('--bg-sfondo-sx', `url("/public/assets/sfondi-sx/${sx}.png")`);


        } catch (err) {
            // Fallback: full page load
            console.warn('[PJAX] Falling back to full navigation:', err);
            location.href = url;
        } finally {
            document.documentElement.classList.remove('pjax-loading');
        }
    }

    // ── event listeners ────────────────────────────────────────────

    // Intercept clicks
    document.addEventListener('click', e => {
        const a = e.target.closest('a');
        if (!a) return;

        // Skip: external, new tab, download, hash-only, mailto/tel
        if (
            !isInternal(a.href)        ||
            a.target === '_blank'      ||
            a.hasAttribute('download') ||
            a.getAttribute('href')?.startsWith('#') ||
            a.getAttribute('href')?.startsWith('mailto:') ||
            a.getAttribute('href')?.startsWith('tel:')
        ) return;

        e.preventDefault();

        // Don't re-navigate to the exact same URL (pathname + search)
        const dest = new URL(a.href, location.href);
        if (dest.pathname === location.pathname && dest.search === location.search) return;

        navigate(a.href);
    });

    // Browser back / forward
    window.addEventListener('popstate', e => {
        navigate(location.href, false);
    });

    // ── loading bar style ──────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
        html.pjax-loading::after {
            content: '';
            position: fixed;
            top: 0; left: 0;
            height: 2px;
            width: 100%;
            background: linear-gradient(90deg, transparent, currentColor, transparent);
            animation: pjax-bar 0.6s ease infinite;
            z-index: 9999;
            opacity: 0.4;
        }
        @keyframes pjax-bar {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
    `;
    document.head.appendChild(style);

})();