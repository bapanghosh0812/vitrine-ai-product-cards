#!/usr/bin/env node
/**
 * Downloads the Fluent Emoji 3D assets used by Vitrine from the official
 * microsoft/fluentui-emoji repository (MIT licence) and converts them to small WebP files.
 *
 *   node scripts/fetch-fluent-emoji.mjs
 *
 * Output: public/emoji/<slug>.webp (committed, so builds never hit the network).
 * Licence: https://github.com/microsoft/fluentui-emoji/blob/main/LICENSE (MIT)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const REPO_RAW = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets';

/** slug -> folder name in the Fluent Emoji repo */
export const EMOJI = {
  // categories
  dress: 'Dress',
  laptop: 'Laptop',
  headphone: 'Headphone',
  lipstick: 'Lipstick',
  'lotion-bottle': 'Lotion bottle',
  'couch-and-lamp': 'Couch and lamp',
  croissant: 'Croissant',
  ring: 'Ring',
  watch: 'Watch',
  handbag: 'Handbag',
  'running-shoe': 'Running shoe',
  'soccer-ball': 'Soccer ball',
  'video-game': 'Video game',
  books: 'Books',
  'teddy-bear': 'Teddy bear',
  'fountain-pen': 'Fountain pen',
  'artist-palette': 'Artist palette',
  'potted-plant': 'Potted plant',
  'paw-prints': 'Paw prints',
  sparkles: 'Sparkles',
  // avatars
  lion: 'Lion',
  fox: 'Fox',
  panda: 'Panda',
  'tiger-face': 'Tiger face',
  unicorn: 'Unicorn',
  koala: 'Koala',
  owl: 'Owl',
  penguin: 'Penguin',
  octopus: 'Octopus',
  butterfly: 'Butterfly',
  peacock: 'Peacock',
  'cat-face': 'Cat face',
  'dog-face': 'Dog face',
  'rabbit-face': 'Rabbit face',
  frog: 'Frog',
  // badges and UI
  trophy: 'Trophy',
  'gem-stone': 'Gem stone',
  rocket: 'Rocket',
  fire: 'Fire',
  star: 'Star',
  crown: 'Crown',
  'light-bulb': 'Light bulb',
  'party-popper': 'Party popper',
  '1st-place-medal': '1st place medal',
  'magic-wand': 'Magic wand',
  package: 'Package',
  'shopping-bags': 'Shopping bags',
  'glowing-star': 'Glowing star',
  bell: 'Bell',
  locked: 'Locked',
  'speech-balloon': 'Speech balloon',
  'crystal-ball': 'Crystal ball',
  'thinking-face': 'Thinking face',
  'wrapped-gift': 'Wrapped gift',
  'night-with-stars': 'Night with stars',
  'high-voltage': 'High voltage',
};

const outDir = join(process.cwd(), 'public', 'emoji');
mkdirSync(outDir, { recursive: true });

let ok = 0;
const failed = [];
for (const [slug, folder] of Object.entries(EMOJI)) {
  const file = `${folder.toLowerCase().replace(/ /g, '_')}_3d.png`;
  const url = `${REPO_RAW}/${encodeURIComponent(folder)}/3D/${file}`;
  const res = await fetch(url);
  if (!res.ok) {
    failed.push(`${slug} (${res.status})`);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const webp = await sharp(buf).resize(160, 160).webp({ quality: 86, alphaQuality: 90 }).toBuffer();
  writeFileSync(join(outDir, `${slug}.webp`), webp);
  ok++;
}
console.log(`fluent emoji: ${ok} saved${failed.length ? `, failed: ${failed.join(', ')}` : ''}`);
if (failed.length) process.exitCode = 1;
