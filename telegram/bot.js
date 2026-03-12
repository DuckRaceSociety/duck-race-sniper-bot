import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

function mainMenu(){

return Markup.inlineKeyboard([

[
Markup.button.callback("💰 Wallet","wallet"),
Markup.button.callback("📈 Positions","positions")
],

[
Markup.button.callback("🚀 Buy Token","buy"),
Markup.button.callback("📉 Sell Token","sell")
],

[
Markup.button.callback("🤖 Sniper","sniper"),
Markup.button.callback("📋 Copy Trade","copy")
],

[
Markup.button.callback("⚙ Settings","settings"),
Markup.button.callback("📊 Profit","profit")
]

]);

}

bot.start((ctx)=>{

ctx.reply(

`🦆 Duck Race Trading Bot

Wallet: Not Connected
Balance: 0 SOL

──────────────

Select Action`,

mainMenu()

);

});

bot.action("wallet",(ctx)=>{
ctx.reply("💰 Wallet Menu coming soon");
});

bot.action("positions",(ctx)=>{
ctx.reply("📈 No open positions");
});

bot.action("buy",(ctx)=>{
ctx.reply("🚀 Buy Token interface coming soon");
});

bot.action("sell",(ctx)=>{
ctx.reply("📉 Sell Token interface coming soon");
});

bot.action("sniper",(ctx)=>{
ctx.reply("🤖 Sniper engine coming soon");
});

bot.action("copy",(ctx)=>{
ctx.reply("📋 Copy trading coming soon");
});

bot.action("settings",(ctx)=>{
ctx.reply("⚙ Settings menu coming soon");
});

bot.action("profit",(ctx)=>{
ctx.reply("📊 Profit dashboard coming soon");
});

export function startTelegramBot(){
bot.launch();
console.log("🦆 Duck Telegram Interface gestartet");
}
