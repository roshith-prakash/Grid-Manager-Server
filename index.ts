import http from "http";
import axios from "axios";
import dotenv from "dotenv";
import helmet from "helmet";
import cors, { CorsOptions } from "cors";
import express, { NextFunction, Response } from "express";
import { redisClient } from "./utils/redis.ts";
import rateLimit from "express-rate-limit";

dotenv.config();

// Importing Routes ----------------------------------------------------------------------------------------------

import userRouter from "./routes/user.routes.ts";
import teamRouter from "./routes/team.routes.ts";

import {
  updateQualiScores,
  updateRaceScores,
  updateSprintScores,
} from "./functions/updateScore.ts";
import { updatePrices } from "./functions/updatePrice.ts";

import { checkIfUserIsAuthenticated } from "./middleware/authMiddleware.ts";

// Initializing Server -------------------------------------------------------------------------------------------

const app = express();
let server = http.createServer(app);

// Using Middleware -------------------------------------------------------------------------------------------

// Whitelist for domains
const whitelist = ["http://localhost:3000", "https://grid-manager.vercel.app"];

// Function to deny access to domains except those in whitelist.
const corsOptions: CorsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    // Find request domain and check in whitelist.
    if (origin && whitelist.indexOf(origin) !== -1) {
      // Accept request
      callback(null, true);
    } else {
      // Send CORS error.
      callback(new Error("Not allowed by CORS"));
    }
  },
};

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50, // Limit each IP to 20 requests per minute
});

// Rate Limit
app.use(limiter);
// Parses request body.
app.use(express.urlencoded({ extended: true }));
// Adds security to the server.
app.use(helmet());
// Removes the "X-Powered-By" HTTP header from Express responses.
app.disable("x-powered-by");
// Parses JSON passed inside body.
app.use(express.json());
// Enable CORS
app.use(cors(corsOptions));

// Routes -------------------------------------------------------------------------------------------

// Default route to check if server is working.
app.get("/", (_, res: Response) => {
  res.status(200).send("We are good to go!");
  return;
});

// Get Next Race
app.get(
  "/api/v1/next-race",
  // MiddleWare to check if data exists in REDIS
  async (_, res: Response, next: NextFunction) => {
    const result = await redisClient.get(`next-race`);

    if (result) {
      // If value was present, convert to JSON and send result
      res.status(200).send(JSON.parse(result));
      return;
    } else {
      next();
    }
  },
  // Function to run in REDIS data is unavailable (controller)
  async (_, res: Response) => {
    let response = await axios.get(
      `https://api.jolpi.ca/ergast/f1/current/next`
    );

    let result = response?.data?.MRData?.RaceTable?.Races[0];

    // 12 hour cache duration
    await redisClient.setEx(
      `next-race`,
      60 * 60 * 12,
      JSON.stringify({ nextRace: result })
    );

    res.status(200).send({ nextRace: result });
    return;
  }
);

// Updating scores (cached via redis so that Jolpica API rate limits aren't hit)
app.get(
  "/api/v1/update-scores",
  // MiddleWare to check if update score was already called
  async (_, res: Response, next: NextFunction) => {
    const result = await redisClient.get(`update-scores`);

    if (result) {
      // If value was present, convert to JSON and send result
      res.status(200).send(JSON.parse(result));
      return;
    } else {
      next();
    }
  },
  // Function to update score
  async (_, res: Response) => {
    try {
      await updateSprintScores();
      await updateQualiScores();
      await updateRaceScores();

      // Caching for 3 hours
      await redisClient.setEx(
        `update-scores`,
        60 * 60 * 3,
        JSON.stringify({ data: "Scores updated" })
      );

      res.status(200).send({ data: "Scores updated" });
      return;
    } catch (err) {
      res.status(500).send({ data: "Could not update score." });
      return;
    }
  }
);

// Updating prices
app.get(
  "/api/v1/update-prices",
  // Function to update score
  async (_, res: Response) => {
    try {
      await updatePrices();
      res.status(200).send({ data: "Prices updated" });
      return;
    } catch (err) {
      res.status(500).send({ data: "Could not update price." });
      return;
    }
  }
);

// Routes -----------------------------------------------------------------------------------------

// Auth Routes
app.use("/api/v1/user", userRouter);
// Team + League routes
app.use("/api/v1/team", checkIfUserIsAuthenticated, teamRouter);

// Listening on PORT -------------------------------------------------------------------------------------------

server.listen(process.env.PORT || 4000, () => {
  console.log(`Server running on port ${process.env.PORT || 4000}`);
});
