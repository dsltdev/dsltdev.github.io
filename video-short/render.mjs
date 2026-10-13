// Renderiza scene.html a MP4 vertical: avanza el reloj del guion fotograma a fotograma (determinista),
// captura cada uno con Chrome y los une con ffmpeg. Uso: node render.mjs [carpeta-de-frames]
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FFMPEG = process.env.FFMPEG_PATH ?? '/opt/homebrew/bin/ffmpeg';
const FPS = 30;
const framesDir = process.argv[2] ?? join(here, '.frames');
const outDir = join(here, 'out');

rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
try {
	const page = await browser.newPage();
	await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
	await page.goto(pathToFileURL(join(here, 'scene.html')).href, { waitUntil: 'networkidle0' });
	await page.evaluate(() => document.fonts.ready);

	// Vista previa: STILLS=3.2,9.5 node render.mjs <carpeta> guarda solo esos instantes y termina.
	if (process.env.STILLS) {
		for (const t of process.env.STILLS.split(',').map(Number)) {
			await page.evaluate((x) => window.renderAt(x), t);
			await page.screenshot({ path: join(framesDir, `still-${t}.png`), type: 'png' });
		}
		await browser.close();
		process.exit(0);
	}

	const duration = await page.evaluate(() => window.DURATION);
	const total = Math.round(duration * FPS);
	for (let i = 0; i < total; i++) {
		await page.evaluate((t) => window.renderAt(t), i / FPS);
		await page.screenshot({ path: join(framesDir, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 93 });
		if (i % 150 === 0) console.log(`fotograma ${i}/${total}`);
	}

	// Portada: el gancho con los sellos 401 ya visibles.
	await page.evaluate(() => window.renderAt(3.2));
	await page.screenshot({ path: join(outDir, 'cover.png'), type: 'png' });
} finally {
	await browser.close();
}

// Pista de audio en silencio: algunas plataformas rechazan o degradan videos sin audio.
const ff = spawnSync(
	FFMPEG,
	[
		'-y', '-loglevel', 'error',
		'-framerate', String(FPS), '-i', join(framesDir, 'f%05d.jpg'),
		'-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
		'-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
		'-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart',
		join(outDir, 'webhook-payouts-short.mp4'),
	],
	{ stdio: 'inherit' },
);
if (ff.status !== 0) process.exit(ff.status ?? 1);
console.log('Listo: out/webhook-payouts-short.mp4');
