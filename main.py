import discord
from discord.ext import commands
import json

TOKEN = "DEIN_TOKEN_HIER"

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="_", intents=intents)

# ================= FILES =================

TICKET_FILE = "ticket_config.json"
STAFF_FILE = "staff.json"

# ================= LOAD / SAVE =================

def load_config():
    try:
        with open(TICKET_FILE, "r") as f:
            return json.load(f)
    except:
        return {}

def save_config(data):
    with open(TICKET_FILE, "w") as f:
        json.dump(data, f, indent=4)

def load_staff():
    try:
        with open(STAFF_FILE, "r") as f:
            return json.load(f)
    except:
        return {}

def save_staff(data):
    with open(STAFF_FILE, "w") as f:
        json.dump(data, f, indent=4)

config = load_config()
staff_data = load_staff()

# ================= STAFF CHECK =================

def is_staff(member):
    guild_id = str(member.guild.id)

    if guild_id not in staff_data:
        return False

    return any(role.id in staff_data[guild_id] for role in member.roles)

# ================= READY =================

@bot.event
async def on_ready():
    print(f"🔥 Ticket Bot online als {bot.user}")
    bot.add_view(TicketPanel())
    bot.add_view(TicketControls())

# ================= STAFF SETTINGS =================

@bot.command()
async def settingstaff(ctx, action: str, role: discord.Role = None):

    if not ctx.author.guild_permissions.administrator:
        return await ctx.send("❌ Keine Rechte")

    guild_id = str(ctx.guild.id)

    if guild_id not in staff_data:
        staff_data[guild_id] = []

    if action == "add" and role:
        if role.id not in staff_data[guild_id]:
            staff_data[guild_id].append(role.id)
            save_staff(staff_data)
            return await ctx.send(f"✅ {role.mention} hinzugefügt")

    if action == "remove" and role:
        if role.id in staff_data[guild_id]:
            staff_data[guild_id].remove(role.id)
            save_staff(staff_data)
            return await ctx.send(f"🗑️ {role.mention} entfernt")

    if action == "list":
        roles = [ctx.guild.get_role(r) for r in staff_data[guild_id]]
        text = "\n".join([r.mention for r in roles if r]) or "Keine Rollen"
        return await ctx.send(f"📋 Staff Rollen:\n{text}")

    await ctx.send("⚠️ Nutzung: _settingstaff add/remove/list @rolle")

# ================= TICKET SETUP =================

@bot.command()
async def ticketsetup(ctx, support_role: discord.Role, admin_role: discord.Role,
                      support_cat: discord.CategoryChannel,
                      admin_cat: discord.CategoryChannel,
                      log_channel: discord.TextChannel):

    if not ctx.author.guild_permissions.administrator:
        return await ctx.send("❌ Keine Rechte")

    config[str(ctx.guild.id)] = {
        "support_role": support_role.id,
        "admin_role": admin_role.id,
        "support_category": support_cat.id,
        "admin_category": admin_cat.id,
        "logs": log_channel.id
    }

    save_config(config)

    await ctx.send("✅ Ticket System eingerichtet")

# ================= PANEL =================

class TicketPanel(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="🎫 Support Ticket", style=discord.ButtonStyle.green, custom_id="support_ticket")
    async def support(self, interaction: discord.Interaction, button: discord.ui.Button):
        await create_ticket(interaction, "support")

    @discord.ui.button(label="🔒 Admin Ticket", style=discord.ButtonStyle.red, custom_id="admin_ticket")
    async def admin(self, interaction: discord.Interaction, button: discord.ui.Button):
        await create_ticket(interaction, "admin")

# ================= CREATE =================

