const TelegramBot = require('node-telegram-bot-api');
const { EmbedBuilder, WebhookClient } = require('discord.js');


const bot = new TelegramBot(process.env.TELEGRAM_API_KEY, { polling: false });
const webhookClient = new WebhookClient({ id: process.env.DISCORD_ID, token: process.env.DISCORD_TOKEN });

async function sendMessage(chatId, message) {
    if (chatId) {
        bot.sendMessage(chatId, message, { parse_mode: "HTML", disable_web_page_preview: true }).catch((error) => {
            console.log(error.code);  // => 'ETELEGRAM'
            console.log(error.response.body); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }
        });
    }

}

async function sendDiscordMessage(data) {
    const embed = new EmbedBuilder()
        .setTitle(data['name'] + ' ' + data['icon'])
        .setThumbnail("https://oldschool.runescape.wiki/images/a/a2/" + data['name'].replaceAll(" ", "_") + ".png")
        .setColor(0x00FFFF)
        .setURL(data['url'])
        .setTimestamp(Date.now())
        .addFields(
            {name: 'Average', value: data['avg'] + '', inline: true},
            {name: 'currentPrice', value: data['currentPrice'] + '', inline: true},
            {name: 'percentage', value: data['percentage'] + '%', inline: true},
            {name: 'count', value: data['count'] + '', inline: false},
        )

    webhookClient.send({
        username: 'OSRS Price Drop!',
        avatarURL: 'https://i.imgur.com/AfFp7pu.png',
        embeds: [embed],
    });
}


module.exports = {
    sendMessage: sendMessage,
    sendDiscordMessage: sendDiscordMessage
};