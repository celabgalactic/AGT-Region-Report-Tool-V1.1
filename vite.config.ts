import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'asset-proxy-plugin',
        configureServer(server) {
          server.middlewares.use('/geonms-font.ttf', (req, res, next) => {
            try {
              const fontPath = path.resolve(process.cwd(), 'geonms-font.ttf');
              const data = fs.readFileSync(fontPath);
              res.setHeader('Content-Type', 'font/ttf');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Cache-Control', 'public, max-age=31536000');
              res.end(data);
            } catch (err: any) {
              res.statusCode = 500;
              res.end('Error serving font: ' + err.message);
            }
          });

          server.middlewares.use('/api/geonms-font.ttf', (req, res, next) => {
            try {
              const fontPath = path.resolve(process.cwd(), 'geonms-font.ttf');
              const data = fs.readFileSync(fontPath);
              res.setHeader('Content-Type', 'font/ttf');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Cache-Control', 'public, max-age=31536000');
              res.end(data);
            } catch (err: any) {
              res.statusCode = 500;
              res.end('Error serving font: ' + err.message);
            }
          });

          const serveLogo = (req: any, res: any) => {
            try {
              const possibilities = ['AGTIcon.png', 'AGTicon.png'];
              for (const p of possibilities) {
                const logoPath = path.resolve(process.cwd(), p);
                if (fs.existsSync(logoPath)) {
                  const data = fs.readFileSync(logoPath);
                  res.setHeader('Content-Type', 'image/png');
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.setHeader('Cache-Control', 'public, max-age=31536000');
                  res.end(data);
                  return;
                }
              }
              res.statusCode = 404;
              res.end('Logo file not found');
            } catch (err: any) {
              res.statusCode = 500;
              res.end('Error serving logo: ' + err.message);
            }
          };

          const serveAudio = (req: any, res: any) => {
            try {
              const audioPath = path.resolve(process.cwd(), 'AGT Anthem (Instrumental).mp3');
              if (fs.existsSync(audioPath)) {
                const data = fs.readFileSync(audioPath);
                res.setHeader('Content-Type', 'audio/mpeg');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Cache-Control', 'public, max-age=31536000');
                res.end(data);
                return;
              }
              res.statusCode = 404;
              res.end('Audio file not found at: ' + audioPath);
            } catch (err: any) {
              res.statusCode = 500;
              res.end('Error serving audio: ' + err.message);
            }
          };

          server.middlewares.use('/AGTIcon.png', serveLogo);
          server.middlewares.use('/AGTicon.png', serveLogo);
          server.middlewares.use('/api/AGTIcon.png', serveLogo);
          server.middlewares.use('/api/AGTicon.png', serveLogo);
          server.middlewares.use('/AGT Anthem (Instrumental).mp3', serveAudio);
          server.middlewares.use('/AGT%20Anthem%20(Instrumental).mp3', serveAudio);
          server.middlewares.use('/api/AGT Anthem (Instrumental).mp3', serveAudio);
          server.middlewares.use('/api/AGT%20Anthem%20(Instrumental).mp3', serveAudio);

          server.middlewares.use('/api/asset-proxy', async (req, res, next) => {
            const urlObj = new URL(req.url || '', 'http://localhost');
            const fileId = urlObj.searchParams.get('id');
            if (!fileId) {
              res.statusCode = 400;
              res.end('Missing ID');
              return;
            }

            try {
              const driveUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
              const response = await fetch(driveUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                }
              });

              if (!response.ok) {
                res.statusCode = response.status;
                res.end(`Failed to fetch from Drive first-pass: ${response.status}`);
                return;
              }

              let contentType = response.headers.get('content-type') || '';
              
              if (contentType.includes('text/html')) {
                const htmlText = await response.text();
                const confirmMatch = htmlText.match(/confirm=([a-zA-Z0-9_]+)/);
                if (confirmMatch && confirmMatch[1]) {
                  const confirmToken = confirmMatch[1];
                  const confirmedUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${confirmToken}`;
                  
                  const confirmedResponse = await fetch(confirmedUrl, {
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    }
                  });
                  
                  if (confirmedResponse.ok) {
                    const confirmedContentType = confirmedResponse.headers.get('content-type');
                    if (confirmedContentType) {
                      res.setHeader('Content-Type', confirmedContentType);
                    }
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Cache-Control', 'public, max-age=31536000');
                    const arrayBuffer = await confirmedResponse.arrayBuffer();
                    res.end(Buffer.from(arrayBuffer));
                    return;
                  }
                }
              }

              if (contentType) {
                res.setHeader('Content-Type', contentType);
              }
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Cache-Control', 'public, max-age=31536000');
              const arrayBuffer = await response.arrayBuffer();
              res.end(Buffer.from(arrayBuffer));
            } catch (err: any) {
              res.statusCode = 500;
              res.end('Error proxying asset: ' + err.message);
            }
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
