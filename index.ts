import http from "http";
import dotenv from "dotenv";
import helmet from "helmet";
import cors, { CorsOptions } from "cors";
import express, { Response } from "express";

dotenv.config();

// Importing Routes ----------------------------------------------------------------------------------------------

import userRouter from "./routes/user.routes.ts";
import teamRouter from "./routes/team.routes.ts";

import {
  updateQualiScores,
  updateRaceScores,
  updateSprintScores,
} from "./functions/addScore.ts";
import axios from "axios";

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

// Parses request body.
app.use(express.urlencoded({ extended: true }));
// Parses JSON passed inside body.
app.use(express.json());
// Enable CORS
app.use(cors(corsOptions));
// Add security to server.
app.use(helmet());

// Routes -------------------------------------------------------------------------------------------

// Default route to check if server is working.
app.get("/", (_, res: Response) => {
  res.status(200).send("We are good to go!");
  return;
});

app.get("/api/v1/next-race", async (_, res: Response) => {
  let response = await axios.get(`https://api.jolpi.ca/ergast/f1/current/next`);

  let result = response?.data?.MRData?.RaceTable?.Races[0];

  res.status(200).send({ nextRace: result });
  return;
});

// Routes -----------------------------------------------------------------------------------------

// Auth Routes
app.use("/api/v1/user", userRouter);
app.use("/api/v1/team", teamRouter);

// Updating scores when server loads (cannot use Scheduling with Serverless infrastructure)
updateQualiScores();
updateSprintScores();
updateRaceScores();

// Listening on PORT -------------------------------------------------------------------------------------------

server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
