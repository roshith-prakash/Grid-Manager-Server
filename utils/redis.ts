import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

// Create redis client
export const redisClient = createClient({
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    tls: true,
  },
});

redisClient.on("error", (err) => {
  console.error("Redis Client Error", err);
});

try {
  //  Connect client to db
  await redisClient.connect();
} catch (err) {
  console.log(err);
}
