const store = require('../../data/store.js');

exports.handler = async (event) => {
  // event.path looks like /.netlify/functions/media/doctors/xyz.png
  // (or /media/doctors/xyz.png when reached via the /media/* redirect).
  // Browsers percent-encode non-ASCII characters (e.g. Devanagari doctor
  // names) when requesting the image, so we must decode each segment back
  // before looking it up in Blob storage.
  const parts = event.path.split('/').filter(Boolean).map(decodeURIComponent);
  const mediaIdx = parts.indexOf('media');
  const rest = mediaIdx >= 0 ? parts.slice(mediaIdx + 1) : parts.slice(parts.indexOf('server') + 1);
  const key = rest.join('/');

  if (!key) {
    return { statusCode: 400, body: 'Bad request' };
  }

  const file = await store.getFile(key);
  if (!file) {
    return { statusCode: 404, body: 'Not found' };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': file.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable'
    },
    body: file.data.toString('base64'),
    isBase64Encoded: true
  };
};
