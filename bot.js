require('dotenv').config(); // Đọc tệp .env

const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
const { InteractionType } = require('discord.js');

const token = process.env.DISCORD_TOKEN;

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const users = {};

const PITY_5 = 80;
const PITY_4 = 10;
const BASE_RATE_5 = 0.008;
const BASE_RATE_4 = 0.06;
const BASE_RATE_3 = 0.932;
const RATE_UP_5_STAR = "Carlotta";
const DEVIATED_5_STARS = ["Verina", "Cancharo", "Anko", "Danxin", "Linhdan"];

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
        if (this.count5Star == 0)
            return 0;
        if (this.last5StarDeviated)
            return (100 - (this.count5StarDeviated / (this.count5StarRateUp + 1) * 100)).toFixed(2);
        if (this.count5StarRateUp >= this.count5StarDeviated)
            return (100 - (this.count5StarDeviated / this.count5StarRateUp * 100)).toFixed(2);
    }
}

function simulateGacha(user, totalRolls) {
    const results = [];
    let highestStar = 3;
    const r = Math.random;

    user.totalRolls += totalRolls;

    const currentRoll5StarResults = [];

    for (let i = 1; i <= totalRolls; i++) {
        user.pity5++;
        user.pity4++;
        let rate5 = BASE_RATE_5;
        let rate4 = BASE_RATE_4;
        let rate3 = BASE_RATE_3;

        if (user.pity5 > 65) {
            rate5 += (user.pity5 - 65) * ((100 - 0.08) / (80 - 65)) / 100;
            rate4 = (BASE_RATE_4 / (BASE_RATE_4 + BASE_RATE_3)) * (1 - rate5);
            rate3 = (BASE_RATE_3 / (BASE_RATE_4 + BASE_RATE_3)) * (1 - rate5);
        }

        const roll = r();
        if (roll < rate5 || user.pity5 >= PITY_5) {
            highestStar = 5;
            const deviated = r() < 0.5;
            if (deviated && !user.last5StarDeviated) {
                const deviatedCharacter = DEVIATED_5_STARS[Math.floor(r() * DEVIATED_5_STARS.length)];
                results.push(`**✨ 5★ Sadge: ${deviatedCharacter} (Pity: ${user.pity5})**`);
                user.fiveStarDetails.push(deviatedCharacter);
                currentRoll5StarResults.push(deviatedCharacter);
                user.last5StarDeviated = true;
                user.count5StarDeviated++;
            } else {
                results.push(`**🌟🌟🌟 5★ Rate Up: ${RATE_UP_5_STAR} (Pity: ${user.pity5}) 🎉**`);
                user.fiveStarDetails.push(RATE_UP_5_STAR);
                currentRoll5StarResults.push(RATE_UP_5_STAR);
                user.last5StarDeviated = false;
                user.count5StarRateUp++;
            }
            user.pity5 = 0;
            user.pity4 = 0;
            user.count5Star++;
        } else if (roll < rate5 + rate4 || user.pity4 >= PITY_4) {
            highestStar = Math.max(highestStar, 4);
            results.push(`**⭐ 4★**`);
            user.pity4 = 0;
            user.count4Star++;
        } else {
            results.push(`3★`);
            user.count3Star++;
        }
    }

    return { results, highestStar, currentRoll5StarResults };
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function showGachaResults(interaction, user, results, rolls, highestStar, currentRoll5StarResults) {
    const isInteraction = interaction.isInteraction; 
    const target = isInteraction ? interaction : interaction.channel; 
    if (rolls > 100) {
        const rateUpCount = results.filter(res => res.includes("Rate Up")).length;
        const deviatedCount = results.filter(res => res.includes("Sadge")).length;

        const totalFiveStarsThisRoll = results.filter(res => res.includes("5★")).length;
        const totalFourStarsThisRoll = results.filter(res => res.includes("4★")).length;
        const totalThreeStarsThisRoll = results.filter(res => res.includes("3★")).length;

        const response = `
🎰 **${user.name}'s Gacha Summary** 🎰
- **Total rolls this time:** ${rolls}
- **Total 5★ this time:** ${totalFiveStarsThisRoll} (Rate Up: ${rateUpCount}, Lệch: ${deviatedCount})
- **Total 4★ this time:** ${totalFourStarsThisRoll}
- **Total 3★ this time:** ${totalThreeStarsThisRoll}

📋 **5★ Characters Obtained:**
${currentRoll5StarResults.map((char, idx) => `#${idx + 1}: ${char}`).join('\n')}

📊 **Stats:**
- 5★ pity: ${user.pity5}
- Total rolls: ${user.totalRolls}
- Total 5★: ${user.count5Star}
- 5★ Rate: ${user.getFiveStarRate()}%
- Win rate: ${user.getWinRate()}%
- Total 5★ Rate Up: ${user.count5StarRateUp}
- Total 5★ lệch: ${user.count5StarDeviated}
- Total 4★: ${user.count4Star}
- Total 3★: ${user.count3Star}`;

        if (isInteraction) {
            await target.editReply(response);  
        } else {
            await target.send(response); 
        }
    } else {
        const response = `
🎰 **${user.name}'s Gacha Results** 🎰
${results.map((res, idx) => `Roll ${idx + 1}: ${res}`).join('\n')}

📊 **Stats:**
- 5★ pity: ${user.pity5}
- Total rolls: ${user.totalRolls}
- Total 5★: ${user.count5Star}
- 5★ Rate: ${user.getFiveStarRate()}%
- Win rate: ${user.getWinRate()}%
- Total 5★ Rate Up: ${user.count5StarRateUp}
- Total 5★ lệch: ${user.count5StarDeviated}
- Total 4★: ${user.count4Star}
- Total 3★: ${user.count3Star}`;

        if (isInteraction) {
            await target.editReply(response); 
        } else {
            await target.send(response);
        }
    }
}

// Xử lý slash command
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'gacha') {
        const rolls = interaction.options.getInteger('rolls') || 10;
        const userId = interaction.user.id;

        if (!users[userId]) {
            users[userId] = new User(interaction.user.username);
        }
        const user = users[userId];

        await interaction.reply("Tèo teo... teo tèo teo teo téo.....");

        const { results, highestStar, currentRoll5StarResults } = simulateGacha(user, rolls);

        let initialMessage = "🟦...";
        let secondMessage = highestStar >= 4 ? "🟪 **!**" : null;
        let finalMessage = highestStar === 5 ? "🟨 **✨✨✨**" : null;

        await delay(700); 
        await interaction.editReply("🟦...");
        if (secondMessage) {
            await delay(600);
            await interaction.editReply(secondMessage);
        }
        if (finalMessage) {
            await delay(700); 
            await interaction.editReply(finalMessage);
        }
        await delay(500)
        showGachaResults(interaction, user, results, rolls, highestStar, currentRoll5StarResults);
    } else if (commandName === 'resetpity') {
        const userId = interaction.user.id;
        if (users[userId]) {
            users[userId].reset();
            await interaction.reply(`🔄 **${interaction.user.username}**, lịch sử gacha của bạn đã được đặt lại!`);
        } else {
            await interaction.reply(`⚠️ **${interaction.user.username}**, bạn chưa có lịch sử gacha để đặt lại!`);
        }
    } else if (commandName === 'bag') {
        const userId = interaction.user.id;
        if (users[userId]) {
            const user = users[userId];
            const rateUp = user.fiveStarDetails.filter(char => char === RATE_UP_5_STAR);
            const deviated = user.fiveStarDetails.filter(char => DEVIATED_5_STARS.includes(char));

            const sortedBag = [...rateUp, ...deviated];
            const bagMessage = sortedBag.length > 0 ? sortedBag.join('\n') : "Chưa có nhân vật trong túi gacha.";

            await interaction.reply(`🎒 **${user.name}'s Gacha Bag** 🎒\n${bagMessage}`);
        } else {
            await interaction.reply(`⚠️ **${interaction.user.username}**, bạn chưa thực hiện gacha nào!`);
        }
    }
});


