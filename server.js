const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = __dirname;

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
};

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
  const safePath = decodeURIComponent(urlPath.split("?")[0]);
  const requestedPath = safePath === "/" ? "/index.html" : safePath;
  const normalizedPath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  return path.join(ROOT_DIR, normalizedPath);
}

const server = http.createServer((request, response) => {
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
  console.log(`Azerslide UI running on port ${PORT}`);
});
