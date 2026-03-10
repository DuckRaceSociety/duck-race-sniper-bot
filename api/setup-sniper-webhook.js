// api/setup-sniper-webhook.js
module.exports = async function handler(req, res) {
  const TOKEN = process.env.SNIPER_BOT_TOKEN;
  const WEBHOOK_URL = "https://duck-race-sniper-bot.vercel.app/api/sniper-bot";
  
  const resp = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: WEBHOOK_URL })
  });
  const data = await resp.json();
  res.status(200).json(data);
};

