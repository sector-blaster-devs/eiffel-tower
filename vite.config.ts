import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const rootDir = dirname(fileURLToPath(import.meta.url));

const WRAPPER_META_FILES = new Set([
  'package.json',
  'package-lock.json',
  'bun.lock',
  'bun.lockb',
  'tsconfig.json',
  'metadata.json',
  'vite.config.ts',
  'vite.config.mjs',
]);

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  '.aistudio',
  '.build-outputs',
  'public',
]);

function hoistImportmapsFirst(html: string): string {
  const importmapRe = /<script\b[^>]*\btype\s*=\s*['"]importmap['"][^>]*>[\s\S]*?<\/script>/gi;
  const blocks: string[] = [];
  const stripped = html.replace(importmapRe, (m) => {
    blocks.push(m);
    return '';
  });
  if (blocks.length === 0) return html;
  const headMatch = /<head\b[^>]*>/i.exec(stripped);
  if (!headMatch) {
    return blocks.join('\n') + '\n' + stripped;
  }
  const insertPos = headMatch.index + headMatch[0].length;
  return (
    stripped.slice(0, insertPos) +
    '\n  ' +
    blocks.join('\n  ') +
    stripped.slice(insertPos)
  );
}

function stripRawModulePreloadsForBuild(html: string): string {
  return html.replace(
    /\s*<link\b[^>]*\brel\s*=\s*['"]modulepreload['"][^>]*\bhref\s*=\s*['"]\.\/[^'"]+\.js['"][^>]*\/?>/gi,
    ''
  );
}

function staticAssetsAndImportmapPlugin(): Plugin {
  return {
    name: 'eiffel-static-assets-and-importmap',
    transformIndexHtml: {
      order: 'pre',
      handler(html: string, ctx) {
        if (!ctx.server) {
          return stripRawModulePreloadsForBuild(html);
        }
        return hoistImportmapsFirst(html);
      },
    },
    closeBundle() {
      const outDir = resolve(rootDir, 'dist');
      const staticDirs = ['data', 'references', 'thumbnails'];
      for (const dirName of staticDirs) {
        const src = join(rootDir, dirName);
        if (existsSync(src) && statSync(src).isDirectory()) {
          const dest = join(outDir, dirName);
          mkdirSync(dirname(dest), { recursive: true });
          cpSync(src, dest, { recursive: true });
        }
      }
      for (const entry of readdirSync(rootDir)) {
        if (SKIP_DIRS.has(entry) || WRAPPER_META_FILES.has(entry) || entry.startsWith('.')) {
          continue;
        }
        const full = join(rootDir, entry);
        const st = statSync(full);
        if (st.isFile() && !entry.endsWith('.html') && !entry.endsWith('.ts') && !entry.endsWith('.js')) {
          const dest = join(outDir, relative(rootDir, full));
          if (!existsSync(dest)) {
            mkdirSync(dirname(dest), { recursive: true });
            cpSync(full, dest);
          }
        }
      }
    },
  };
}

export default defineConfig({
  appType: 'mpa',
  base: './',
  plugins: [staticAssetsAndImportmapPlugin()],
  resolve: {
    alias: [
      { find: /^three$/, replacement: resolve(rootDir, 'vendor/three/three.module.js') },
      { find: /^three\/addons\/(.*)$/, replacement: `${resolve(rootDir, 'vendor/three/addons')}/$1` },
      { find: /^museum\/(.*)$/, replacement: `${rootDir}/$1` },
    ],
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    noDiscovery: true,
    include: [],
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
      },
    },
  },
});
