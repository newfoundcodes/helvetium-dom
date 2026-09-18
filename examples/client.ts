let currentUnmount: (() => void) | null = null;

async function load() {
  const hash = location.hash.slice(1);
  if (!hash) {
    return;
  }

  const title = document.getElementById('title');
  if (title) {
    title.textContent = hash;
  }

  document.querySelectorAll('#menu a').forEach((a) => {
    a.className = a.getAttribute('href') === '#' + hash ? 'active' : '';
  });

  const app = document.getElementById('app');
  if (!app) {
    return;
  }

  if (currentUnmount) {
    currentUnmount();
  }

  app.innerHTML = '';
  try {
    const mod = await import('/examples/' + hash + '?t=' + Date.now());
    const mountFn = mod.mount || mod.demo || mod.hydrate || mod.default;

    if (mountFn) {
      const res = mountFn(app);
      if (res && res.unmount) {
        currentUnmount = () => res.unmount();
      } else if (typeof res === 'function') {
        currentUnmount = res;
      }
    } else if (mod.buildFragment) {
      const res = mod.buildFragment(document);

      app.appendChild(res.fragment);
      currentUnmount = () => res.root.unmount();
    } else if (mod.renderReceipt) {
      const html = mod.renderReceipt(42.5);
      app.innerHTML = `<div style="padding:10px; border:1px solid #ccc; margin-bottom:10px;"><strong>Server-rendered Receipt:</strong><br/><code style="white-space: pre-wrap;">${html.replace(/</g, '&lt;')}</code></div><div><strong>Rendered:</strong><br/>${html}</div>`;
    } else if (mod.html !== undefined) {
      app.innerHTML = `<div style="padding:10px; border:1px solid #ccc; margin-bottom:10px;"><strong>Server-rendered HTML output:</strong><br/><code style="white-space: pre-wrap;">${mod.html.replace(/</g, '&lt;')}</code></div><div><strong>Rendered:</strong><br/>${mod.html}</div>`;
    } else if (app.childNodes.length === 0) {
      app.textContent = 'No mount function exported.';
    }
  } catch (err) {
    app.textContent = String(err);
  }
}

window.addEventListener('popstate', load);

const firstLink = document.querySelector('#menu a');
if (!location.hash && firstLink) {
  history.replaceState(null, '', firstLink.getAttribute('href') ?? '');
}

load();