async def create_ticket(interaction, typ):

    guild = interaction.guild
    user = interaction.user
    data = config.get(str(guild.id))

    if not data:
        return await interaction.response.send_message("❌ Setup fehlt", ephemeral=True)

    if typ == "support":
        role = guild.get_role(data["support_role"])
        category = guild.get_channel(data["support_category"])

    elif typ == "admin":
        admin_role = guild.get_role(data["admin_role"])

        if admin_role not in user.roles:
            return await interaction.response.send_message(
                "❌ Kein Zugriff auf Admin Tickets",
                ephemeral=True
            )

        role = admin_role
        category = guild.get_channel(data["admin_category"])

    overwrites = {
        guild.default_role: discord.PermissionOverwrite(view_channel=False),
        user: discord.PermissionOverwrite(view_channel=True, send_messages=True),
        role: discord.PermissionOverwrite(view_channel=True, send_messages=True)
    }

    channel = await guild.create_text_channel(
        name=f"ticket-{user.name}",
        overwrites=overwrites,
        category=category
    )

    embed = discord.Embed(
        title="🎫 Ticket",
        description="🔒 Claim das Ticket oder füge User hinzu",
        color=discord.Color.blurple()
    )

    await channel.send(content=user.mention, embed=embed, view=TicketControls())

    await interaction.response.send_message(f"✅ Ticket erstellt: {channel.mention}", ephemeral=True)

# ================= CONTROLS =================

class TicketControls(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)
        self.claimer = None

    @discord.ui.button(label="🔒 Claim", style=discord.ButtonStyle.primary, custom_id="claim_ticket")
    async def claim(self, interaction: discord.Interaction, button: discord.ui.Button):

        if not is_staff(interaction.user):
            return await interaction.response.send_message("❌ Kein Teammitglied", ephemeral=True)

        if self.claimer:
            return await interaction.response.send_message("❌ Bereits geclaimed", ephemeral=True)

        self.claimer = interaction.user

        for member in interaction.channel.members:
            if member.bot:
                continue
            if member != interaction.user:
                await interaction.channel.set_permissions(member, send_messages=False)

        await interaction.channel.set_permissions(interaction.user, send_messages=True)

        await interaction.response.send_message(f"🔒 {interaction.user.mention} hat das Ticket übernommen")

    @discord.ui.button(label="➕ Add User", style=discord.ButtonStyle.secondary, custom_id="add_user")
    async def add(self, interaction: discord.Interaction, button: discord.ui.Button):

        if not is_staff(interaction.user):
            return await interaction.response.send_message("❌ Kein Teammitglied", ephemeral=True)

        await interaction.response.send_message("👤 Schreib: _add @user", ephemeral=True)

    @discord.ui.button(label="❌ Close", style=discord.ButtonStyle.danger, custom_id="close_ticket")
    async def close(self, interaction: discord.Interaction, button: discord.ui.Button):

        if not is_staff(interaction.user):
            return await interaction.response.send_message("❌ Kein Teammitglied", ephemeral=True)

        messages = [msg async for msg in interaction.channel.history(limit=200)]
        transcript = "\n".join([f"{m.author}: {m.content}" for m in messages[::-1]])

        with open("transcript.txt", "w", encoding="utf-8") as f:
            f.write(transcript)

        log_channel = interaction.guild.get_channel(
            config[str(interaction.guild.id)]["logs"]
        )

        await log_channel.send(
            content=f"📁 Transcript: {interaction.channel.name}",
            file=discord.File("transcript.txt")
        )

        await interaction.channel.delete()

# ================= ADD COMMAND =================

@bot.command()
async def add(ctx, member: discord.Member):

    if not ctx.channel.name.startswith("ticket-"):
        return

    if not is_staff(ctx.author):
        return await ctx.send("❌ Kein Teammitglied")

    await ctx.channel.set_permissions(member, view_channel=True, send_messages=True)

    await ctx.send(f"✅ {member.mention} hinzugefügt")

# ================= PANEL COMMAND =================

@bot.command()
async def panel(ctx):

    embed = discord.Embed(
        title="🎫 Ticket System",
        description="Wähle dein Ticket:",
        color=discord.Color.blurple()
    )

    await ctx.send(embed=embed, view=TicketPanel())

# ================= RUN =================

bot.run(TOKEN)
