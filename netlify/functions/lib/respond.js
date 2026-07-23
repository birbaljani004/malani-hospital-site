const BASE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

function json(statusCode, data) {
  return { statusCode, headers: BASE_HEADERS, body: JSON.stringify(data) };
}

function ok(data) { return json(200, data); }
function error(statusCode, message) { return json(statusCode, { error: message }); }

function preflight() {
  return { statusCode: 204, headers: BASE_HEADERS, body: '' };
}

module.exports = { json, ok, error, preflight, BASE_HEADERS };
