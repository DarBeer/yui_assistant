import dns from 'dns';
dns.setServers([
  '1.1.1.1', // Cloudflare (Первичный)
  '8.8.8.8', // Google (Вторичный)
  '8.8.4.4', // Geegle (Второчиный резерв)
  '1.0.0.1'  // Cloudflare (Резервный)
]);
console.log('[system]: Установлены кастомные DNS-серверы');

// ТЕПЕРЬ ИМПОРТИРУЕМ ВСЕ ОСТАЛЬНЫЕ МОДУЛИ
import express, { Request, Response } from 'express';
import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.GEMINI_API_KEY) {
  console.error('[error]: Не заполнены токены в файле .env!');
  process.exit(1);
}

// Инициализация клиентов
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(express.json());

// Функции для форматирования текста в HTML
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function markdownToHtml(markdown: string): string {
  let html = escapeHtml(markdown);
  html = html.replace(/```(?:[a-zA-Z0-9]+)?\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<b>$1</b>');
  html = html.replace(/\*([\s\S]*?)\*/g, '<i>$1</i>');
  return html;
}

// Логика обработки сообщений бота
bot.on(message('text'), async (ctx) => {
  const userMessage = ctx.message.text;

  try {
    await ctx.sendChatAction('typing');

    // Благодаря модулю dns, этот запрос пойдет через резолверы 1.1.1.1
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: userMessage,
    });

    let fullResponse = '';
    let messageId: number | null = null;
    let lastUpdateTime = 0;
    const UPDATE_INTERVAL = 1200; 

    for await (const chunk of responseStream) {
      const chunkText = chunk.text;
      if (!chunkText) continue;

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
          } else {
            currentHtml += ' ▌';
          }

          await ctx.telegram.editMessageText(
            ctx.chat.id,
            messageId,
            undefined,
            currentHtml,
            { parse_mode: 'HTML' }
          );
          lastUpdateTime = now;
        } catch (editError: any) {
          if (!editError.description?.includes('message is not modified')) {
            console.error('[Edit Error]:', editError.description);
          }
        }
      }
    }

    if (messageId !== null) {
      const finalHtml = markdownToHtml(fullResponse);
      await ctx.telegram.editMessageText(ctx.chat.id, messageId, undefined, finalHtml, { parse_mode: 'HTML' }).catch(() => {});
    }

  } catch (error) {
    console.error('[Gemini Network/Stream Error]:', error);
    await ctx.reply('Не удалось получить ответ от ИИ. Проверьте сетевое подключение сервера.');
  }
});

// Базовый роут сервера
app.get('/', (req: Request, res: Response) => {
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