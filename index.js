import dotenv from "dotenv";
import { startTelegramBot } from "./telegram/bot.js";

dotenv.config();

console.log("🦆 Duck Race Sniper Bot startet...");

startTelegramBot();
