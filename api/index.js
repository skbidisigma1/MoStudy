const express = require('express');
const { auth } = require('express-oauth2-jwt-bearer');
const admin = require('firebase-admin');

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==================== RATE LIMITING ====================

const rateLimitStore = new Map();
const getClientKey = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : (forwarded ? forwarded.split(',')[0] : req.socket?.remoteAddress);
  return `${ip || 'unknown'}:${req.path}`;
};

const rateLimit = ({ windowMs, max }) => (req, res, next) => {
  const now = Date.now();
  const key = getClientKey(req);
  const entry = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }

  entry.count += 1;
  rateLimitStore.set(key, entry);

  if (entry.count > max) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({ error: 'Too many requests, please slow down.' });
  }

  return next();
};

// ==================== AUTH0 JWT MIDDLEWARE ====================

const jwtCheck = auth({
  audience: 'https://mostudy.org/api',
  issuerBaseURL: 'https://dev-p6gwlkrt2p6bu5m0.us.auth0.com/',
  tokenSigningAlg: 'RS256'
});

// ==================== FIREBASE ADMIN SDK ====================

/**
 * Initialize Firebase Admin SDK from individual env vars (Vercel deployment).
 * All service account fields are stored as separate env variables.
 */
const initializeFirebase = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // First try the single JSON env var (backward compatibility)
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountRaw) {
    try {
      const serviceAccount = JSON.parse(serviceAccountRaw);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', error);
    }
  }

  // Fallback: construct from individual env vars
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    console.error('Firebase credentials missing. Required: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
    throw new Error('Firebase configuration missing on server');
  }

  const serviceAccount = {
    type: 'service_account',
    project_id: projectId,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
    private_key: privateKey,
    client_email: clientEmail,
    client_id: process.env.FIREBASE_CLIENT_ID || '',
    auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT || 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT || ''
  };

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
};

const getFirestore = () => {
  try {
    initializeFirebase();
    return admin.firestore();
  } catch (e) {
    console.warn("Firestore initialization failed (likely missing credentials). Using fallback mode.", e);
    return null;
  }
};

// ==================== USER DATA SCHEMA ====================

/**
 * Default user document structure.
 * Single document per user containing:
 * - theme: 'light' | 'dark'
 * - stats: rollup statistics
 * - quizSummaries: last 25 quiz results (sorted by timestamp desc)
 * - roleplaySummaries: last 25 roleplay results (sorted by timestamp desc)
 */
const createDefaultUserDoc = () => ({
  theme: 'light',
  stats: {
    totalQuizzesCompleted: 0,
    totalRoleplaysCompleted: 0,
    averageQuizScore: 0,
    averageRoleplayScore: 0,
    lastActivityAt: null
  },
  quizSummaries: [],
  roleplaySummaries: [],
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
});

/**
 * Recalculate stats from summaries array.
 * Called within transactions after modifying summaries.
 */
const recalculateStats = (quizSummaries, roleplaySummaries) => {
  const quizScores = quizSummaries.map(s => s.score);
  const roleplayScores = roleplaySummaries.map(s => s.judgeScore);

  return {
    totalQuizzesCompleted: quizSummaries.length,
    totalRoleplaysCompleted: roleplaySummaries.length,
    averageQuizScore: quizScores.length > 0
      ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
      : 0,
    averageRoleplayScore: roleplayScores.length > 0
      ? Math.round(roleplayScores.reduce((a, b) => a + b, 0) / roleplayScores.length)
      : 0,
    lastActivityAt: admin.firestore.FieldValue.serverTimestamp()
  };
};

/**
 * Keep only the last N items, sorted by timestamp descending.
 */
const trimToLimit = (arr, limit = 25) => {
  return arr
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
};