// Sự kiện sẵn sàng
client.once('ready', () => {
    console.log(`Bot đã sẵn sàng! Đăng nhập dưới tên: ${client.user.tag}`);
});

// Xử lý tin nhắn
client.on('messageCreate', async (message) => {
    if (message.content.startsWith('/gacha')) {
        const args = message.content.split(' ');
        const rolls = parseInt(args[1]) || 10; // Mặc định roll 10 nếu không nhập số

        // Lấy hoặc tạo người dùng
        const userId = message.author.id;
        if (!users[userId]) {
            users[userId] = new User(message.author.username);
        }

        const user = users[userId];

        const sentMess = await message.reply("Tèo teo... teo tèo teo teo téo.....");

        const { results, highestStar, currentRoll5StarResults } = simulateGacha(user, rolls);

        let initialMessage = "🟦...";
        let secondMessage = highestStar >= 4 ? "🟪 **!**" : null;
        let finalMessage = highestStar === 5 ? "🟨 **✨✨✨**" : null;

        await delay(700); 
        await sentMess.edit("🟦...");
        if (secondMessage) {
            await delay(600);
            await sentMess.edit(secondMessage);
        }
        if (finalMessage) {
            await delay(700); 
            await sentMess.edit(finalMessage);
        }
        await delay(500)
        showGachaResults(sentMess, user, results, rolls, highestStar, currentRoll5StarResults);
    } else 
    if (message.content === '/resetpity') {
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

            message.channel.send(`🎒 **${user.name}'s Gacha Bag** 🎒\n${bagMessage}`);
        } else {
            message.channel.send(`⚠️ **${message.author.username}**, bạn chưa thực hiện gacha nào!`);
        }
    }
});

client.login(token);
