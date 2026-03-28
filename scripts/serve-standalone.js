const http = require('http');
const fs = require('fs');
const path = require('path');
const { buildStandalone } = require('./build-standalone');

const rootDir = path.resolve(__dirname, '..');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const standaloneEntry = path.join(rootDir, 'mazerunner.html');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function resolveRequestPath(urlPath) {
  const pathname = decodeURIComponent((urlPath || '/').split('?')[0].split('#')[0]);
  if (pathname === '/' || pathname === '') {
    return standaloneEntry;
  }

  // Normalize backslashes and encoded traversal sequences before path resolution
  const sanitized = pathname
    .replace(/\\/g, '/')           // backslash → forward slash
    .replace(/%2e/gi, '.')         // encoded dots
    .replace(/%2f/gi, '/')         // encoded slashes
    .replace(/\/+/g, '/')          // collapse repeated slashes
    .replace(/^\/+/, '');           // strip leading slashes
  const normalizedPath = path.normalize(sanitized);
  const resolvedPath = path.resolve(rootDir, normalizedPath);

  // Ensure resolved path is within rootDir (path.sep ensures exact boundary match)
  if (!resolvedPath.startsWith(rootDir + path.sep) && resolvedPath !== rootDir) {
    return null;
  }
  return resolvedPath;
}

function sendFile(filePath, response) {
  fs.readFile(filePath, (error, buffer) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500, {
        'Content-Type': 'text/plain; charset=utf-8'
      });
      response.end(error.code === 'ENOENT' ? 'Not found' : 'Internal server error');
      return;
    }

    const contentType = contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(buffer);
  });
}

async function startServer() {
  await buildStandalone();

  const server = http.createServer((request, response) => {
    if (request.url === '/healthz') {
      response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('ok');
      return;
    }

    const resolvedPath = resolveRequestPath(request.url);
    if (!resolvedPath) {
      response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Forbidden');
      return;
    }

    fs.stat(resolvedPath, (error, stats) => {
      if (error) {
        sendFile(standaloneEntry, response);
        return;
      }

      if (stats.isDirectory()) {
        const indexPath = path.join(resolvedPath, 'index.html');
        fs.stat(indexPath, (indexError, indexStats) => {
          if (!indexError && indexStats.isFile()) {
            sendFile(indexPath, response);
            return;
          }
          response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
          response.end('Directory listing is disabled');
        });
        return;
      }

      sendFile(resolvedPath, response);
    });
  });

  server.listen(port, host, () => {
    console.log(`MazeRunner standalone server running at http://${host}:${port}`);
  });
}

startServer().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