const handleAIRequest = async (req, res) => {
  try {
    const { messages, temperature = 0.7, model, enableThinking = true, audio } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages array required' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY not set');
      return res.status(500).json({ error: 'AI service not configured: missing API key' });
    }

    // Use the model from client or fallback to GPT-5.1
    const selectedModel = model || 'openai/gpt-5.1';

    console.log('Calling OpenRouter with model:', selectedModel, '| Temperature:', temperature);

    // Use direct HTTP call to OpenRouter API
    const requestBody = {
      model: selectedModel,
      messages: messages,
      temperature: temperature,
      stream: false
    };

    const makeRequest = async (body) => {
      const fetchResponse = await fetch('https://ai.hackclub.com/proxy/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });

      const responseData = await fetchResponse.json();
      return { fetchResponse, responseData };
    };

    let { fetchResponse, responseData } = await makeRequest(requestBody);

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
};

// enforce auth on protected endpoints
app.use(jwtCheck);

// Auth-only AI endpoints (locked)
app.post('/api/ai/chat', rateLimit({ windowMs: 60 * 1000, max: 30 }), handleAIRequest);
app.post('/api/ai/review', rateLimit({ windowMs: 60 * 1000, max: 20 }), handleAIRequest);

app.get('/api/authorized', function (req, res) {
  res.send('Secured Resource');
});

// ==================== USER DATA ENDPOINTS ====================

/**
 * GET /api/user-data
 * Fetch the complete user document (preferences, stats, summaries).
 * Uses a transaction for consistent reads.
 */
app.get('/api/user-data', rateLimit({ windowMs: 60 * 1000, max: 60 }), async (req, res) => {
  try {
    const userId = req.auth?.payload?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getFirestore();
    if (!db) {
      console.log('Firestore not available, returning default user data');
      return res.json(createDefaultUserDoc());
    }

    const docRef = db.collection('users').doc(userId);

    // Use transaction for consistent read
    const userData = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef);

      if (!snapshot.exists) {
        // Create default document if user doesn't exist
        const defaultDoc = createDefaultUserDoc();
        transaction.set(docRef, defaultDoc);
        return defaultDoc;
      }

      return snapshot.data();
    });

    // Convert Firestore timestamps to ISO strings for JSON serialization
    const response = {
      theme: userData.theme || 'light',
      stats: {
        totalQuizzesCompleted: userData.stats?.totalQuizzesCompleted || 0,
        totalRoleplaysCompleted: userData.stats?.totalRoleplaysCompleted || 0,
        averageQuizScore: userData.stats?.averageQuizScore || 0,
        averageRoleplayScore: userData.stats?.averageRoleplayScore || 0,
        lastActivityAt: userData.stats?.lastActivityAt?.toDate?.()?.toISOString() || null
      },
      quizSummaries: userData.quizSummaries || [],
      roleplaySummaries: userData.roleplaySummaries || []
    };

    return res.json(response);
  } catch (error) {
    console.error('Error in GET /api/user-data:', error);
    return res.status(500).json({ error: 'Failed to load user data', message: error.message });
  }
});

/**
 * PATCH /api/user-data
 * Update user preferences (theme only for now).
 * Uses a transaction for atomic update.
 */
app.patch('/api/user-data', rateLimit({ windowMs: 60 * 1000, max: 30 }), async (req, res) => {
  try {
    const userId = req.auth?.payload?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { theme } = req.body;

    // Validate theme
    if (theme && !['light', 'dark'].includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme value. Must be "light" or "dark".' });
    }

    const db = getFirestore();
    if (!db) {
      console.warn('Firestore not available, cannot update user data');
      return res.json({ theme: theme || 'light' });
    }

    const docRef = db.collection('users').doc(userId);

    const updatedData = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef);

      let currentData = snapshot.exists ? snapshot.data() : createDefaultUserDoc();

      if (theme) {
        currentData.theme = theme;
      }
      currentData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      transaction.set(docRef, currentData, { merge: true });

      return currentData;
    });

    return res.json({ theme: updatedData.theme });
  } catch (error) {
    console.error('Error in PATCH /api/user-data:', error);
    return res.status(500).json({ error: 'Failed to update user data', message: error.message });
  }
});

