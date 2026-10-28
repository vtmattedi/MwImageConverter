# MW Converter

A small set of browser-based tools: convert images, convert video/audio, and generate QR codes.
Everything runs client-side in your browser — files are never uploaded to a server.

## Tools

| Tool | Route | What it does |
| --- | --- | --- |
| Image Converter | `/converter` | Converts JPG, PNG, HEIC and more to WebP. Supports batch conversion and ZIP download. |
| Video Converter | `/video` | Converts video/audio to MP4, WebM, MOV, MKV, GIF, MP3 or WAV using [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm). |
| QR Studio | `/qrcode` | Generates QR codes with custom colors, margin and scale, exported as SVG. |

### Video converter limits

ffmpeg.wasm runs single-threaded inside a memory-limited browser sandbox:

- Short clips and phone videos convert reliably; very large or high-bitrate files (hundreds of MB, full-length 1080p+ movies) may run out of memory or take a long time.
- The ffmpeg engine (~30 MB) is downloaded from [unpkg](https://unpkg.com) the first time you convert a video, so that step needs internet access.
- If the engine crashes on a file, the converter automatically retries once with conservative settings (first video/audio stream only, even dimensions, `ultrafast` preset).

## Tech stack

- [Vite](https://vite.dev) + [React 19](https://react.dev) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) and [Radix UI](https://www.radix-ui.com) / shadcn-style components
- [React Router](https://reactrouter.com)
- [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm), [heic2any](https://github.com/alexcorvi/heic2any), [JSZip](https://stuk.github.io/jszip/), [Dexie](https://dexie.org), [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator)

## Getting started

Requires Node.js 22+ and npm.

```bash
git clone https://github.com/vtmattedi/MwImageConverter
cd MwImageConverter
npm install
npm run dev
```

Other scripts:

```bash
npm run build     # type-check and build to dist/
npm run preview   # serve the production build locally on port 4173
npm run lint      # run ESLint
```

## Deployment

The app is a static single-page application. Because it uses client-side routing, whatever serves `dist/` must fall back to `index.html` for unknown paths (see [`vercel.json`](vercel.json) and [`docker/nginx.conf`](docker/nginx.conf)).

### Docker

```bash
docker compose up -d --build
```

This builds the app and serves it with unprivileged nginx on port `8080` inside the container (a `/health` endpoint is exposed for health checks). The compose file only `expose`s the port, so put it behind a reverse proxy or add a `ports:` mapping such as `"8080:8080"`.

### Vercel

Import the repository; the included `vercel.json` handles the SPA rewrite.

## Project structure

```
src/
  Pages/        Landing, Converter (images), FFMPEG (video), QRCode
  components/   Shared UI components
  Providers/    Global state and alerts (React context)
  lib/          Utilities
docker/         nginx config for the container image
public/         Static assets, fonts, web manifest
```

## License

[MIT](LICENSE) © 2026 Vitor Mattedi
