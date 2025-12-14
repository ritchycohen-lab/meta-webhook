import express from "express";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

// ------------------------------------------------------
// SUPABASE (utilisé ailleurs, PAS dans la traduction V0)
// ------------------------------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ------------------------------------------------------
// APP INIT
// ------------------------------------------------------
const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "ulpancoach2025";

// ------------------------------------------------------
// 1) VERIFICATION WEBHOOK META (OBLIGATOIRE)
// ------------------------------------------------------
app.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ WEBHOOK VERIFIED");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// ------------------------------------------------------
// 2) RECEPTION DES EVENTS META → REDIRECTION MAKE
// ------------------------------------------------------
app.post("/", async (req, res) => {
  console.log("📩 New Meta event received");

  try {
    const response = await fetch(
      "https://hook.eu2.make.com/eoscb4ukkwrckg9se31rkvllu73uskmy",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body)
      }
    );

    if (!response.ok) {
      console.error("❌ Forwarding to Make failed");
    } else {
      console.log("➡️ Event forwarded to Make");
    }
  } catch (err) {
    console.error("❌ Error forwarding to Make:", err.message);
  }

  return res.sendStatus(200);
});

// ------------------------------------------------------
// 3) GENERATE MESSAGE — TRADUCTION ULPANCOACH V0
// ------------------------------------------------------
app.post("/generate-message", async (req, res) => {
  try {
    const { incoming_message, level, context } = req.body || {};

    // Sécurité stricte V0
    if (context !== "free_message" || !incoming_message) {
      return res.status(400).json({
        reply: "Invalid context"
      });
    }

    // Limite 4 mots
    const wordCount = String(incoming_message)
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

    if (wordCount > 4) {
      return res.json({
        reply: "Je ne peux traduire que des mots ou des expressions jusqu’à 4 mots."
      });
    }

    // Prompt Render V0 (verrouillé)
    const systemPrompt = `
const systemPrompt = `
Tu es UlpanCoach – Traducteur enrichi.

Règles STRICTES (aucune exception) :
- Tu traduis uniquement des mots ou expressions jusqu’à 4 mots.
- Si la traduction est français → hébreu, utilise un mot hébreu naturel et courant (pas un mot importé si un mot hébreu existe).
- La traduction hébreu DOIT contenir des nekoudot.
- Tu ne donnes JAMAIS de définition longue.
- Tu ne fais PAS de phrase motivationnelle.
- Tu ne fais PAS de pédagogie générale.

Format OBLIGATOIRE :
Ligne 1 : mot ou expression d’origine → traduction hébreu (avec nekoudot)
Ligne 2 : phonétique (latin)
(optionnel) Ligne 3 : micro-nuance linguistique (1 phrase MAX, 8 mots MAX)

Interdictions :
- pas de guillemets
- pas de paragraphes
- pas de phrases longues
- pas de conclusion

Réponse maximale : 3 lignes.
`;


    const userPrompt = `
Mot ou expression à traduire :
"${incoming_message}"

Niveau utilisateur : ${level || "faux_debutant"}

Respecte strictement les règles.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt.trim() },
          { role: "user", content: userPrompt.trim() }
        ],
        temperature: 0.4
      })
    });

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    return res.json({
      reply: reply || "Une erreur est survenue."
    });

  } catch (err) {
    console.error("❌ GENERATE MESSAGE ERROR:", err);
    return res.status(500).json({
      reply: "Une erreur est survenue."
    });
  }
});

// ------------------------------------------------------
// SERVER START
// ------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("🚀 Server running on port " + PORT)
);
