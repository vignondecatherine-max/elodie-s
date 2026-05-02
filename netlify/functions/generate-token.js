const https = require('https');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Générer un token unique
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let token = '';
    for (let i = 0; i < 8; i++) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }

    // Stocker via l'API Netlify sans dépendance externe
    const body = JSON.stringify({
      key: `token_${token}`,
      value: JSON.stringify({ used: false, createdAt: new Date().toISOString() })
    });

    await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.netlify.com',
        path: `/api/v1/sites/${process.env.NETLIFY_SITE_ID}/env`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NETLIFY_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, resolve);
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
