// Minimal working backend - no dependencies, just Node.js HTTP
const http = require('http');
const url = require('url');

// Mock data
const NEWS = [
  {
    id: 1,
    title: "April 2026 Booklet Added",
    message: "The April 2026 affirmations booklet is now live.",
    category: "release",
    createdAt: "2026-03-31T08:00:00.000Z"
  },
  {
    id: 2,
    title: "Backend is Now Working",
    message: "You can now signup and use the app!",
    category: "update",
    createdAt: "2026-04-10T08:00:00.000Z"
  }
];

const BOOKLETS = [
  {
    id: 1,
    title: "January 2025",
    month: "January",
    year: 2025,
    description: "Daily affirmations for January",
    itemCount: 31
  },
  {
    id: 2,
    title: "April 2026",
    month: "April",
    year: 2026,
    description: "Daily affirmations for April 2026",
    itemCount: 30
  }
];

// In-memory user store (for demo only)
const users = new Map();
let userId = 100;

function sendJSON(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

function handleCORS(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return true;
  }
  return false;
}

function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      callback(JSON.parse(body));
    } catch (e) {
      callback({});
    }
  });
}

const server = http.createServer((req, res) => {
  if (handleCORS(req, res)) return;

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  console.log(`${req.method} ${pathname}`);

  // Health check
  if (pathname === '/health' || pathname === '/') {
    sendJSON(res, 200, { status: 'ok', message: 'Backend is working!' });
    return;
  }

  // GET /api/news
  if (pathname === '/api/news' && req.method === 'GET') {
    sendJSON(res, 200, NEWS);
    return;
  }

  // GET /api/booklets
  if (pathname === '/api/booklets' && req.method === 'GET') {
    sendJSON(res, 200, BOOKLETS);
    return;
  }

  // POST /api/auth/register
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    parseBody(req, (body) => {
      const { username, email, password, displayName } = body;
      
      if (!username || !email || !password) {
        return sendJSON(res, 400, { message: 'Missing required fields' });
      }

      if (Array.from(users.values()).some(u => u.email === email)) {
        return sendJSON(res, 400, { message: 'Email already in use' });
      }

      const id = ++userId;
      const user = { id, username, email, displayName: displayName || username, isAdmin: false };
      users.set(id, user);

      sendJSON(res, 200, user);
    });
    return;
  }

  // POST /api/auth/login
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    parseBody(req, (body) => {
      const { email, password } = body;

      if (!email || !password) {
        return sendJSON(res, 400, { message: 'Missing email or password' });
      }

      const user = Array.from(users.values()).find(u => u.email === email);
      if (!user) {
        return sendJSON(res, 401, { message: 'Invalid email or password' });
      }

      sendJSON(res, 200, user);
    });
    return;
  }

  // GET /api/auth/me
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const userId = parsedUrl.query.userId || '100';
    const user = users.get(parseInt(userId));
    if (user) {
      sendJSON(res, 200, user);
    } else {
      sendJSON(res, 401, { message: 'Not logged in' });
    }
    return;
  }

  // 404
  sendJSON(res, 404, { message: 'Not found' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✓ Backend running on port ${PORT}`);
});
