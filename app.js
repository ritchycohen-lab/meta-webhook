import express from "express";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const app = express();
app.use(express.json());

const VERIFY_TOKEN = "ulpancoach2025";

// Vérification du webhook Meta
app.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("WEBHOOK VERIFIED");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Réception des messages et redirection vers Make
app.post("/", async (req, res) => {
  console.log("New event received:", JSON.stringify(req.body, null, 2));

  try {
    const response = await fetch(
      "https://hook.eu2.make.com/eoscb4ukkwrckg9se31rkvllu73uskmy",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      }
    );

    if (!response.ok) {
      console.error("Forwarding failed:", response.statusText);
    } else {
      console.log("Forwarded successfully to Make");
    }
  } catch (err) {
    console.error("Error forwarding to Make:", err.message);
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
// Endpoint pour générer un message UlpanCoach (V0)
app.post("/generate-message", async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "Missing user_id" });
  }

  console.log("🆕 Generate message for user:", user_id);

 // 1. Récupérer le user dans Supabase
const { data: user, error } = await supabase
  .from("users")
  .select("*")
  .eq("id", user_id)
  .single();

if (error) {
  console.error("❌ Supabase user fetch error:", error);
  return res.status(500).json({ error: "Failed to fetch user" });
}

if (!user) {
  console.error("❌ User not found in Supabase");
  return res.status(404).json({ error: "User not found" });
}

// 2. Construire le prompt dynamique
const prompt = `
Tu es UlpanCoach, un coach bienveillant qui aide un élève à apprendre l'hébreu.
Voici les infos sur l'utilisateur :

- Nom : ${user.first_name || "non renseigné"}
- Niveau : ${user.level || "débutant"}
- Objectif : ${user.objective || "non spécifié"}
- Style de coach : ${user.coach_style || "bienveillant"}

Génère un message WhatsApp court (3–5 lignes) :
- motivant
- personnalisé
- avec un mini exercice simple et faisable en 2 minutes.
- ton très humain (pas robot)

Réponds uniquement avec le message final, pas de tags, pas d'explications.
`;

// 3. Appel OpenAI
try {
  const completion = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await completion.json();

  if (!completion.ok) {
    console.error("❌ OpenAI API error:", data);
    return res.status(500).json({ error: "OpenAI request failed" });
  }

  const finalMessage = data.choices?.[0]?.message?.content || null;

  if (!finalMessage) {
    return res.status(500).json({ error: "No message generated" });
  }

  // 4. Sauvegarde dans Supabase
  const { error: insertErr } = await supabase
    .from("messages")
    .insert({
      user_id,
      content: finalMessage,
      source: "daily"
    });

  if (insertErr) {
    console.error("❌ Supabase insert error:", insertErr);
  }

  // 5. Retourner à Make
  return res.json({
    status: "ok",
    message: finalMessage
  });

} catch (err) {
  console.error("❌ Error generating message:", err);
  return res.status(500).json({ error: "Internal server error" });
}


// TEMP: réponse de test
return res.json({
  status: "ok",
  debug: "User loaded from Supabase",
  user,
});
  });

app.listen(PORT, () => console.log("Server running on port " + PORT));
