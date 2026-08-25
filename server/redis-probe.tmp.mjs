import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { Queue, Worker } from "bullmq";
import { getRedisConnection } from "./notification/queue/connection.js";
import { deliveryJobHandler } from "./notification/queue/handlers.js";

const conn = getRedisConnection();
console.log("REDIS status:", conn.status);
await new Promise((r) => setTimeout(r, 1500));
console.log("REDIS status after wait:", conn.status);

const q = new Queue("notification-delivery", { connection: conn });
const counts = await q.getJobCounts("waiting", "active", "delayed", "failed", "completed");
console.log("QUEUE counts:", JSON.stringify(counts));

const worker = new Worker("notification-delivery", async (job) => deliveryJobHandler(job), {
  connection: conn,
  concurrency: 2,
});
worker.on("completed", (job) => console.log("TEMP WORKER completed:", job.id));
worker.on("failed", (job, err) => console.log("TEMP WORKER failed:", job.id, err.message));
worker.on("error", (err) => console.log("TEMP WORKER error:", err.message));

console.log("temp worker started — waiting up to 15s for pickup...");
await new Promise((r) => setTimeout(r, 15000));
await worker.close();
await q.close();
process.exit(0);