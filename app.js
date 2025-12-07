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

console.log("✅ User loaded:", user);

// TEMP: réponse de test
return res.json({
  status: "ok",
  debug: "User loaded from Supabase",
  user,
});

app.listen(PORT, () => console.log("Server running on port " + PORT));
