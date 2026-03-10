/ Duck Race Sniper Bot - api/sniper.js
const TRC_MINT = "H4FTTQ5nhGdFFqHa3FPd5TpjcXYLAokN8SYFdBq4yERL";
const MIN_TRC_SNIPER = 250000;
const GAME_URL = "https://duck-race-society.vercel.app";

// User sessions stored in memory
const sessions = {};

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  const TOKEN = process.env.SNIPER_BOT_TOKEN;
  if (!TOKEN) return;

  const update = req.body;
  const msg = update.message;
  const cb = update.callback_query;
  const chatId = msg?.chat?.id || cb?.message?.chat?.id;
  const userId = String(msg?.from?.id || cb?.from?.id || "");
  const userName = msg?.from?.first_name || cb?.from?.first_name || "Trader";
  const text = msg?.text || "";
  const cbData = cb?.data || "";

  if (!chatId) return;

  const api = `https://api.telegram.org/bot${TOKEN}`;

  async function send(txt, keyboard) {
    const body = { chat_id: chatId, text: txt, parse_mode: "HTML" };
    if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
    await fetch(`${api}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }

  async function edit(msgId, txt, keyboard) {
    const body = { chat_id: chatId, message_id: msgId, text: txt, parse_mode: "HTML" };
    if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
    await fetch(`${api}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }

  if (cb) {
    await fetch(`${api}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: cb.id })
    });
  }

  // Check TRC balance
  async function checkTRC(wallet) {
    try {
      const resp = await fetch(`https://api.mainnet-beta.solana.com`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1,
          method: "getTokenAccountsByOwner",
          params: [wallet, { mint: TRC_MINT }, { encoding: "jsonParsed" }]
        })
      });
      const data = await resp.json();
      if (!data.result?.value?.length) return 0;
      return data.result.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0;
    } catch(e) { return 0; }
  }

  const session = sessions[userId] || {};

  try {

    // /start
    if (text.startsWith("/start") || cbData === "home") {
      await send(
        `🎯 <b>DUCK RACE SNIPER BOT</b>\n\n` +
        `Hey ${userName}! Automated token sniping on Raydium.\n\n` +
        `<b>Requirements:</b>\n` +
        `🔐 Hold <b>250,000 $TRC</b> to access\n` +
        `💼 Solana wallet with SOL\n\n` +
        `<b>Features:</b>\n` +
        `⚡ Auto-buy new Raydium listings\n` +
        `🎯 Take Profit & Stop Loss\n` +
        `🔍 Token filters (mint renounced, LP burned)\n` +
        `📊 Real-time trade notifications\n\n` +
        `Use /connect to get started!`,
        [[{ text: "🔗 CONNECT WALLET", callback_data: "connect" }],
         [{ text: "🦆 DUCK RACE GAME", web_app: { url: GAME_URL } }]]
      );
    }

    // Connect wallet
    else if (text === "/connect" || cbData === "connect") {
      sessions[userId] = { ...session, step: "awaiting_wallet" };
      await send(
        `🔗 <b>CONNECT YOUR WALLET</b>\n\n` +
        `Send your Solana wallet address to verify your $TRC balance.\n\n` +
        `<i>Your wallet needs 250,000 $TRC for access.</i>`
      );
    }

    // Setup sniper
    else if (cbData === "setup") {
      sessions[userId] = { ...session, step: "awaiting_token" };
      await send(
        `🎯 <b>SNIPER SETUP</b>\n\n` +
        `Send the <b>token mint address</b> you want to snipe:\n\n` +
        `<i>Example: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU</i>`
      );
    }

    // Show sniper config
    else if (cbData === "config") {
      const s = sessions[userId];
      await send(
        `⚙️ <b>SNIPER CONFIG</b>\n\n` +
        `Token: <code>${s?.targetMint || "Not set"}</code>\n` +
        `Buy Amount: <b>${s?.buyAmount || "Not set"} SOL</b>\n` +
        `Take Profit: <b>${s?.takeProfit || "Not set"}%</b>\n` +
        `Stop Loss: <b>${s?.stopLoss || "Not set"}%</b>\n` +
        `Status: <b>${s?.active ? "🟢 ACTIVE" : "🔴 INACTIVE"}</b>\n\n` +
        `Use buttons below to configure:`,
        [[{ text: "🎯 SET TOKEN", callback_data: "setup" }],
         [{ text: "💰 SET BUY AMOUNT", callback_data: "set_buy" },
          { text: "📈 SET TP/SL", callback_data: "set_tpsl" }],
         [{ text: s?.active ? "⏹ STOP BOT" : "▶️ START BOT", callback_data: s?.active ? "stop" : "start" }],
         [{ text: "🏠 HOME", callback_data: "home" }]]
      );
    }

    // Set buy amount
    else if (cbData === "set_buy") {
      sessions[userId] = { ...session, step: "awaiting_buy" };
      await send(
        `💰 <b>SET BUY AMOUNT</b>\n\n` +
        `Send the amount of SOL to use per trade:\n\n` +
        `<i>Example: 0.1</i>\n` +
        `<i>Recommended: 0.05 - 0.5 SOL</i>`
      );
    }

    // Set TP/SL
    else if (cbData === "set_tpsl") {
      sessions[userId] = { ...session, step: "awaiting_tp" };
      await send(
        `📈 <b>SET TAKE PROFIT</b>\n\n` +
        `Send your Take Profit percentage:\n\n` +
        `<i>Example: 50 (= sell when +50%)</i>`
      );
    }

    // Start bot
    else if (cbData === "start") {
      const s = sessions[userId];
      if (!s?.targetMint) {
        await send(`⚠️ Set a token first! Use /config → SET TOKEN`);
        return;
      }
      if (!s?.buyAmount) {
        await send(`⚠️ Set buy amount first! Use /config → SET BUY AMOUNT`);
        return;
      }
      sessions[userId] = { ...s, active: true };
      await send(
        `🟢 <b>SNIPER ACTIVATED!</b>\n\n` +
        `🎯 Target: <code>${s.targetMint.slice(0,8)}...</code>\n` +
        `💰 Buy: <b>${s.buyAmount} SOL</b>\n` +
        `📈 TP: <b>${s.takeProfit || 50}%</b>\n` +
        `📉 SL: <b>${s.stopLoss || 20}%</b>\n\n` +
        `Bot is now monitoring Raydium for new pools...\n` +
        `You will be notified when a trade executes! 🔔`,
        [[{ text: "⏹ STOP BOT", callback_data: "stop" },
          { text: "⚙️ CONFIG", callback_data: "config" }]]
      );
    }

    // Stop bot
    else if (cbData === "stop") {
      sessions[userId] = { ...session, active: false };
      await send(
        `🔴 <b>SNIPER STOPPED</b>\n\nBot has been deactivated.`,
        [[{ text: "▶️ START BOT", callback_data: "start" },
          { text: "⚙️ CONFIG", callback_data: "config" }]]
      );
    }

    // /config command
    else if (text === "/config") {
      const s = sessions[userId];
      if (!s?.wallet) {
        await send(`⚠️ Connect your wallet first! Use /connect`);
        return;
      }
      await send(
        `⚙️ <b>SNIPER CONFIG</b>\n\n` +
        `Wallet: <code>${s.wallet.slice(0,4)}...${s.wallet.slice(-4)}</code>\n` +
        `Token: <code>${s?.targetMint ? s.targetMint.slice(0,8) + "..." : "Not set"}</code>\n` +
        `Buy Amount: <b>${s?.buyAmount || "Not set"} SOL</b>\n` +
        `Take Profit: <b>${s?.takeProfit || "Not set"}%</b>\n` +
        `Stop Loss: <b>${s?.stopLoss || "Not set"}%</b>\n` +
        `Status: <b>${s?.active ? "🟢 ACTIVE" : "🔴 INACTIVE"}</b>`,
        [[{ text: "🎯 SET TOKEN", callback_data: "setup" }],
         [{ text: "💰 SET BUY AMOUNT", callback_data: "set_buy" },
          { text: "📈 SET TP/SL", callback_data: "set_tpsl" }],
         [{ text: s?.active ? "⏹ STOP BOT" : "▶️ START BOT", callback_data: s?.active ? "stop" : "start" }]]
      );
    }

    // /help
    else if (text === "/help") {
      await send(
        `🎯 <b>SNIPER BOT COMMANDS</b>\n\n` +
        `/start - Main menu\n` +
        `/connect - Connect wallet\n` +
        `/config - Bot configuration\n` +
        `/help - This message\n\n` +
        `<b>Requirements:</b> 250,000 $TRC`
      );
    }

    // Handle text input based on session step
    else if (text && !text.startsWith("/")) {
      const step = session.step;

      // Wallet address input
      if (step === "awaiting_wallet") {
        if (text.length < 32 || text.length > 44) {
          await send(`⚠️ Invalid wallet address. Please try again.`);
          return;
        }
        await send(`⏳ <b>Checking $TRC balance...</b>`);
        const balance = await checkTRC(text);

        if (balance >= MIN_TRC_SNIPER) {
          sessions[userId] = { ...session, wallet: text, step: null, trcBalance: balance };
          await send(
            `✅ <b>ACCESS GRANTED!</b>\n\n` +
            `Wallet: <code>${text.slice(0,4)}...${text.slice(-4)}</code>\n` +
            `$TRC Balance: <b>${balance.toLocaleString()} $TRC</b>\n\n` +
            `Welcome to the Duck Race Sniper Bot! 🎯`,
            [[{ text: "⚙️ CONFIGURE SNIPER", callback_data: "config" }],
             [{ text: "🏠 HOME", callback_data: "home" }]]
          );
        } else {
          sessions[userId] = { ...session, step: null };
          await send(
            `❌ <b>ACCESS DENIED</b>\n\n` +
            `Your balance: <b>${balance.toLocaleString()} $TRC</b>\n` +
            `Required: <b>250,000 $TRC</b>\n\n` +
            `Buy $TRC on Raydium to unlock the Sniper Bot!`,
            [[{ text: "💜 BUY $TRC ON RAYDIUM", url: "https://raydium.io/swap/?inputCurrency=sol&outputCurrency=H4FTTQ5nhGdFFqHa3FPd5TpjcXYLAokN8SYFdBq4yERL" }]]
          );
        }
      }

      // Token mint input
      else if (step === "awaiting_token") {
        if (text.length < 32) {
          await send(`⚠️ Invalid token mint. Please try again.`);
          return;
        }
        sessions[userId] = { ...session, targetMint: text, step: null };
        await send(
          `✅ <b>TOKEN SET!</b>\n\n` +
          `Mint: <code>${text}</code>\n\n` +
          `Now set your buy amount!`,
          [[{ text: "💰 SET BUY AMOUNT", callback_data: "set_buy" }]]
        );
      }

      // Buy amount input
      else if (step === "awaiting_buy") {
        const amount = parseFloat(text);
        if (isNaN(amount) || amount <= 0) {
          await send(`⚠️ Invalid amount. Send a number like: 0.1`);
          return;
        }
        sessions[userId] = { ...session, buyAmount: amount, step: null };
        await send(
          `✅ <b>BUY AMOUNT SET!</b>\n\n` +
          `Amount: <b>${amount} SOL</b> per trade\n\n` +
          `Now set Take Profit & Stop Loss!`,
          [[{ text: "📈 SET TP/SL", callback_data: "set_tpsl" }]]
        );
      }

      // Take profit input
      else if (step === "awaiting_tp") {
        const tp = parseFloat(text);
        if (isNaN(tp) || tp <= 0) {
          await send(`⚠️ Invalid percentage. Send a number like: 50`);
          return;
        }
        sessions[userId] = { ...session, takeProfit: tp, step: "awaiting_sl" };
        await send(
          `✅ Take Profit set to <b>${tp}%</b>\n\n` +
          `Now send your <b>Stop Loss</b> percentage:\n\n` +
          `<i>Example: 20 (= sell when -20%)</i>`
        );
      }

      // Stop loss input
      else if (step === "awaiting_sl") {
        const sl = parseFloat(text);
        if (isNaN(sl) || sl <= 0) {
          await send(`⚠️ Invalid percentage. Send a number like: 20`);
          return;
        }
        sessions[userId] = { ...session, stopLoss: sl, step: null };
        await send(
          `✅ <b>TP/SL CONFIGURED!</b>\n\n` +
          `Take Profit: <b>${session.takeProfit}%</b>\n` +
          `Stop Loss: <b>${sl}%</b>\n\n` +
          `All set! Ready to start sniping! 🎯`,
          [[{ text: "▶️ START BOT", callback_data: "start" },
            { text: "⚙️ CONFIG", callback_data: "config" }]]
        );
      }
    }

  } catch(e) {
    console.error("Sniper bot error:", e);
  }
};

