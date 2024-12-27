require('dotenv').config(); // Đọc tệp .env

const { Client, GatewayIntentBits } = require('discord.js');

const token = process.env.DISCORD_TOKEN;

// Tạo client Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Cơ sở dữ liệu người dùng
const users = {};

// Constants
const PITY_5 = 80;
const PITY_4 = 10;
const BASE_RATE_5 = 0.005;
const BASE_RATE_4 = 0.15;
const BASE_RATE_3 = 0.845;
const RATE_UP_5_STAR = "Carlotta";
const DEVIATED_5_STARS = ["Verina", "Cancharo", "Anko", "Danxin", "Linhdan"];

// Class User
class User {
    constructor(name) {
        this.name = name;
        this.pity5 = 0;
        this.pity4 = 0;
        this.last5StarDeviated = false;
        this.count5Star = 0;
        this.count5StarRateUp = 0;
        this.count5StarDeviated = 0;
        this.count4Star = 0;
        this.count3Star = 0;
        this.totalRolls = 0;
        this.fiveStarDetails = [];
    }

    reset() {
        this.pity5 = 0;
        this.pity4 = 0;
        this.last5StarDeviated = false;
        this.count5Star = 0;
        this.count5StarRateUp = 0;
        this.count5StarDeviated = 0;
        this.count4Star = 0;
        this.count3Star = 0;
        this.totalRolls = 0;
        this.fiveStarDetails = [];
    }

    getFiveStarRate() {
        return (this.count5Star / this.totalRolls * 100).toFixed(2);
    }

    getWinRate() {
        return this.count5Star ? (this.count5StarRateUp / this.count5Star * 100).toFixed(2) : 0;
    }
}

// Gacha simulation function
function simulateGacha(user, totalRolls) {
    const results = [];
    const r = Math.random;

    user.totalRolls += totalRolls;

    for (let i = 1; i <= totalRolls; i++) {
        user.pity5++;
        user.pity4++;
        let rate5 = BASE_RATE_5;
        let rate4 = BASE_RATE_4;
        let rate3 = BASE_RATE_3;

        if (user.pity5 > 65) {
            rate5 += (user.pity5 - 65) * 0.03;
            rate4 = (BASE_RATE_4 / (BASE_RATE_4 + BASE_RATE_3)) * (1 - rate5);
            rate3 = (BASE_RATE_3 / (BASE_RATE_4 + BASE_RATE_3)) * (1 - rate5);
        }

        const roll = r();
        if (roll < rate5 || user.pity5 >= PITY_5) {
            const deviated = r() < 0.5;
            if (deviated && !user.last5StarDeviated) {
                const deviatedCharacter = DEVIATED_5_STARS[Math.floor(r() * DEVIATED_5_STARS.length)];
                results.push(`**✨ 5★ Sadge: ${deviatedCharacter} (Pity: ${user.pity5})**`);
                user.fiveStarDetails.push(deviatedCharacter);
                user.last5StarDeviated = true;
                user.count5StarDeviated++;
            } else {
                results.push(`**🌟🌟🌟 5★ Rate Up: ${RATE_UP_5_STAR} (Pity: ${user.pity5}) 🎉**`);
                user.fiveStarDetails.push(RATE_UP_5_STAR);
                user.last5StarDeviated = false;
                user.count5StarRateUp++;
            }
            user.pity5 = 0;
            user.pity4 = 0;
            user.count5Star++;
        } else if (roll < rate5 + rate4 || user.pity4 >= PITY_4) {
            results.push(`**⭐ 4★**`);
            user.pity4 = 0;
            user.count4Star++;
        } else {
            results.push(`3★`);
            user.count3Star++;
        }
    }

    return results;
}

// Sự kiện sẵn sàng
client.once('ready', () => {
    console.log(`Bot đã sẵn sàng! Đăng nhập dưới tên: ${client.user.tag}`);
});

