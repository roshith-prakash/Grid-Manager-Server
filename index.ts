/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import http from "http";
import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors, { CorsOptions } from "cors";
dotenv.config();

// Importing Routes ----------------------------------------------------------------------------------------------

import routes from "./routes/index.ts";

// Initializing Server -------------------------------------------------------------------------------------------

const app = express();
const server = http.createServer(app);

// Using Middleware -------------------------------------------------------------------------------------------

// Whitelist for domains from which requests should be allowed
const whitelist = ["http://localhost:3000"];

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
app.get("/", (req, res) => {
  res.status(200).send("We are good to go!");
});

// Routes -----------------------------------------------------------------------------------------

app.use("/api/v1", routes);

// Listening on PORT -------------------------------------------------------------------------------------------

server.listen(process.env.PORT || 4000, () => {
  console.log(`Server running on port ${process.env.PORT || 4000}`);
});