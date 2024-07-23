const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT;

const bot = new TelegramBot(token, { polling: true });

const fs = require('fs');

const ytdl = require('@distube/ytdl-core');

const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(
        chatId,
        'Welcome to yt-opium bot, enter youtube link to get your audio'
    );
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    if (messageText.includes('youtube.com')) {
        bot.sendMessage(
            chatId,
            'Загрузка видео началась пожалуйста дождитесь пока видео загрузиться!'
        );

        const videoId = ytdl.getURLVideoID(messageText);

        const downloadLink = `https://www.youtube.com/watch?v=${videoId}`;

        const downloadPath = `./video_${videoId}.mp4`;
        const downloadStream = ytdl(downloadLink, {
            quality: 'lowest',
        });

        const fileStream = fs.createWriteStream(downloadPath);

        downloadStream.pipe(fileStream);

        downloadStream.on('end', () => {
            bot.sendMessage(
                chatId,
                'Файл загрузился, пожалуйста дождитесь пока бот извлечет аудио.'
            );

            const outputAudio = `./audio_${videoId}.mp3`;

            ffmpeg(downloadPath)
                .output(outputAudio)
                .noVideo()
                .on('end', () => {
                    bot.sendMessage(chatId, 'Файл отправляеться...');

                    const data = fs.readFileSync(outputAudio);

                    bot.sendAudio(chatId, data).then(() => {
                        fs.unlinkSync(downloadPath);
                        fs.unlinkSync(outputAudio);
                    });
                })
                .on('error', () => {
                    fs.unlinkSync(downloadPath);
                    fs.unlinkSync(outputAudio);

                    bot.sendMessage(
                        chatId,
                        'Что то пошло не так когда файл извлекался!'
                    );
                })
                .run();
        });

        downloadStream.on('error', (error) => {
            bot.sendMessage(chatId, 'Поток сломался');
        });
    }
});
