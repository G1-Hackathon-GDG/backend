import dns from "node:dns";
import mongoose from "mongoose";

const dnsServers = process.env.MONGODB_DNS_SERVERS?.split(",")
  .map((server) => server.trim())
  .filter(Boolean);

if (dnsServers?.length) {
  dns.setServers(dnsServers);
}

export default async function connectDB() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not set");
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    if (error?.syscall === "querySrv" && error?.code === "ECONNREFUSED") {
      console.error(
        "MongoDB SRV lookup failed in Node. This usually means your DNS resolver is blocking SRV queries for mongodb+srv URIs.",
      );
      console.error(
        "Try setting MONGODB_DNS_SERVERS=1.1.1.1,8.8.8.8 or switch MONGODB_URI to the standard mongodb:// Atlas connection string.",
      );
    }

    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
}
