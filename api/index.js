const express = require('express');
const { auth } = require('express-oauth2-jwt-bearer');
const admin = require('firebase-admin');

const app = express();

app.use(express.json());

const jwtCheck = auth({
  audience: 'https://mostudy.org/api',
  issuerBaseURL: 'https://dev-p6gwlkrt2p6bu5m0.us.auth0.com/',
  tokenSigningAlg: 'RS256'
});

const initializeFirebase = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountRaw) {
    console.error('FIREBASE_SERVICE_ACCOUNT is not set in environment variables');
    throw new Error('Firebase configuration missing on server');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountRaw);
  } catch (error) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', error);
    throw new Error('Invalid Firebase configuration format');
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
};

const getFirestore = () => {
  initializeFirebase();
  return admin.firestore();
};

// Public endpoint for AI chat (no auth required)
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, temperature = 0.7 } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages array required' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY not set');
      return res.status(500).json({ error: 'AI service not configured: missing API key' });
    }

    console.log('Calling OpenRouter AI with model: moonshotai/kimi-k2-0905');

    // Use direct HTTP call to OpenRouter API
    const requestBody = {
      model: 'moonshotai/kimi-k2-0905',
      messages: messages,
      temperature: temperature,
      stream: false
    };

    const fetchResponse = await fetch('https://ai.hackclub.com/proxy/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    const responseData = await fetchResponse.json();

    if (!fetchResponse.ok) {
      console.error('OpenRouter API error:', {
        status: fetchResponse.status,
        data: responseData
      });
      
      if (fetchResponse.status === 401) {
        return res.status(401).json({ 
          error: 'AI service authentication failed',
          details: 'Check your OPENROUTER_API_KEY'
        });
      }
      
      if (fetchResponse.status === 429) {
        return res.status(429).json({ error: 'AI service rate limited, please try again later' });
      }

      return res.status(fetchResponse.status).json({
        error: responseData.error?.message || 'AI service error',
        details: responseData
      });
    }

    if (!responseData.choices || responseData.choices.length === 0) {
      console.error('No choices in response:', responseData);
      return res.status(500).json({ error: 'No response from AI service' });
    }

    const content = responseData.choices[0].message.content;
    
    return res.json({
      choices: [
        {
          message: {
            content: content
          }
        }
      ]
    });

  } catch (error) {
    console.error('AI chat endpoint error:', {
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({ 
      error: 'AI service error',
      message: error.message
    });
  }
});

// enforce auth on user settings endpoints
app.use(jwtCheck);

app.get('/api/authorized', function (req, res) {
  res.send('Secured Resource');
});

app.get('/api/user-settings', async (req, res) => {
  try {
    const userId = req.auth?.payload?.sub;
    if (!userId) {
      console.error('No userId in auth payload');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getFirestore();
    console.log(`Fetching settings for user: ${userId}`);
    const docRef = db.collection('users').doc(userId);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      console.log('No settings found for user, returning defaults');
      return res.json({
        emailNotifications: true,
        timerAlerts: true
      });
    }

    const data = snapshot.data() || {};
    console.log('Settings found:', data);
    return res.json({
      emailNotifications: data.emailNotifications ?? true,
      timerAlerts: data.timerAlerts ?? true
    });
  } catch (error) {
    console.error('Detailed error in GET /api/user-settings:', error);
    return res.status(500).json({ error: 'Failed to load settings', message: error.message });
  }
});

app.post('/api/user-settings', async (req, res) => {
  try {
    const userId = req.auth?.payload?.sub;
    if (!userId) {
      console.error('No userId in auth payload for POST');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const emailNotifications = Boolean(req.body?.emailNotifications);
    const timerAlerts = Boolean(req.body?.timerAlerts);

    console.log(`Saving settings for user ${userId}:`, { emailNotifications, timerAlerts });

    const db = getFirestore();
    const docRef = db.collection('users').doc(userId);
    await docRef.set(
      {
        emailNotifications,
        timerAlerts,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    console.log('Settings saved successfully');
    return res.json({ emailNotifications, timerAlerts });
  } catch (error) {
    console.error('Detailed error in POST /api/user-settings:', error);
    return res.status(500).json({ error: 'Failed to save settings', message: error.message });
  }
});

// Export the app for Vercel Serverless Functions
module.exports = app;
