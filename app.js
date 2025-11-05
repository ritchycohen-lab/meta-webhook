const express = require('express');
const app = express();

app.use(express.json());

const VERIFY_TOKEN = 'ulpancoach2025';

// Vérification du webhook Meta
app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Réception des messages et redirection vers Make
app.post('/', async (req, res) => {
  console.log('📩 New event received:', JSON.stringify(req.body, null, 2));

  const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

  try {
    await fetch('https://hook.eu2.make.com/jd72pv469vqw9wxho44dudhs8l3gawl2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    console.log('✅ Data forwarded to Make');
  } catch (error) {
    console.error('❌ Error forwarding to Make:', error);
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
