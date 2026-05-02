const https = require('https');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { token, consume } = JSON.parse(event.body);

    if (!token) {
      return { statusCode: 400, body: JSON.stringify({ valid: false, error: 'Token manquant' }) };
    }

    // Vérifier via l'API Netlify
    const data = await new Promise((resolve, reject) => {
      https.get({
        hostname: 'api.netlify.com',
        path: `/api/v1/sites/${process.env.NETLIFY_SITE_ID}/env/token_${token}`,
        headers: { 'Authorization': `Bearer ${process.env.NETLIFY_ACCESS_TOKEN}` }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }).on('error', reject);
    });

    if (data.status === 404 || !data.body) {
      return { statusCode: 200, body: JSON.stringify({ valid: false, error: 'Lien invalide ou expiré.' }) };
    }

    const envData = JSON.parse(data.body);
    const tokenData = JSON.parse(envData.value);

    if (tokenData.used) {
      return { statusCode: 200, body: JSON.stringify({ valid: false, error: 'Cet audio a déjà été généré. Chaque lien est à usage unique.' }) };
    }

    if (consume) {
      const updateBody = JSON.stringify({
        value: JSON.stringify({ ...tokenData, used: true, usedAt: new Date().toISOString() })
      });

      await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'api.netlify.com',
          path: `/api/v1/sites/${process.env.NETLIFY_SITE_ID}/env/token_${token}`,
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.NETLIFY_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(updateBody)
          }
        }, resolve);
        req.on('error', reject);
        req.write(updateBody);
        req.end();
      });
    }

    return { statusCode: 200, body: JSON.stringify({ valid: true }) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ valid: false, error: err.message }) };
  }
};
