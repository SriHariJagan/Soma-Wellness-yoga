import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const DIST = path.resolve("dist");
const mode = process.argv[2] || "withuir";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
const server = http.createServer((req, res) => {
  const u = req.url.split("?")[0];
  let f = path.join(DIST, u === "/" ? "index.html" : u);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory())
    f = path.join(DIST, "index.html");
  res.setHeader("Content-Type", types[path.extname(f)] || "application/octet-stream");
  if (mode === "withuir")
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; upgrade-insecure-requests",
    );
  res.end(fs.readFileSync(f));
});
server.listen(8099, "127.0.0.1", async () => {
  const b = await chromium.launch({ channel: "msedge" });
  const p = await b.newPage();
  const reqs = [];
  p.on("request", (r) => reqs.push(r.url()));
  p.on("requestfailed", (r) =>
    console.log("  FAILED", r.url().slice(0, 90), "->", r.failure()?.errorText),
  );
  await p
    .goto("http://127.0.0.1:8099/", { waitUntil: "load", timeout: 30000 })
    .catch((e) => console.log("  GOTO", e.message.split("\n")[0]));
  await p.waitForTimeout(1500);
  console.log(`MODE=${mode} requests:`);
  reqs.slice(0, 6).forEach((u) => console.log("  ", u.slice(0, 110)));
  await b.close();
  server.close();
});
