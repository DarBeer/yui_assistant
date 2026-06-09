"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const telegraf_1 = require("telegraf");
const genai_1 = require("@google/genai");
require("dotenv/config");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.GEMINI_API_KEY) {
    console.error('[error]: не заполнены токены в файде .env');
    process.exit(1);
}
const bot = new telegraf_1.Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// Мидлвар для работы с JSON-телом запросов
app.use(express_1.default.json());
bot.start((ctx) => {
    ctx.reply(`Привет, ${ctx.from.first_name}! Я умный бот на базе Gemini AI. Спроси меня о чём угодно!`);
});
bot.help((ctx) => {
    ctx.reply('Спрашивай, что хочешь c:');
});
// Реагируем на любое текстовое сообщение
bot.on('text', async (ctx) => {
    const userMessage = ctx.message.text;
    try {
        // Отправляем уведомление, что бот "печатает" ответ
        await ctx.sendChatAction('typing');
        // Запускаем стриминг от Gemini API
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: userMessage,
        });
        let fullResponse = '';
        let messageId = null;
        let lastUpdateTime = Date.now();
        // Читаем поток данных от ИИ по кусочкам
        for await (const chunk of responseStream) {
            const chunkText = chunk.text;
            if (!chunkText)
                continue;
            fullResponse += chunkText;
            // Если это самый первый кусочек, отправляем новое сообщение
            if (messageId === null) {
                const sentMessage = await ctx.reply(fullResponse);
                messageId = sentMessage.message_id;
                lastUpdateTime = Date.now();
            }
            else {
                // Ограничиваем частоту обновлений в Telegram (не чаще чем раз в 1 секунду),
                // чтобы не поймать ошибку "Too Many Requests" (429)
                if (Date.now() - lastUpdateTime > 1000) {
                    try {
                        await ctx.telegram.editMessageText(ctx.chat.id, messageId, undefined, fullResponse + ' ▌' // Добавляем красивый курсор в конец
                        );
                        lastUpdateTime = Date.now();
                    }
                    catch (editError) {
                        // Игнорируем ошибки, если текст не изменился
                        console.log('[Bot Wait]: Пропуск анимации кадра');
                    }
                }
            }
        }
        //Финальное обновление: убираем курсор «▌», когда текст полностью готов
        if (messageId !== null) {
            await ctx.telegram.editMessageText(ctx.chat.id, messageId, undefined, fullResponse);
        }
    }
    catch (error) {
        console.error('[Gemini Stream Error]:', error);
        await ctx.reply('Произошла ошибка при генерации ответа. Попробуйте ещё раз.');
    }
});
// Базовый эндпоинт сервера для проверки
app.get('/', (req, res) => {
    res.json({ message: 'Сервер, Бот и Gemini API успешно работают вместе!' });
});
// Запуск Express сервера
app.listen(PORT, () => {
    console.log(`[server]: Сервер запущен на http://localhost:${PORT}`);
});
// Запуск Телеграм-бота (Long Polling)
bot.launch()
    .then(() => console.log('[bot]: Телеграм-бот успешно запущен!'))
    .catch((err) => console.error('[bot]: Ошибка запуска бота:', err));
// Вежливая остановка бота при выключении сервера
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
