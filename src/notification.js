const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.TELEGRAM_API_KEY, { polling: false });


async function sendMessage(chatId, message) {
    if(chatId){
        bot.sendMessage(chatId, message, {parse_mode: "HTML", disable_web_page_preview: true}).catch((error) => {
            console.log(error.code);  // => 'ETELEGRAM'
            console.log(error.response.body); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }
          });
    }
    
}


module.exports = {
    sendMessage: sendMessage,
};