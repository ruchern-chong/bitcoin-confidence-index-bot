import axios from "axios";
import { Client, Intents } from "discord.js";
import * as cron from "node-cron";
import "dotenv/config";

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

export interface BitcoinData {
  [key: string]: any;
  Confidence: object;
  Price: object;
}

/**
 * Fetch the Bitcoin confidence data from https://cbbi.info
 */
const fetchBitcoinConfidence = async (): Promise<BitcoinData> => {
  try {
    const { data } = await axios.get(process.env.API_URL);
    console.info(`Data fetched for Bitcoin confidence!`);
    const { Confidence, Price }: BitcoinData = data;

    if (data) {
      // We only want the data for Confidence and Price
      return { Confidence, Price };
    }
  } catch (e) {
    console.error(e);
  }
};

/**
 * Get the latest value based on the last key-value pair in the object
 *
 * @param data
 */
const getLatestData = (data: object): number => {
  const keys = Object.keys(data);
  return data[keys[keys.length - 1]];
};

/**
 * Manipulate and show the relevant info in the Discord bot
 *
 * @param data
 */
const showIndexAndPrice = async (data: BitcoinData) => {
  const { Confidence, Price } = data;

  const latestConfidenceData = getLatestData(Confidence);
  const latestPriceData = getLatestData(Price);

  const formattedBitcoinBullIndex = (latestConfidenceData * 100).toFixed();
  const formattedBitcoinPrice = latestPriceData.toFixed(2);

  const guilds = await client.guilds.cache;
  guilds.forEach((guild) =>
    guild.me.setNickname(`Bitcoin CI: ${formattedBitcoinBullIndex}`)
  );

  client.user.setPresence({
    status: "online",
    activities: [
      {
        name: `Bitcoin $${formattedBitcoinPrice}`,
        type: "WATCHING",
      },
    ],
  });
};

client.once("ready", async () => {
  const bitcoinConfidence = {
    data: {},
    set setIndexAndPriceData(data: BitcoinData) {
      this.data = data;
      showIndexAndPrice(data);
    },
  };

  bitcoinConfidence.setIndexAndPriceData = await fetchBitcoinConfidence();

  // Set a cron job to fetch new data at every 4 hours
  cron.schedule("* * */4 * * *", async () => {
    console.info(`Time now: ${Date.now()}`);

    bitcoinConfidence.setIndexAndPriceData = await fetchBitcoinConfidence();
  });
});

client
  .login(process.env.DISCORD_BOT_API_TOKEN)
  .then(() => console.log("Bot has successfully logged in!"));
