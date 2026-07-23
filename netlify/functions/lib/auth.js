const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'malani-hospital-dev-secret-CHANGE-IN-PRODUCTION';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

// Reads "Authorization: Bearer <token>" and returns the decoded payload,
// or null if missing/invalid/expired.
function verifyAuth(event) {
  const header = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    return jwt.verify(match[1], JWT_SECRET);
  } catch (e) {
    return null;
  }
}

module.exports = { signToken, verifyAuth };
