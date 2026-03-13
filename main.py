import discord
from discord.ext import commands
import os
import json

TOKEN = os.getenv("TOKEN")
OWNER_ID = 1459266420490764308  # Deine User ID

intents = discord.Intents.all()
bot = commands.Bot(command_prefix=",,", intents=intents)

WHITELIST_FILE = "whitelist.json"

# ================= LOAD / SAVE =================

def load_whitelist():
    try:
        with open(WHITELIST_FILE, "r") as f:
            return json.load(f)
    except:
        return []

def save_whitelist(data):
    with open(WHITELIST_FILE, "w") as f:
        json.dump(data, f)

whitelisted_users = load_whitelist()

# ================= READY =================

@bot.event
async def on_ready():
    print(f"Security Bot online als {bot.user}")

# ================= WHITELIST COMMAND =================

@bot.command()
async def whitelist(ctx, member: discord.Member):
    if ctx.author.id != OWNER_ID:
        return

    if str(member.id) not in whitelisted_users:
        whitelisted_users.append(str(member.id))
        save_whitelist(whitelisted_users)
        await ctx.send(f"✅ {member.mention} ist jetzt whitelisted.")
    else:
        await ctx.send("⚠️ User ist bereits whitelisted.")

# ================= BOT ADD PROTECTION =================

@bot.event
async def on_member_join(member):

    if not member.bot:
        return

    await discord.utils.sleep_until(discord.utils.utcnow())

    async for entry in member.guild.audit_logs(limit=5, action=discord.AuditLogAction.bot_add):
        if entry.target.id == member.id:

            adder = entry.user

            # OWNER darf niemals gebannt werden
            if adder.id == OWNER_ID:
                return

            if str(adder.id) in whitelisted_users:
                return

            try:
                await member.guild.ban(adder, reason="Nicht erlaubtes Bot hinzufügen")
            except:
                pass

            try:
                await adder.send("🚫 Du wurdest gebannt, weil du unerlaubt einen Bot hinzugefügt hast.")
            except:
                pass

            try:
                owner = await bot.fetch_user(OWNER_ID)
                await owner.send(f"🚨 {adder} hat versucht einen Bot hinzuzufügen und wurde gebannt.")
            except:
                pass

            break

@bot.event
async def on_guild_update(before, after):

    # Vanity hat sich geändert
    if before.vanity_url_code != after.vanity_url_code:

        async for entry in after.audit_logs(limit=5, action=discord.AuditLogAction.guild_update):

            user = entry.user

            # Owner ist geschützt
            if user.id == OWNER_ID:
                return

            # Whitelist geschützt
            if str(user.id) in whitelisted_users:
                return

            # Vanity zurücksetzen
            try:
                await after.edit(vanity_url_code=before.vanity_url_code)
            except:
                pass

            # User bannen
            try:
                await after.ban(user, reason="Vanity URL ändern verboten")
            except:
                pass

            # Täter DM
            try:
                await user.send("🚫 Du wurdest gebannt weil du versucht hast die Server Vanity zu ändern.")
            except:
                pass

            # Owner informieren
            try:
                owner = await bot.fetch_user(OWNER_ID)
                await owner.send(
                    f"🚨 {user} hat versucht die Vanity zu ändern und wurde gebannt."
                )
            except:
                pass

            break

# ================= START =================

bot.run(TOKEN)
