bot.start((ctx) => {
import { createWallet } from "../wallet/createWallet.js"
ctx.reply(
`🦆 Duck Trading Bot

Wallet: Not Connected
Balance: 0 SOL

Welcome to Duck Sniper.`,

{
reply_markup: {
inline_keyboard: [

[{ text: "💰 Wallet", callback_data: "wallet" }],

[
{ text: "🚀 Buy", callback_data: "buy" },
{ text: "📉 Sell", callback_data: "sell" }
],

[
{ text: "🤖 Sniper", callback_data: "sniper" },
{ text: "📋 Copy Trade", callback_data: "copy" }
],

[
{ text: "📊 Profit", callback_data: "profit" },
{ text: "⚙ Settings", callback_data: "settings" }
]

]
}
})

})

export function startTelegramBot(){
bot.launch();
console.log("🦆 Duck Telegram Interface gestartet");
}
