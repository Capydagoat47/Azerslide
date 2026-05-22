const http = require("http");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");

const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = __dirname;

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[extension] || "application/octet-stream";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Internal server error");
      return;
    }

    response.writeHead(200, { "Content-Type": contentType });
    response.end(content);
  });
}

function resolveRequestPath(urlPath) {
  const safePath = decodeURIComponent((urlPath || "/").split("?")[0]);
  const requestedPath = safePath === "/" ? "/index.html" : safePath;
  const normalizedPath = path.normalize(requestedPath).replace(/^([.]{2}[\\/])+/, "");
  return path.join(ROOT_DIR, normalizedPath);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on("data", (chunk) => {
      chunks.push(chunk);
    });

    request.on("end", () => {
      try {
        resolve(Buffer.concat(chunks).toString("utf8"));
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTextFromHtml(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1]) : "";

  const text = decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );

  return { title, text };
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeSourceText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchResource(urlString) {
  let parsedUrl;

  try {
    parsedUrl = new URL(urlString);
  } catch (error) {
    throw new Error("Link düzgün formatda deyil.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Yalnız http və https linkləri dəstəklənir.");
  }

  const upstream = await fetch(parsedUrl, { redirect: "follow" });
  if (!upstream.ok) {
    throw new Error(`Mənbə oxunmadı (${upstream.status}).`);
  }

  const contentType = upstream.headers.get("content-type") || "";
  const remoteName = decodeURIComponent(parsedUrl.pathname.split("/").pop() || parsedUrl.hostname);

  if (contentType.includes("pdf") || parsedUrl.pathname.toLowerCase().endsWith(".pdf")) {
    const pdfBuffer = Buffer.from(await upstream.arrayBuffer());
    const pdfData = await pdfParse(pdfBuffer);
    const extractedText = normalizeSourceText(pdfData.text);

    return {
      text: extractedText,
      sourceLabel: pdfData.info?.Title || remoteName || urlString,
      sourceType: "pdf",
    };
  }

  const rawText = await upstream.text();
  const { title, text } = extractTextFromHtml(rawText);

  return {
    text: normalizeSourceText(text),
    sourceLabel: title || remoteName || urlString,
    sourceType: contentType.includes("html") ? "html" : "text",
  };
}

async function handleResourceFetch(request, response) {
  try {
    const body = await readRequestBody(request);
    const payload = JSON.parse(body || "{}");
    const url = normalizeText(payload.url);

    if (!url) {
      sendJson(response, 400, { error: "Link daxil edilməyib." });
      return;
    }

    const resource = await fetchResource(url);
    if (!resource.text) {
      sendJson(response, 422, { error: "Mənbədən istifadə oluna biləcək mətn çıxarıla bilmədi." });
      return;
    }

    sendJson(response, 200, resource);
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Mənbə oxunarkən xəta baş verdi." });
  }
}

const server = http.createServer((request, response) => {
  if (request.method === "GET" && request.url === "/api/health") {
    sendJson(response, 200, { status: "ok", app: "KNSlides Pro" });
    return;
  }

  if (request.method === "POST" && request.url === "/api/fetch-resource") {
    handleResourceFetch(request, response);
    return;
  }

  const resolvedPath = resolveRequestPath(request.url || "/");

  fs.stat(resolvedPath, (error, stats) => {
    if (!error && stats.isFile()) {
      sendFile(response, resolvedPath);
      return;
    }

    if (!error && stats.isDirectory()) {
      const nestedIndex = path.join(resolvedPath, "index.html");
      fs.stat(nestedIndex, (nestedError, nestedStats) => {
        if (!nestedError && nestedStats.isFile()) {
          sendFile(response, nestedIndex);
          return;
        }

        sendFile(response, path.join(ROOT_DIR, "index.html"));
      });
      return;
    }

    sendFile(response, path.join(ROOT_DIR, "index.html"));
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`KNSlides Pro running on port ${PORT}`);
});

