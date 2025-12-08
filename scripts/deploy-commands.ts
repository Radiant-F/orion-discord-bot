import "dotenv/config";
import { REST, Routes } from "discord.js";
import { env, requireEnv } from "../src/config/env";
import { commands } from "../src/commands";

async function main() {
  const token = requireEnv(env.token, "DISCORD_TOKEN");
  const clientId = requireEnv(env.clientId, "DISCORD_CLIENT_ID");
  const rest = new REST({ version: "10" }).setToken(token);

  const commandData = commands.map((command) => command.data.toJSON());

  if (env.guildId) {
    console.log(
      `Registering ${commandData.length} commands (guild ${env.guildId})`
    );
    await rest.put(Routes.applicationGuildCommands(clientId, env.guildId), {
      body: commandData,
    });
  } else {
    console.log(`Registering ${commandData.length} global commands`);
    await rest.put(Routes.applicationCommands(clientId), { body: commandData });
  }

  console.log("Commands registered.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
