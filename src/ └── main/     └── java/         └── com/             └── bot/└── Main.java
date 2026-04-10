package com.bot;

import net.dv8tion.jda.api.JDA;
import net.dv8tion.jda.api.JDABuilder;
import net.dv8tion.jda.api.OnlineStatus;
import net.dv8tion.jda.api.requests.GatewayIntent;

public class Main {
    public static void main(String[] args) throws Exception {
        String token = System.getenv("DISCORD_TOKEN");
        
        if (token == null || token.isEmpty()) {
            System.err.println("ERROR: DISCORD_TOKEN not found!");
            System.err.println("Please set the DISCORD_TOKEN environment variable.");
            return;
        }
        
        System.out.println("Starting Location Security Bot...");
        
        JDA jda = JDABuilder.createDefault(token)
            .enableIntents(
                GatewayIntent.MESSAGE_CONTENT,
                GatewayIntent.GUILD_MESSAGES,
                GatewayIntent.GUILD_MEMBERS
            )
            .setStatus(OnlineStatus.ONLINE)
            .build();
        
        jda.awaitReady();
        
        System.out.println("========================================");
        System.out.println("✅ Bot is online!");
        System.out.println("📡 Logged in as: " + jda.getSelfUser().getName());
        System.out.println("🆔 Bot ID: " + jda.getSelfUser().getId());
        System.out.println("========================================");
    }
}
