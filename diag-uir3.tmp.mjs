import { chromium } from "playwright";
const b = await chromium.launch({ channel: "msedge", args: ["--disable-features=HttpsUpgrades"] });
const p = await b.newPage();
let ok = 0, bad = 0;
p.on("response", (r) => { if (r.url().includes("82.25")) { if (r.status() === 200) ok++; else { bad++; console.log("  RESP", r.status(), r.url().slice(0,100)); } } });
p.on("requestfailed", r => console.log("  FAILED", r.url().slice(0,90), "->", r.failure()?.errorText));
p.on("console", m => { if (m.type() === "error") console.log("  CONSOLE", m.text().slice(0, 160)); });
await p.route("**/*", async (route) => {
  const req = route.request();
  if (req.resourceType() === "document") {
    const resp = await route.fetch();
    const headers = resp.headers();
    headers["content-security-policy"] = (headers["content-security-policy"] || "").replace(/upgrade-insecure-requests;?/g, "").replace(/;\s*;/g, ";");
    await route.fulfill({ response: resp, headers });
  } else await route.continue();
});
await p.goto("http://82.25.109.251/", { waitUntil: "load", timeout: 45000 }).catch(e => console.log("  GOTO", e.message.split("\n")[0]));
await p.waitForTimeout(6000);
const roots = await p.evaluate(() => document.getElementById("root")?.childElementCount ?? -1);
console.log("200 responses:", ok, "non-200:", bad, "root children:", roots, "title:", await p.title());
await b.close();