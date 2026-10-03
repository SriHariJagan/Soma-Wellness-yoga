import { chromium } from "playwright";
const strip = process.argv.includes("--strip-uir");
const b = await chromium.launch({ channel: "msedge" });
const p = await b.newPage();
const reqs = [];
let cspHeader = "";
p.on("request", r => reqs.push(r.url()));
p.on("requestfailed", r => console.log("  FAILED", r.url().slice(0,80), "->", r.failure()?.errorText));
if (strip) {
  await p.route("**/*", async (route) => {
    const req = route.request();
    if (req.resourceType() === "document") {
      const resp = await route.fetch();
      const headers = resp.headers();
      cspHeader = headers["content-security-policy"] || "";
      headers["content-security-policy"] = (headers["content-security-policy"] || "").replace(/;?\s*upgrade-insecure-requests/g, "");
      await route.fulfill({ response: resp, headers });
    } else {
      await route.continue();
    }
  });
}
await p.goto("http://82.25.109.251/", { waitUntil: "load", timeout: 45000 }).catch(e => console.log("  GOTO", e.message.split("\n")[0]));
await p.waitForTimeout(4000);
console.log("STRIP_UIR:", strip);
if (strip) console.log("  CSP now ends with:", cspHeader.slice(-80));
reqs.filter(u => u.includes("82.25")).slice(0, 6).forEach(u => console.log("  REQ", u.slice(0, 110)));
await b.close();