/**
 * POST /api/reports
 * Save a quiz or roleplay report.
 * Appends to the appropriate array, trims to 25 items, recalculates stats.
 * Uses a transaction for atomic read-modify-write.
 */
app.post('/api/reports', rateLimit({ windowMs: 60 * 1000, max: 30 }), async (req, res) => {
  try {
    const userId = req.auth?.payload?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type, data } = req.body;

    if (!type || !['quiz', 'roleplay'].includes(type)) {
      return res.status(400).json({ error: 'Invalid report type. Must be "quiz" or "roleplay".' });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid report data.' });
    }

    const db = getFirestore();
    if (!db) {
      console.warn('Firestore not available, cannot save report');
      return res.json({ success: true, message: 'Report not saved (Firestore unavailable)' });
    }

    const docRef = db.collection('users').doc(userId);
    const timestamp = new Date().toISOString();

    const updatedData = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef);

      let currentData = snapshot.exists ? snapshot.data() : createDefaultUserDoc();

      // Ensure arrays exist
      currentData.quizSummaries = currentData.quizSummaries || [];
      currentData.roleplaySummaries = currentData.roleplaySummaries || [];

      if (type === 'quiz') {
        // Validate quiz report structure
        const quizSummary = {
          timestamp,
          category: String(data.category || 'Unknown'),
          score: Number(data.score) || 0,
          totalQuestions: Number(data.totalQuestions) || 0,
          correctAnswers: Number(data.correctAnswers) || 0,
          categoryScores: data.categoryScores || {}
        };

        currentData.quizSummaries.push(quizSummary);
        currentData.quizSummaries = trimToLimit(currentData.quizSummaries, 25);
      } else if (type === 'roleplay') {
        // Validate roleplay report structure
        const roleplaySummary = {
          timestamp,
          event: String(data.event || 'Unknown'),
          difficulty: String(data.difficulty || 'normal'),
          judgeScore: Number(data.judgeScore) || 0,
          categoryScores: data.categoryScores || {}
        };

        currentData.roleplaySummaries.push(roleplaySummary);
        currentData.roleplaySummaries = trimToLimit(currentData.roleplaySummaries, 25);
      }

      // Recalculate stats
      currentData.stats = recalculateStats(
        currentData.quizSummaries,
        currentData.roleplaySummaries
      );
      currentData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      transaction.set(docRef, currentData);

      return currentData;
    });

    // Return the updated user data so client cache stays in sync
    const response = {
      success: true,
      theme: updatedData.theme || 'light',
      stats: {
        totalQuizzesCompleted: updatedData.stats?.totalQuizzesCompleted || 0,
        totalRoleplaysCompleted: updatedData.stats?.totalRoleplaysCompleted || 0,
        averageQuizScore: updatedData.stats?.averageQuizScore || 0,
        averageRoleplayScore: updatedData.stats?.averageRoleplayScore || 0,
        lastActivityAt: new Date().toISOString()
      },
      quizSummaries: updatedData.quizSummaries || [],
      roleplaySummaries: updatedData.roleplaySummaries || []
    };

    return res.json(response);
  } catch (error) {
    console.error('Error in POST /api/reports:', error);
    return res.status(500).json({ error: 'Failed to save report', message: error.message });
  }
});

// ==================== LEGACY SETTINGS ENDPOINTS ====================
// These maintain backward compatibility with the existing account page

app.get('/api/user-settings', rateLimit({ windowMs: 60 * 1000, max: 120 }), async (req, res) => {
  try {
    const userId = req.auth?.payload?.sub;
    if (!userId) {
      console.error('No userId in auth payload');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getFirestore();
    if (!db) {
        console.log('Firestore not available, returning default settings');
        return res.json({
            emailNotifications: true,
            timerAlerts: true
        });
    }

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

app.post('/api/user-settings', rateLimit({ windowMs: 60 * 1000, max: 60 }), async (req, res) => {
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
    if (!db) {
        console.warn('Firestore not available, cannot save settings');
        // Return success fake to not break frontend
        return res.json({ emailNotifications, timerAlerts });
    }

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

module.exports = app;
