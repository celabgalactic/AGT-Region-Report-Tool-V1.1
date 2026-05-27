import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";

async function runDiagnostics() {
  try {
    const fileId = "1GM-QSURTqQ-9sPwvDf0PA_jb5T5D9kZ4";
    const driveUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    const response = await fetch(driveUrl);
    
    let bodyText = "";
    const contentType = response.headers.get("content-type") || "";
    const headers = Array.from(response.headers.entries());
    
    if (contentType.includes("text") || contentType.includes("html") || contentType.includes("json")) {
      const text = await response.text();
      bodyText = text.substring(0, 2000);
    } else {
      bodyText = `Binary/Other file. Content-Type: ${contentType}. Length: ${response.headers.get("content-length")}`;
    }

    const logContent = `=== DIAGNOSTICS ===
Status: ${response.status}
Status Text: ${response.statusText}
Content-Type: ${contentType}
Headers: ${JSON.stringify(headers, null, 2)}
Body Prefix:
${bodyText}
`;
    fs.writeFileSync("./font_debug.log", logContent, "utf-8");
  } catch (error: any) {
    fs.writeFileSync("./font_debug.log", `Error during diagnostics: ${error.message}\n${error.stack}`, "utf-8");
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Run diagnostics on server startup to debug custom font load failure
  runDiagnostics().catch(console.error);

  // Route to serve the local geonms-font.ttf font with CORS headers
  app.get("/geonms-font.ttf", (req, res) => {
    res.setHeader("Content-Type", "font/ttf");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.sendFile(path.join(process.cwd(), "geonms-font.ttf"));
  });

  app.get("/api/geonms-font.ttf", (req, res) => {
    res.setHeader("Content-Type", "font/ttf");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.sendFile(path.join(process.cwd(), "geonms-font.ttf"));
  });

  // Ensure and copy AGTicon.png to AGTIcon.png on startup if one exists but the other doesn't
  try {
    const lowerPath = path.join(process.cwd(), "AGTicon.png");
    const upperPath = path.join(process.cwd(), "AGTIcon.png");
    if (fs.existsSync(lowerPath) && !fs.existsSync(upperPath)) {
      fs.copyFileSync(lowerPath, upperPath);
    } else if (fs.existsSync(upperPath) && !fs.existsSync(lowerPath)) {
      fs.copyFileSync(upperPath, lowerPath);
    }
  } catch (copyErr) {
    console.error("Error setting up font or logo file configurations:", copyErr);
  }

  // Route to serve the local AGTIcon.png and AGTicon.png logo with CORS headers
  app.get(["/AGTIcon.png", "/AGTicon.png", "/api/AGTIcon.png", "/api/AGTicon.png"], (req, res) => {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=31536000");
    const possibilities = ["AGTIcon.png", "AGTicon.png"];
    for (const p of possibilities) {
      const fullPath = path.join(process.cwd(), p);
      if (fs.existsSync(fullPath)) {
        return res.sendFile(fullPath);
      }
    }
    res.status(404).send("Logo not found");
  });

  // Route to serve the local background audio loop
  app.get(["/AGT Anthem (Instrumental).mp3", "/AGT%20Anthem%20(Instrumental).mp3", "/api/AGT Anthem (Instrumental).mp3", "/api/AGT%20Anthem%20(Instrumental).mp3"], (req, res) => {
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=31536000");
    const fullPath = path.join(process.cwd(), "AGT Anthem (Instrumental).mp3");
    if (fs.existsSync(fullPath)) {
      return res.sendFile(fullPath);
    }
    res.status(404).send("Audio loop not found");
  });

  // Proxy route for Google Drive assets to bypass CORS
  app.get("/api/asset-proxy", async (req, res) => {
    const fileId = req.query.id as string;
    if (!fileId) return res.status(400).send("Missing ID");

    try {
      const driveUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      const response = await fetch(driveUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });
      
      if (!response.ok) throw new Error(`Failed to fetch from Drive first-pass: ${response.status}`);

      let contentType = response.headers.get("content-type") || "";
      
      // If Google Drive shows an HTML confirmation/warning page, search for confirmation flow tag
      if (contentType.includes("text/html")) {
        const text = await response.text();
        const confirmMatch = text.match(/confirm=([a-zA-Z0-9_]+)/);
        if (confirmMatch && confirmMatch[1]) {
          const confirmToken = confirmMatch[1];
          const confirmedUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${confirmToken}`;
          
          const confirmedResponse = await fetch(confirmedUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
          });
          
          if (confirmedResponse.ok) {
            const confirmedContentType = confirmedResponse.headers.get("content-type");
            if (confirmedContentType) res.setHeader("Content-Type", confirmedContentType);
            
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Cache-Control", "public, max-age=31536000");
            
            const arrayBuffer = await confirmedResponse.arrayBuffer();
            return res.send(Buffer.from(arrayBuffer));
          }
        }
      }

      if (contentType) res.setHeader("Content-Type", contentType);
      
      // Add CORS headers
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=31536000");

      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      console.error("Proxy error:", error);
      res.status(500).send("Error proxying asset: " + error.message);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
