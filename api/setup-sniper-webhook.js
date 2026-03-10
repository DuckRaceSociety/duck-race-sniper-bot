// api/setup-sniper-webhook.js
module.exports = async function handler(req, res) {
  const TOKEN = process.env.SNIPER_BOT_TOKEN;
  const url = `https://duck-race-society.vercel.app/api/sniper`;
  
  const resp = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, allowed_updates: ["message", "callback_query"] })
  });
  const data = await resp.json();
  res.status(200).json(data);
};
