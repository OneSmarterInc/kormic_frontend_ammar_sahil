import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateImageAsync } from '@expo/image-utils';

const app = fileURLToPath(new URL('..', import.meta.url));
export async function syncBranding() {
  const res = resolve(app, 'android/app/src/main/res');
  for (const [density, size] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
    const directory = resolve(res, `mipmap-${density}`);
    await mkdir(directory, { recursive: true });
    const { source } = await generateImageAsync({ projectRoot: app, cacheType: 'kormic-launcher' }, {
      src: resolve(app, 'assets/kormic-logo.png'), width: size, height: size, resizeMode: 'contain', backgroundColor: '#ffffff',
    });
    for (const name of ['ic_launcher', 'ic_launcher_round']) {
      await writeFile(resolve(directory, `${name}.png`), source);
      // Remove only the old generated resource with the same Android resource name.
      await rm(resolve(directory, `${name}.webp`), { force: true });
    }
  }
  const strings = resolve(res, 'values/strings.xml');
  await writeFile(strings, (await readFile(strings, 'utf8')).replace(/(<string name="app_name">)[^<]*(<\/string>)/, '$1Kormic$2'));
}