// Xử lý tin nhắn
client.on('messageCreate', (message) => {
    if (message.content.startsWith('/gacha')) {
        const args = message.content.split(' ');
        const rolls = parseInt(args[1]) || 10; // Mặc định roll 10 nếu không nhập số

        // Lấy hoặc tạo người dùng
        const userId = message.author.id;
        if (!users[userId]) {
            users[userId] = new User(message.author.username);
        }

        const user = users[userId];

        // Thực hiện gacha
        const results = simulateGacha(user, rolls);

        const deviatedCount = user.count5StarDeviated;
        const rateUpCount = user.count5StarRateUp;

        let response;
        if (rolls > 100) {
            const rateUpCount = results.filter(res => res.includes("Rate Up")).length;
            const deviatedCount = results.filter(res => res.includes("Sadge")).length;

            // Tính tổng số 5★, 4★ và 3★ trong lần roll hiện tại
            const totalFiveStarsThisRoll = results.filter(res => res.includes("5★")).length;
            const totalFourStarsThisRoll = results.filter(res => res.includes("4★")).length;
            const totalThreeStarsThisRoll = results.filter(res => res.includes("3★")).length;
            response = `🎰 **${user.name}'s Gacha Summary** 🎰
    - **Total rolls this time:** ${rolls}
    - **Total 5★ this time:** ${totalFiveStarsThisRoll} (Rate Up: ${rateUpCount}, Lệch: ${deviatedCount})
    - **Total 4★ this time:** ${totalFourStarsThisRoll}
    - **Total 3★ this time:** ${totalThreeStarsThisRoll}
    
    📋 **5★ Characters Obtained:**
    ${user.fiveStarDetails.slice(-rolls).map((char, idx) => `#${idx + 1}: ${char}`).join('\n')}
    
    📊 **Stats:**
    - 5★ pity: ${user.pity5}
    - Total rolls (all time): ${user.totalRolls}
    - Total 5★ (all time): ${user.count5Star}
    - 5★ Rate (all time): ${user.getFiveStarRate()}%
    - Win rate (all time): ${user.getWinRate()}%
    - Total 5★ Rate Up (all time): ${user.count5StarRateUp}
    - Total 5★ lệch (all time): ${user.count5StarDeviated}
    - Total 4★ (all time): ${user.count4Star}
    - Total 3★ (all time): ${user.count3Star}`;
        } else {
            response = `🎰 **${user.name}'s Gacha Results** 🎰
            ${results.map((res, idx) => `Roll ${idx + 1}: ${res}`).join('\n')}
    
    📊 **Stats:**
    - 5★ pity: ${user.pity5}
    - Total rolls (all time): ${user.totalRolls}
    - Total 5★ (all time): ${user.count5Star}
    - 5★ Rate (all time): ${user.getFiveStarRate()}%
    - Win rate (all time): ${user.getWinRate()}%
    - Total 5★ Rate Up (all time): ${user.count5StarRateUp}
    - Total 5★ lệch (all time): ${user.count5StarDeviated}
    - Total 4★ (all time): ${user.count4Star}
    - Total 3★ (all time): ${user.count3Star}`;
        }

        message.channel.send(response);
    } else if (message.content === '/resetpity') {
        const userId = message.author.id;
        if (users[userId]) {
            users[userId].reset();
            message.channel.send(`🔄 **${message.author.username}**, lịch sử gacha của bạn đã được đặt lại!`);
        } else {
            message.channel.send(`⚠️ **${message.author.username}**, bạn chưa có lịch sử gacha để đặt lại!`);
        }
    } else if (message.content === '/bag') {
        const userId = message.author.id;
        if (users[userId]) {
            const user = users[userId];
            const rateUp = user.fiveStarDetails.filter(char => char === RATE_UP_5_STAR);
            const deviated = user.fiveStarDetails.filter(char => DEVIATED_5_STARS.includes(char));

            const sortedBag = [...rateUp, ...deviated];
            const bagMessage = sortedBag.length > 0 ? sortedBag.join('\n') : "Chưa có nhân vật trong túi gacha.";

            message.channel.send(`🎒 **${user.name}'s Gacha Bag** 🎒
  ${bagMessage}`);
        } else {
            message.channel.send(`⚠️ **${message.author.username}**, bạn chưa thực hiện gacha nào!`);
        }
    }
});

// Đăng nhập bot
client.login(token);
