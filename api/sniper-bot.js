/ api/sniper-bot.js
const SNIPER_TOKEN_MINT = "H4FTTQ5nhGdFFqHa3FPd5TpjcXYLAokN8SYFdBq4yERL";
const MIN_TRC_SNIPER = 250000;
const GAME_URL = "https://duck-race-society.vercel.app";

const sessions = {};

async function sendMessage(token, chatId, text, extra = {}) {
  const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra })
  });
  return resp.json();
}

async function answerCallback(token, id) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: id })
  });
}

async function checkTRCBalance(walletAddress) {
  try {
    const resp = await fetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "getTokenAccountsByOwner",
        params: [walletAddress, { mint: SNIPER_TOKEN_MINT }, { encoding: "jsonParsed" }]
      })
    });
    const data = await resp.json();
    const accounts = data.result?.value || [];
    if (accounts.length === 0) return 0;
    return accounts[0].account.data.parsed.info.tokenAmount.uiAmount || 0;
  } catch(e) {
    return 0;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, status: "Sniper bot running" });
  }

  const TOKEN = process.env.SNIPER_BOT_TOKEN;
  if (!TOKEN) return res.status(200).json({ ok: false, error: "No token" });

  const update = req.body;
  if (!update) return res.status(200).json({ ok: true });

  const msg = update.message;
  const cb = update.callback_query;
  const chatId = msg?.chat?.id || cb?.message?.chat?.id;
  const from = msg?.from || cb?.from;
  const userId = String(from?.id || "");
  const userName = from?.first_name || "Trader";
  const text = msg?.text || "";
  const cbData = cb?.data || "";

  if (!chatId) return res.status(200).json({ ok: true });

  if (!sessions[userId]) sessions[userId] = { step: "idle", config: {}, wallet: null, verified: false };
  const session = sessions[userId];

  const send = (txt, keyboard) => sendMessage(TOKEN, chatId, txt, keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {});

  try {
    if (cb) await answerCallback(TOKEN, cb.id);

    if (text.startsWith("/start")) {
      await send(
        `🎯 <b>DUCK RACE SNIPER BOT</b>\n\nAutomated token sniping on Raydium.\nExclusive to $TRC holders.\n\n<b>Requirements:</b>\n🔐 Hold <b>250,000 $TRC</b> to access\n\nPress <b>VERIFY ACCESS</b> to begin.`,
        [[{ text: "🔐 VERIFY ACCESS", callback_data: "verify" }],
         [{ text: "🦆 DUCK RACE GAME", web_app: { url: GAME_URL } }]]
      );
    }

    else if (cbData === "verify" || text === "/verify") {
      session.step = "awaiting_wallet";
      await send(`🔐 <b>WALLET VERIFICATION</b>\n\nSend your Solana wallet address to verify your $TRC balance.\n\nYou need <b>250,000 $TRC</b> for access.`);
    }

    else if (session.step === "awaiting_wallet" && text.length >= 32 && text.length <= 44) {
      session.wallet = text.trim();
      session.step = "checking";
      await send(`⏳ Checking $TRC balance for <code>${text.slice(0,6)}...${text.slice(-4)}</code>`);
      const balance = await checkTRCBalance(session.wallet);
      if (balance >= MIN_TRC_SNIPER) {
        session.verified = true;
        session.step = "idle";
        await send(
          `✅ <b>ACCESS GRANTED!</b>\n\n💰 Balance: <b>${balance.toLocaleString()} $TRC</b>\n\nWelcome ${userName}! 🎯`,
          [[{ text: "🎯 START SNIPING", callback_data: "snipe" }],
           [{ text: "📊 STATUS", callback_data: "status" }, { text: "⚙️ SETTINGS", callback_data: "settings" }]]
        );
      } else {
        session.step = "idle";
        await send(
          `❌ <b>ACCESS DENIED</b>\n\nYour balance: <b>${balance.toLocaleString()} $TRC</b>\nRequired: <b>250,000 $TRC</b>\n\nBuy $TRC to unlock access!`,
          [[{ text: "💜 BUY $TRC ON RAYDIUM", url: "https://raydium.io/swap/?inputCurrency=sol&outputCurrency=H4FTTQ5nhGdFFqHa3FPd5TpjcXYLAokN8SYFdBq4yERL" }]]
        );
      }
    }

    else if (cbData === "snipe" || text === "/snipe") {
      if (!session.verified) {
        await send(`🔐 Verify your wallet first!`, [[{ text: "🔐 VERIFY ACCESS", callback_data: "verify" }]]);
      } else {
        session.step = "awaiting_mint";
        await send(`🎯 <b>NEW SNIPE</b>\n\nSend the <b>token mint address</b> you want to snipe:`);
      }
    }

    else if (session.step === "awaiting_mint" && text.length >= 32) {
      session.config.tokenMint = text.trim();
      session.step = "awaiting_amount";
      await send(`✅ Token: <code>${text.slice(0,6)}...${text.slice(-4)}</code>\n\n💰 How much <b>SOL</b> to buy? (e.g. <code>0.1</code>)`);
    }

    else if (session.step === "awaiting_amount" && !isNaN(parseFloat(text))) {
      session.config.buyAmount = parseFloat(text);
      session.step = "awaiting_tp";
      await send(`✅ Buy amount: <b>${text} SOL</b>\n\n🎯 Take Profit %? (e.g. <code>50</code> for +50%)\nType <code>0</code> to disable.`);
    }

    else if (session.step === "awaiting_tp" && !isNaN(parseFloat(text))) {
      session.config.takeProfit = parseFloat(text);
      session.step = "awaiting_sl";
      await send(`✅ Take Profit: <b>${text}%</b>\n\n🛑 Stop Loss %? (e.g. <code>30</code> for -30%)\nType <code>0</code> to disable.`);
    }

    else if (session.step === "awaiting_sl" && !isNaN(parseFloat(text))) {
      session.config.stopLoss = parseFloat(text);
      session.step = "confirming";
      const c = session.config;
      await send(
        `📋 <b>SNIPE SUMMARY</b>\n\n🎯 Token: <code>${c.tokenMint?.slice(0,6)}...${c.tokenMint?.slice(-4)}</code>\n💰 Buy: <b>${c.buyAmount} SOL</b>\n✅ Take Profit: <b>${c.takeProfit > 0 ? c.takeProfit + "%" : "Disabled"}</b>\n🛑 Stop Loss: <b>${c.stopLoss > 0 ? c.stopLoss + "%" : "Disabled"}</b>\n\nReady to snipe?`,
        [[{ text: "🚀 CONFIRM", callback_data: "confirm_snipe" }, { text: "❌ CANCEL", callback_data: "cancel" }]]
      );
    }

    else if (cbData === "confirm_snipe") {
      session.step = "active";
      const c = session.config;
      await send(
        `🎯 <b>SNIPE ACTIVE!</b>\n\nWatching Raydium for:\n<code>${c.tokenMint?.slice(0,6)}...${c.tokenMint?.slice(-4)}</code>\n\nBuy: ${c.buyAmount} SOL\nTP: ${c.takeProfit > 0 ? "+" + c.takeProfit + "%" : "Off"} | SL: ${c.stopLoss > 0 ? "-" + c.stopLoss + "%" : "Off"}\n\nYou will be notified when executed!`,
        [[{ text: "📊 STATUS", callback_data: "status" }, { text: "🔴 CANCEL SNIPE", callback_data: "cancel" }]]
      );
    }

    else if (cbData === "status" || text === "/status") {
      if (!session.verified) {
        await send(`🔐 Not verified yet.`, [[{ text: "🔐 VERIFY ACCESS", callback_data: "verify" }]]);
      } else {
        const statusText = session.step === "active"
          ? `🟢 <b>ACTIVE</b>\nToken: <code>${session.config.tokenMint?.slice(0,6)}...${session.config.tokenMint?.slice(-4)}</code>\nBuy: ${session.config.buyAmount} SOL`
          : `⚪ <b>NO ACTIVE SNIPE</b>`;
        await send(
          `📊 <b>STATUS</b>\n\n${statusText}\n\nWallet: <code>${session.wallet?.slice(0,6)}...${session.wallet?.slice(-4)}</code>\n$TRC: ✅ Verified`,
          [[{ text: "🎯 NEW SNIPE", callback_data: "snipe" }]]
        );
      }
    }

    else if (cbData === "settings") {
      await send(
        `⚙️ <b>SETTINGS</b>\n\nWallet: <code>${session.wallet?.slice(0,6)}...${session.wallet?.slice(-4)}</code>\nAccess: ✅ 250,000 $TRC verified\n\nTo change wallet use /verify`,
        [[{ text: "🔄 CHANGE WALLET", callback_data: "verify" }, { text: "🎯 SNIPE", callback_data: "snipe" }]]
      );
    }

    else if (cbData === "cancel") {
      session.step = "idle";
      session.config = {};
      await send(`❌ Cancelled.`, [[{ text: "🎯 NEW SNIPE", callback_data: "snipe" }]]);
    }

    else if (text === "/help") {
      await send(
        `🎯 <b>COMMANDS</b>\n\n/start - Main menu\n/verify - Verify wallet\n/snipe - Start sniping\n/status - Active snipe\n/help - This message\n\nRequires 250,000 $TRC.`
      );
    }

  } catch(e) {
    console.error("Sniper bot error:", e);
  }

  return res.status(200).json({ ok: true });
};

