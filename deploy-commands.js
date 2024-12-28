require('dotenv').config();

const { REST, Routes } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

// Token bot của bạn và ID ứng dụng
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// Danh sách các lệnh
const commands = [
    new SlashCommandBuilder()
        .setName('gacha')
        .setDescription('Thực hiện roll n lần')
        .addIntegerOption(option =>
            option.setName('rolls')
                .setDescription('Số lần roll (mặc định là 10)')
                .setRequired(false)
        ),
    new SlashCommandBuilder()
        .setName('resetpity')
        .setDescription('Reset pity và lịch sử roll'),
    new SlashCommandBuilder()
        .setName('bag')
        .setDescription('Hiển thị 5* roll được'),
].map(command => command.toJSON());

// Đăng ký lệnh
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('⏳ Bắt đầu đăng ký các lệnh...');
	await rest.put(
    		Routes.applicationCommands(CLIENT_ID), 
    		{ body: commands }
	);
	console.log('✅ Đăng ký lệnh thành công!');
    } catch (error) {
        console.error('❌ Có lỗi xảy ra:', error);
    }
})();
