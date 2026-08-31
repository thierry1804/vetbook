// Build de prod : minifie app.js/styles.css, les nomme avec un hash de contenu
// (cache-busting), et génère dist/index.html + dist/sw.js à jour en conséquence.
import { transform } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, rm, readFile, writeFile, cp, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, 'dist');

function shortHash(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 8);
}

async function main() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  const jsSrc = await readFile(path.join(root, 'app.js'), 'utf8');
  const cssSrc = await readFile(path.join(root, 'styles.css'), 'utf8');
  const dataLayerSrc = await readFile(path.join(root, 'data-layer.js'), 'utf8');

  const jsOut = await transform(jsSrc, { loader: 'js', minify: true, target: 'es2019' });
  const cssOut = await transform(cssSrc, { loader: 'css', minify: true });
  const dataLayerOut = await transform(dataLayerSrc, { loader: 'js', minify: true, target: 'es2019' });

  const jsHash = shortHash(jsOut.code);
  const cssHash = shortHash(cssOut.code);
  const dataLayerHash = shortHash(dataLayerOut.code);
  const jsName = `app.${jsHash}.js`;
  const cssName = `styles.${cssHash}.css`;
  const dataLayerName = `data-layer.${dataLayerHash}.js`;

  await writeFile(path.join(dist, jsName), jsOut.code);
  await writeFile(path.join(dist, cssName), cssOut.code);
  await writeFile(path.join(dist, dataLayerName), dataLayerOut.code);

  await cp(path.join(root, 'manifest.json'), path.join(dist, 'manifest.json'));
  await cp(path.join(root, 'icons'), path.join(dist, 'icons'), {
    recursive: true,
    filter: (src) => !src.includes(`${path.sep}source`),
  });
  await cp(path.join(root, 'vendor'), path.join(dist, 'vendor'), { recursive: true });

  const configPath = path.join(root, 'config.js');
  const hasConfig = await access(configPath).then(() => true).catch(() => false);
  if (hasConfig) await cp(configPath, path.join(dist, 'config.js'));

  let html = await readFile(path.join(root, 'index.html'), 'utf8');
  html = html.replace('href="styles.css"', `href="${cssName}"`);
  html = html.replace('src="app.js"', `src="${jsName}"`);
  html = html.replace('src="data-layer.js"', `src="${dataLayerName}"`);
  await writeFile(path.join(dist, 'index.html'), html);

  const buildVersion = shortHash(jsHash + cssHash + dataLayerHash);
  let sw = await readFile(path.join(root, 'sw.js'), 'utf8');
  sw = sw.replace(/const CACHE_NAME = '[^']*';/, `const CACHE_NAME = 'vetbook-${buildVersion}';`);
  sw = sw.replace("'./styles.css',", `'./${cssName}',`);
  sw = sw.replace("'./app.js',", `'./${jsName}',`);
  sw = sw.replace("'./data-layer.js'", `'./${dataLayerName}'`);
  await writeFile(path.join(dist, 'sw.js'), sw);

  console.log(`dist/ prêt (build ${buildVersion})${hasConfig ? '' : ' — config.js absent, non copié'}`);
  console.log(`  ${jsName}  (${(jsOut.code.length / 1024).toFixed(1)} Ko, source ${(jsSrc.length / 1024).toFixed(1)} Ko)`);
  console.log(`  ${cssName}  (${(cssOut.code.length / 1024).toFixed(1)} Ko, source ${(cssSrc.length / 1024).toFixed(1)} Ko)`);
  console.log(`  ${dataLayerName}  (${(dataLayerOut.code.length / 1024).toFixed(1)} Ko)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
