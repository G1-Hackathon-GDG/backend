import "dotenv/config";
import http from "node:http";
import { Server } from "socket.io";
import app from "./app.js";
import connectDB from "./config/db.js";
import { socketHandler } from "./sockets/socketHandler.js";

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  },
});

socketHandler(io);

app.set("io", io);

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the other process or change PORT in .env.`,
    );
    process.exit(1);
  }

  console.error(`Server failed to start: ${error.message}`);
  process.exit(1);
});

async function startServer() {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(
        `FuelPass server running on port ${PORT} [${process.env.NODE_ENV}]`,
      );
    });
  } catch (error) {
    console.error(`Startup failed: ${error.message}`);
    process.exit(1);
  }
}

startServer();
