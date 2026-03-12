import { Telegraf } from "telegraf"
import dotenv from "dotenv"
import { createWallet } from "../wallet/createWallet.js"

dotenv.config()

export function startTelegramBot() {

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

console.log("🦆 Duck Telegram Interface gestartet")

bot.start(async (ctx) => {

await ctx.reply(

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

bot.action("wallet", async (ctx) => {

const wallet = createWallet()

await ctx.reply(

`💰 Duck Wallet Created

Address:
${wallet.publicKey}

⚠️ Save your private key safely.`

)

})

bot.launch()

}
export function startTelegramBot(){
bot.launch();
console.log("🦆 Duck Telegram Interface gestartet");
}
