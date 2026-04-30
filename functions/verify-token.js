const { getStore } = require("@netlify/blobs");

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { token, consume } = JSON.parse(event.body);

    if (!token) {
      return { statusCode: 400, body: JSON.stringify({ valid: false, error: 'Token manquant' }) };
    }

    const store = getStore({
      name: "audio-tokens",
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_ACCESS_TOKEN,
    });

    const data = await store.get(token);

    if (!data) {
      return {
        statusCode: 200,
        body: JSON.stringify({ valid: false, error: 'Lien invalide ou expiré.' }),
      };
    }

    const tokenData = JSON.parse(data);

    if (tokenData.used) {
      return {
        statusCode: 200,
        body: JSON.stringify({ valid: false, error: 'Cet audio a déjà été généré. Chaque lien est à usage unique.' }),
      };
    }

    // Si consume=true, marquer comme utilisé
    if (consume) {
      await store.set(token, JSON.stringify({
        ...tokenData,
        used: true,
        usedAt: new Date().toISOString(),
      }));
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ valid: true }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ valid: false, error: err.message }),
    };
  }
};
