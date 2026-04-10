import discord
from discord.ext import commands
import aiosqlite
import asyncio
import os
from pathlib import Path

# ──────────────────────────────────────────────

# Prefix fetcher  (per-guild, fallback = “,”)

# ──────────────────────────────────────────────

async def get_prefix(bot, message):
if not message.guild:
return “,”
async with aiosqlite.connect(“database.db”) as db:
async with db.execute(
“SELECT prefix FROM guild_settings WHERE guild_id = ?”,
(message.guild.id,)
) as cur:
row = await cur.fetchone()
return row[0] if row else “,”

# ──────────────────────────────────────────────

# Bot setup

# ──────────────────────────────────────────────

intents = discord.Intents.all()
bot = commands.Bot(command_prefix=get_prefix, intents=intents, help_command=None)
bot.remove_command(“help”)

# ──────────────────────────────────────────────

# DB initialisation

# ──────────────────────────────────────────────

async def init_db():
async with aiosqlite.connect(“database.db”) as db:
await db.executescript(”””
CREATE TABLE IF NOT EXISTS guild_settings (
guild_id   INTEGER PRIMARY KEY,
prefix     TEXT DEFAULT ‘,’
);
CREATE TABLE IF NOT EXISTS users (
user_id    INTEGER,
guild_id   INTEGER,
xp         INTEGER DEFAULT 0,
level      INTEGER DEFAULT 1,
balance    INTEGER DEFAULT 0,
PRIMARY KEY (user_id, guild_id)
);
CREATE TABLE IF NOT EXISTS warnings (
id         INTEGER PRIMARY KEY AUTOINCREMENT,
guild_id   INTEGER,
user_id    INTEGER,
moderator  INTEGER,
reason     TEXT,
timestamp  TEXT DEFAULT (datetime(‘now’))
);
CREATE TABLE IF NOT EXISTS tickets (
ticket_id      INTEGER PRIMARY KEY AUTOINCREMENT,
guild_id       INTEGER,
channel_id     INTEGER,
user_id        INTEGER,
status         TEXT DEFAULT ‘open’,
created_at     TEXT DEFAULT (datetime(‘now’))
);
CREATE TABLE IF NOT EXISTS welcome_settings (
guild_id       INTEGER PRIMARY KEY,
channel_id     INTEGER,
message        TEXT DEFAULT ‘Welcome {user} to {server}!’,
role_id        INTEGER
);
CREATE TABLE IF NOT EXISTS mod_logs (
id             INTEGER PRIMARY KEY AUTOINCREMENT,
guild_id       INTEGER,
action         TEXT,
moderator_id   INTEGER,
target_id      INTEGER,
reason         TEXT,
timestamp      TEXT DEFAULT (datetime(‘now’))
);
“””)
await db.commit()

# ──────────────────────────────────────────────

# Load all cogs

# ──────────────────────────────────────────────

async def load_cogs():
cog_dir = Path(“cogs”)
for cog_file in cog_dir.glob(”*.py”):
cog_name = f”cogs.{cog_file.stem}”
try:
await bot.load_extension(cog_name)
print(f”  ✓ Loaded {cog_name}”)
except Exception as e:
print(f”  ✗ Failed {cog_name}: {e}”)

# ──────────────────────────────────────────────

# Events

# ──────────────────────────────────────────────

@bot.event
async def on_ready():
await bot.change_presence(
activity=discord.Activity(
type=discord.ActivityType.watching,
name=f”{len(bot.guilds)} servers | ,help”
)
)
print(f”\n{’=’*40}”)
print(f”  Bot online: {bot.user}”)
print(f”  Guilds: {len(bot.guilds)}”)
print(f”  Commands: {len(bot.commands)}”)
print(f”{’=’*40}\n”)

@bot.event
async def on_guild_join(guild):
async with aiosqlite.connect(“database.db”) as db:
await db.execute(
“INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)”,
(guild.id,)
)
await db.commit()

# ──────────────────────────────────────────────

# Entry point

# ──────────────────────────────────────────────

async def main():
await init_db()
await load_cogs()
TOKEN = os.getenv(“DISCORD_TOKEN”, “YOUR_TOKEN_HERE”)
await bot.start(TOKEN)

if **name** == “**main**”:
asyncio.run(main())
