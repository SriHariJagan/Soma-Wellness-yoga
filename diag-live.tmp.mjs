import { chromium } from "playwright";

const url = process.argv[2] || "http://82.25.109.251/";
const b = await chromium.launch({ channel: 'msedge' });
const p = await b.newPage();

p.on("console", (m) => {
  const t = m.text();
  if (m.type() === "error" || m.type() === "warning") console.log(`CONSOLE[${m.type()}]`, t.slice(0, 400));
});
p.on("requestfailed", (r) =>
  console.log("REQFAILED", r.url(), "->", r.failure()?.errorText),
);
p.on("response", (r) => {
  const u = r.url();
  if (u.includes("82.25.109.251") || u.includes("fonts.g"))
    console.log("RESP", r.status(), u.slice(0, 130));
});
p.on("framenavigated", (f) => {
  if (f === p.mainFrame()) console.log("NAV", f.url());
});

try {
  await p.goto(url, { waitUntil: "load", timeout: 45000 });
} catch (e) {
  console.log("GOTO ERROR:", e.message.split("\n")[0]);
}
await p.waitForTimeout(5000);
const title = await p.title().catch(() => "n/a");
console.log("TITLE:", title);
await b.close();
