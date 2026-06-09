"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers([
    'dns.comss.one',
    '1.1.1.1', // Cloudflare (Первичный)
    '8.8.8.8', // Google (Вторичный)
    '1.0.0.1' // Cloudflare (Резервный)
]);
console.log('[system]: Установлены кастомные DNS-серверы');
// ТЕПЕРЬ ИМПОРТИРУЕМ ВСЕ ОСТАЛЬНЫЕ МОДУЛИ
const express_1 = __importDefault(require("express"));
const telegraf_1 = require("telegraf");
const filters_1 = require("telegraf/filters");
const genai_1 = require("@google/genai");
const dotenv = __importStar(require("dotenv"));
// Загружаем переменные окружения
dotenv.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.GEMINI_API_KEY) {
    console.error('[error]: Не заполнены токены в файле .env!');
    process.exit(1);
}
// Инициализация клиентов
const bot = new telegraf_1.Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
app.use(express_1.default.json());
// Функции для форматирования текста в HTML
function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function markdownToHtml(markdown) {
    let html = escapeHtml(markdown);
    html = html.replace(/```(?:[a-zA-Z0-9]+)?\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<b>$1</b>');
    html = html.replace(/\*([\s\S]*?)\*/g, '<i>$1</i>');
    return html;
}
// Логика обработки сообщений бота
bot.on((0, filters_1.message)('text'), async (ctx) => {
    const userMessage = ctx.message.text;
    try {
        await ctx.sendChatAction('typing');
        // Благодаря модулю dns, этот запрос пойдет через резолверы 1.1.1.1
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: userMessage,
        });
        let fullResponse = '';
        let messageId = null;
        let lastUpdateTime = 0;
        const UPDATE_INTERVAL = 1200;
        for await (const chunk of responseStream) {
            const chunkText = chunk.text;
            if (!chunkText)
                continue;
            fullResponse += chunkText;
            const now = Date.now();
            if (messageId === null) {
                const formattedText = markdownToHtml(fullResponse) + ' ▌';
                const sentMessage = await ctx.reply(formattedText, { parse_mode: 'HTML' });
                messageId = sentMessage.message_id;
                lastUpdateTime = now;
                continue;
            }
            if (now - lastUpdateTime > UPDATE_INTERVAL) {
                try {
                    let currentHtml = markdownToHtml(fullResponse);
                    if (currentHtml.endsWith('</code></pre>')) {
                        currentHtml = currentHtml.slice(0, -13) + ' ▌</code></pre>';
                    }
                    else {
                        currentHtml += ' ▌';
                    }
                    await ctx.telegram.editMessageText(ctx.chat.id, messageId, undefined, currentHtml, { parse_mode: 'HTML' });
                    lastUpdateTime = now;
                }
                catch (editError) {
                    if (!editError.description?.includes('message is not modified')) {
                        console.error('[Edit Error]:', editError.description);
                    }
                }
            }
        }
        if (messageId !== null) {
            const finalHtml = markdownToHtml(fullResponse);
            await ctx.telegram.editMessageText(ctx.chat.id, messageId, undefined, finalHtml, { parse_mode: 'HTML' }).catch(() => { });
        }
    }
    catch (error) {
        console.error('[Gemini Network/Stream Error]:', error);
        await ctx.reply('Не удалось получить ответ от ИИ. Проверьте сетевое подключение сервера.');
    }
});
// Базовый роут сервера
app.get('/', (req, res) => {
    res.json({ message: 'Сервер работает с кастомными настройками DNS!' });
});
app.listen(PORT, () => {
    console.log(`[server]: Сервер запущен на http://localhost:${PORT}`);
});
bot.launch()
    .then(() => console.log('[bot]: Телеграм-бот успешно запущен!'))
    .catch((err) => console.error('[bot]: Ошибка запуска бота:', err));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
