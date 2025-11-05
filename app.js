import express from "express";
import fetch from "node-fetch";

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
app.listen(PORT, () => console.log("Server running on port " + PORT));
