// party-loot-discord-bot.js
require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  REST,
  Routes,
} = require("discord.js");
const axios = require("axios");

// Initialize Discord Bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// API Base URL
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

// Token cache for users
const userTokens = new Map();

// Setup commands
const commands = [
  new SlashCommandBuilder()
    .setName("login")
    .setDescription("Login to your Party Loot account")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("Your Party Loot username")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("password")
        .setDescription("Your Party Loot password")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("funds")
    .setDescription("View your party funds"),

  new SlashCommandBuilder()
    .setName("addfunds")
    .setDescription("Add funds to your party")
    .addIntegerOption((option) =>
      option
        .setName("platinum")
        .setDescription("Platinum amount")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option.setName("gold").setDescription("Gold amount").setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("silver")
        .setDescription("Silver amount")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("copper")
        .setDescription("Copper amount")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Description of the transaction")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("removefunds")
    .setDescription("Remove funds from your party")
    .addIntegerOption((option) =>
      option
        .setName("platinum")
        .setDescription("Platinum amount")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option.setName("gold").setDescription("Gold amount").setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("silver")
        .setDescription("Silver amount")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("copper")
        .setDescription("Copper amount")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Description of the transaction")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("items")
    .setDescription("List your party items"),

  new SlashCommandBuilder()
    .setName("additem")
    .setDescription("Add an item to your inventory")
    .addStringOption((option) =>
      option.setName("name").setDescription("Item name").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("owner")
        .setDescription("Who owns this item")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("source")
        .setDescription("Where the item came from")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("quantity")
        .setDescription("Item quantity")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("campaigns")
    .setDescription("List your campaigns"),

  new SlashCommandBuilder()
    .setName("setcampaign")
    .setDescription("Set your active campaign")
    .addStringOption((option) =>
      option
        .setName("campaign_id")
        .setDescription("Campaign ID to set as active")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("history")
    .setDescription("View recent fund history")
    .addIntegerOption((option) =>
      option
        .setName("limit")
        .setDescription("Number of entries to show")
        .setRequired(false)
    ),
];

// Register commands with Discord
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();

// Handle login command
async function handleLogin(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const username = interaction.options.getString("username");
  const password = interaction.options.getString("password");

  try {
    const response = await axios.post(`${API_BASE_URL}/api/login`, {
      username,
      password,
    });

    if (response.data.token) {
      // Store token in memory (for this session)
      userTokens.set(interaction.user.id, {
        token: response.data.token,
        userId: response.data.id,
        userGroupId: response.data.user_group_id,
        campaignId: response.data.default_campaign_id,
      });

      await interaction.editReply({
        content: "Successfully logged in to Party Loot!",
        ephemeral: true,
      });
    } else {
      await interaction.editReply({
        content: "Login failed. Please check your credentials.",
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error("Login error:", error.response?.data || error.message);
    await interaction.editReply({
      content: `Login failed: ${
        error.response?.data?.error || "Unknown error"
      }`,
      ephemeral: true,
    });
  }
}

// Get user token (checks if logged in)
function getUserToken(userId) {
  const userData = userTokens.get(userId);
  if (!userData) {
    return null;
  }
  return userData;
}

// Handle funds command
async function handleFunds(interaction) {
  await interaction.deferReply();

  const userData = getUserToken(interaction.user.id);
  if (!userData) {
    return await interaction.editReply(
      "You must be logged in. Use `/login` first."
    );
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/api/funds`, {
      headers: { Authorization: `Bearer ${userData.token}` },
    });

    if (response.data && response.data.length > 0) {
      const funds = response.data[0];

      const embed = new EmbedBuilder()
        .setTitle("Party Funds")
        .setColor(0xbd9a00)
        .addFields(
          { name: "Platinum", value: funds.platinum.toString(), inline: true },
          { name: "Gold", value: funds.gold.toString(), inline: true },
          { name: "Silver", value: funds.silver.toString(), inline: true },
          { name: "Copper", value: funds.copper.toString(), inline: true }
        )
        .setFooter({
          text: "Party Loot Bot",
          iconURL: "https://i.imgur.com/wSTFkRM.png",
        });

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply("No funds found for your campaign.");
    }
  } catch (error) {
    console.error("Funds error:", error.response?.data || error.message);
    await interaction.editReply(
      `Error fetching funds: ${error.response?.data?.error || "Unknown error"}`
    );
  }
}

// Handle add funds command
async function handleAddFunds(interaction) {
  await interaction.deferReply();

  const userData = getUserToken(interaction.user.id);
  if (!userData) {
    return await interaction.editReply(
      "You must be logged in. Use `/login` first."
    );
  }

  const platinum = interaction.options.getInteger("platinum") || 0;
  const gold = interaction.options.getInteger("gold") || 0;
  const silver = interaction.options.getInteger("silver") || 0;
  const copper = interaction.options.getInteger("copper") || 0;
  const description = interaction.options.getString("description");

  if (platinum + gold + silver + copper === 0) {
    return await interaction.editReply(
      "You must specify at least one currency amount."
    );
  }

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/fund-history`,
      {
        user_id: userData.userId,
        platinum,
        gold,
        silver,
        copper,
        description,
        subtract: false,
        user_group_id: userData.userGroupId,
        campaign_id: userData.campaignId,
      },
      {
        headers: { Authorization: `Bearer ${userData.token}` },
      }
    );

    if (response.data.success) {
      const embed = new EmbedBuilder()
        .setTitle("Funds Added")
        .setColor(0x00bb00)
        .setDescription(`Successfully added funds: ${description}`)
        .addFields(
          { name: "Platinum", value: platinum.toString(), inline: true },
          { name: "Gold", value: gold.toString(), inline: true },
          { name: "Silver", value: silver.toString(), inline: true },
          { name: "Copper", value: copper.toString(), inline: true }
        );

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply("Failed to add funds. Please try again.");
    }
  } catch (error) {
    console.error("Add funds error:", error.response?.data || error.message);
    await interaction.editReply(
      `Error adding funds: ${error.response?.data?.error || "Unknown error"}`
    );
  }
}

// Handle remove funds command
async function handleRemoveFunds(interaction) {
  await interaction.deferReply();

  const userData = getUserToken(interaction.user.id);
  if (!userData) {
    return await interaction.editReply(
      "You must be logged in. Use `/login` first."
    );
  }

  const platinum = interaction.options.getInteger("platinum") || 0;
  const gold = interaction.options.getInteger("gold") || 0;
  const silver = interaction.options.getInteger("silver") || 0;
  const copper = interaction.options.getInteger("copper") || 0;
  const description = interaction.options.getString("description");

  if (platinum + gold + silver + copper === 0) {
    return await interaction.editReply(
      "You must specify at least one currency amount."
    );
  }

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/fund-history`,
      {
        user_id: userData.userId,
        platinum,
        gold,
        silver,
        copper,
        description,
        subtract: true,
        user_group_id: userData.userGroupId,
        campaign_id: userData.campaignId,
      },
      {
        headers: { Authorization: `Bearer ${userData.token}` },
      }
    );

    if (response.data.success) {
      const embed = new EmbedBuilder()
        .setTitle("Funds Removed")
        .setColor(0xbb0000)
        .setDescription(`Successfully removed funds: ${description}`)
        .addFields(
          { name: "Platinum", value: platinum.toString(), inline: true },
          { name: "Gold", value: gold.toString(), inline: true },
          { name: "Silver", value: silver.toString(), inline: true },
          { name: "Copper", value: copper.toString(), inline: true }
        );

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply("Failed to remove funds. Please try again.");
    }
  } catch (error) {
    console.error("Remove funds error:", error.response?.data || error.message);

    // Check for insufficient funds error
    if (error.response?.data?.error?.includes("Insufficient funds")) {
      await interaction.editReply("Insufficient funds for this transaction.");
    } else {
      await interaction.editReply(
        `Error removing funds: ${
          error.response?.data?.error || "Unknown error"
        }`
      );
    }
  }
}

// Handle items command
async function handleItems(interaction) {
  await interaction.deferReply();

  const userData = getUserToken(interaction.user.id);
  if (!userData) {
    return await interaction.editReply(
      "You must be logged in. Use `/login` first."
    );
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/api/items`, {
      headers: { Authorization: `Bearer ${userData.token}` },
    });

    if (response.data && response.data.length > 0) {
      // Group items by owner
      const itemsByOwner = {};

      response.data.forEach((item) => {
        if (!itemsByOwner[item.owner]) {
          itemsByOwner[item.owner] = [];
        }
        itemsByOwner[item.owner].push(item);
      });

      // Create embeds for each owner (max 10 owners to avoid Discord limit)
      const embeds = [];
      const owners = Object.keys(itemsByOwner).slice(0, 10);

      owners.forEach((owner) => {
        const ownerItems = itemsByOwner[owner];
        const fields = ownerItems.slice(0, 10).map((item) => {
          // Format item value if it exists
          let valueText = "No Value";
          if (item.value) {
            valueText = `${item.value} ${item.value_type || "gp"}`;
          }

          return {
            name: `${item.name} x${item.quantity}`,
            value: `Source: ${item.source}\nValue: ${valueText}`,
            inline: true,
          };
        });

        const embed = new EmbedBuilder()
          .setTitle(`Items owned by ${owner}`)
          .setColor(0x0099ff)
          .addFields(...fields);

        embeds.push(embed);
      });

      if (embeds.length > 0) {
        await interaction.editReply({ embeds: [embeds[0]] });

        // If there are multiple embeds, send them as separate messages
        // to avoid Discord embed limit
        for (let i = 1; i < embeds.length; i++) {
          await interaction.followUp({ embeds: [embeds[i]] });
        }
      } else {
        await interaction.editReply("No items found for your campaign.");
      }
    } else {
      await interaction.editReply("No items found for your campaign.");
    }
  } catch (error) {
    console.error("Items error:", error.response?.data || error.message);
    await interaction.editReply(
      `Error fetching items: ${error.response?.data?.error || "Unknown error"}`
    );
  }
}

// Handle add item command
async function handleAddItem(interaction) {
  await interaction.deferReply();

  const userData = getUserToken(interaction.user.id);
  if (!userData) {
    return await interaction.editReply(
      "You must be logged in. Use `/login` first."
    );
  }

  const name = interaction.options.getString("name");
  const owner = interaction.options.getString("owner");
  const source = interaction.options.getString("source");
  const quantity = interaction.options.getInteger("quantity") || 1;

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/items`,
      {
        user_id: userData.userId,
        name,
        owner,
        quantity,
        source,
        user_group_id: userData.userGroupId,
        campaign_id: userData.campaignId,
      },
      {
        headers: { Authorization: `Bearer ${userData.token}` },
      }
    );

    if (response.data.success) {
      const embed = new EmbedBuilder()
        .setTitle("Item Added")
        .setColor(0x00bb00)
        .setDescription(`Successfully added ${quantity}x ${name}`)
        .addFields(
          { name: "Owner", value: owner, inline: true },
          { name: "Source", value: source, inline: true }
        );

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply("Failed to add item. Please try again.");
    }
  } catch (error) {
    console.error("Add item error:", error.response?.data || error.message);
    await interaction.editReply(
      `Error adding item: ${error.response?.data?.error || "Unknown error"}`
    );
  }
}

// Handle campaigns command
async function handleCampaigns(interaction) {
  await interaction.deferReply();

  const userData = getUserToken(interaction.user.id);
  if (!userData) {
    return await interaction.editReply(
      "You must be logged in. Use `/login` first."
    );
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/api/campaigns`, {
      headers: { Authorization: `Bearer ${userData.token}` },
    });

    if (response.data && response.data.length > 0) {
      const campaigns = response.data;

      const fields = campaigns.map((campaign) => {
        return {
          name: campaign.name,
          value: `ID: ${campaign.id}\nDescription: ${
            campaign.description || "No description"
          }\n${campaign.is_default ? "**ACTIVE**" : ""}`,
          inline: false,
        };
      });

      const embed = new EmbedBuilder()
        .setTitle("Your Campaigns")
        .setColor(0x0099ff)
        .addFields(...fields);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("refresh_campaigns")
          .setLabel("Refresh")
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } else {
      await interaction.editReply("No campaigns found for your account.");
    }
  } catch (error) {
    console.error("Campaigns error:", error.response?.data || error.message);
    await interaction.editReply(
      `Error fetching campaigns: ${
        error.response?.data?.error || "Unknown error"
      }`
    );
  }
}

// Handle set campaign command
async function handleSetCampaign(interaction) {
  await interaction.deferReply();

  const userData = getUserToken(interaction.user.id);
  if (!userData) {
    return await interaction.editReply(
      "You must be logged in. Use `/login` first."
    );
  }

  const campaignId = interaction.options.getString("campaign_id");

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/campaigns/set-default`,
      {
        campaign_id: campaignId,
      },
      {
        headers: { Authorization: `Bearer ${userData.token}` },
      }
    );

    if (response.data.success) {
      // Update stored campaign ID
      const updatedUserData = { ...userData, campaignId };
      userTokens.set(interaction.user.id, updatedUserData);

      const embed = new EmbedBuilder()
        .setTitle("Campaign Changed")
        .setColor(0x00bb00)
        .setDescription(`Successfully set campaign ${campaignId} as active.`);

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply("Failed to set campaign. Please try again.");
    }
  } catch (error) {
    console.error("Set campaign error:", error.response?.data || error.message);
    await interaction.editReply(
      `Error setting campaign: ${
        error.response?.data?.error || "Unknown error"
      }`
    );
  }
}

// Handle history command
async function handleHistory(interaction) {
  await interaction.deferReply();

  const userData = getUserToken(interaction.user.id);
  if (!userData) {
    return await interaction.editReply(
      "You must be logged in. Use `/login` first."
    );
  }

  const limit = interaction.options.getInteger("limit") || 5;

  try {
    const response = await axios.get(`${API_BASE_URL}/api/fund-history`, {
      headers: { Authorization: `Bearer ${userData.token}` },
    });

    if (response.data && response.data.length > 0) {
      const fundHistory = response.data.slice(0, limit);

      const fields = fundHistory.map((entry) => {
        // Format currency amounts
        const currencyParts = [];
        if (entry.platinum > 0) currencyParts.push(`${entry.platinum}P`);
        if (entry.gold > 0) currencyParts.push(`${entry.gold}G`);
        if (entry.silver > 0) currencyParts.push(`${entry.silver}S`);
        if (entry.copper > 0) currencyParts.push(`${entry.copper}C`);
        const amountText = currencyParts.join(" ");

        // Format date
        const date = new Date(entry.transaction_date);
        const formattedDate = date.toLocaleDateString();

        return {
          name: entry.subtract ? `🔻 ${amountText}` : `🔺 ${amountText}`,
          value: `${entry.description}\nDate: ${formattedDate}`,
          inline: false,
        };
      });

      const embed = new EmbedBuilder()
        .setTitle("Recent Fund History")
        .setColor(0x0099ff)
        .addFields(...fields);

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply("No fund history found for your campaign.");
    }
  } catch (error) {
    console.error("History error:", error.response?.data || error.message);
    await interaction.editReply(
      `Error fetching history: ${
        error.response?.data?.error || "Unknown error"
      }`
    );
  }
}

// Handle command interactions
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  switch (commandName) {
    case "login":
      await handleLogin(interaction);
      break;
    case "funds":
      await handleFunds(interaction);
      break;
    case "addfunds":
      await handleAddFunds(interaction);
      break;
    case "removefunds":
      await handleRemoveFunds(interaction);
      break;
    case "items":
      await handleItems(interaction);
      break;
    case "additem":
      await handleAddItem(interaction);
      break;
    case "campaigns":
      await handleCampaigns(interaction);
      break;
    case "setcampaign":
      await handleSetCampaign(interaction);
      break;
    case "history":
      await handleHistory(interaction);
      break;
  }
});

// Handle button interactions
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const { customId } = interaction;

  if (customId === "refresh_campaigns") {
    await interaction.update({
      content: "Refreshing campaigns...",
      components: [],
    });
    await handleCampaigns(interaction);
  }
});

// Client ready
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity("Party Loot", { type: "PLAYING" });
});

// Login
client.login(process.env.DISCORD_TOKEN);
