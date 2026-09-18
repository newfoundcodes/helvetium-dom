/** @jsx h */
import { createServer } from 'node:http';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToString } from '../dist/server.js';
import ts from 'typescript';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(__dirname, '..');
const PORT = 3000;

const examples = readdirSync(__dirname)
  .filter((f: string) => f.endsWith('.tsx') && !f.includes('document-shell'))
  .sort((a: string, b: string) => parseInt(a) - parseInt(b));

import { IncomingMessage, ServerResponse } from 'node:http';

createServer((req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url as string, `http://localhost:${PORT}`);
  let pathname = url.pathname;

  if (pathname === '/') {
    res.setHeader('Content-Type', 'text/html');

    const page = (
      <html>
        <head>
          <title>Helvetium Examples</title>
          <style
            dangerouslySetInnerHTML={{
              __html: `
            body { display: flex; margin: 0; font-family: system-ui; height: 100vh; }
            nav { width: 350px; overflow-y: auto; border-right: 1px solid #ccc; padding: 1rem; background: #fafafa; }
            main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            #topbar { padding: 1rem; border-bottom: 1px solid #ccc; }
            #app { flex: 1; padding: 1rem; overflow-y: auto; }
            li { margin-bottom: 0.5rem; font-size: 14px; }
            a { text-decoration: none; color: #0066cc; }
            a:hover { text-decoration: underline; }
            a.active { font-weight: bold; color: #000; }
          `,
            }}
          />
          <script
            type="importmap"
            rawJson={{
              imports: {
                '@newfoundcodes/helvetium-dom': '/dist/index.js',
                '@newfoundcodes/helvetium-dom/jsx-runtime': '/dist/jsx-runtime.js',
                '@newfoundcodes/helvetium-dom/jsx-dev-runtime': '/dist/jsx-dev-runtime.js',
                '@newfoundcodes/helvetium-dom/router': '/dist/router.js',
                '@newfoundcodes/helvetium-dom/server': '/dist/server.js',
              },
            }}
          />
        </head>
        <body>
          <nav>
            <h3 style={{ marginTop: '0' }}>Examples</h3>
            <ul id="menu">
              {examples.map((e: string) => (
                <li>
                  <a href={`#${e}`}>{e}</a>
                </li>
              ))}
            </ul>
          </nav>
          <main>
            <div id="topbar">
              <h2 id="title" style={{ margin: '0' }}>
                Select an example
              </h2>
            </div>
            <div id="app"></div>
          </main>
          <script type="module" src="/examples/client.ts"></script>
        </body>
      </html>
    );

    res.end('<!DOCTYPE html>\n' + renderToString(page));
    return;
  }

  const filePath = resolve(rootDir, pathname.slice(1).split('?')[0]);
  try {
    const stat = statSync(filePath);
    if (!stat.isFile()) {
      throw new Error('Not a file');
    }

    let content = readFileSync(filePath, 'utf-8');
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      const result = ts.transpileModule(content, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          jsx: ts.JsxEmit.ReactJSX,
          jsxImportSource: '@newfoundcodes/helvetium-dom',
        },
      });
      content = result.outputText;
      res.setHeader('Content-Type', 'text/javascript');
    } else if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'text/javascript');
    } else {
      res.setHeader('Content-Type', 'text/plain');
    }

    res.end(content);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
}).listen(PORT, () => {
  console.log('Examples runner serving at http://localhost:' + PORT + '/');
});
