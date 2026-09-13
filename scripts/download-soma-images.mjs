// Bulk download + WebP optimize for SOMA local imagery.
// Usage: node scripts/download-soma-images.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'public/images';
const SHOTS = [
  // [unsplashId, dest, width]
  ['photo-1544161515-4ab6ce6db874', 'hero/soma-hero-calm.webp', 1920],
  ['photo-1540555700478-4be289fbecef', 'backgrounds/immersive-spa-calm.webp', 1920],
  ['photo-1545205597-3d9d02c29597', 'headers/about-story.webp', 1400],
  ['photo-1515377905703-c4788e51af15', 'headers/classes-memberships.webp', 1200],
  ['photo-1499209974431-9dddcece7f88', 'headers/contact-welcome.webp', 900],
  ['photo-1529156069898-49953e39b3ac', 'headers/events-gatherings.webp', 900],
  ['photo-1494172961521-33799ddd43a5', 'headers/faq-help.webp', 900],
  ['photo-1470252649378-9c29740c9fa8', 'headers/founding-beginnings.webp', 900],
  ['photo-1493894473891-10fc1e5dbd22', 'headers/life-stages.webp', 900],
  ['photo-1544367567-0f2fcb009e0b', 'headers/private-onetoone.webp', 900],
  ['photo-1596178065887-1198b6148b2b', 'headers/restore-rituals.webp', 900],
  ['photo-1588286840104-8957b019727f', 'headers/yttc-academy.webp', 900],
  ['photo-1506126613408-eca07ce68773', 'programs/exp-join.webp', 1200],
  ['photo-1591343395082-e120087004b4', 'programs/exp-private.webp', 1200],
  ['photo-1600334089648-bd6e2a7a65a8', 'programs/exp-restore.webp', 1200],
  ['photo-1555252333-9f8e92e65df9', 'programs/exp-life-stages.webp', 1200],
  ['photo-1544161515-4ab6ce6db874', 'programs/sig-stillness.webp', 800],
  ['photo-1600334089648-bd6e2a7a65a8', 'programs/sig-acacia.webp', 800],
  ['photo-1540555700478-4be289fbecef', 'programs/sig-fortwo.webp', 800],
  ['photo-1441974231531-c6227db76b6e', 'programs/reset-rebuild.webp', 800],
  ['photo-1493894473891-10fc1e5dbd22', 'programs/mama-pregnancy.webp', 900],
  ['photo-1519689680058-324335c77eba', 'programs/mama-postnatal.webp', 900],
  ['photo-1503454537195-1dcabb73ffb9', 'programs/young-children.webp', 800],
  ['photo-1470252649378-9c29740c9fa8', 'programs/agewell-seniors.webp', 800],
  ['photo-1559839734-2b71ea197ec2', 'programs/private-assessment.webp', 800],
  ['photo-1591343395082-e120087004b4', 'programs/private-plan.webp', 800],
  ['photo-1559757148-5c350d0d3c56', 'programs/private-sessions.webp', 800],
  ['photo-1599901860904-17e6ed7083a0', 'programs/private-studio.webp', 800],
  ['photo-1599901860904-17e6ed7083a0', 'about/studio-story.webp', 800],
  ['photo-1544367567-0f2fcb009e0b', 'about/founder-guide.webp', 800],
  ['photo-1575052814086-f385e2e2ad33', 'about/gallery-group.webp', 800],
  ['photo-1506126613408-eca07ce68773', 'about/gallery-calm.webp', 800],
  ['photo-1545389336-cf090694435e', 'about/gallery-movement.webp', 800],
  ['photo-1588286840104-8957b019727f', 'about/gallery-practice.webp', 800],
  ['photo-1529156069898-49953e39b3ac', 'about/gallery-community.webp', 800],
  ['photo-1580489944761-15a19d654956', 'team/amina-juma.webp', 600],
  ['photo-1507003211169-0a1dd7228f2d', 'team/daniel-ochieng.webp', 600],
  ['photo-1534528741775-53994a69daeb', 'team/zawadi-mwangi.webp', 600],
  ['photo-1438761681033-6461ffad8d80', 'team/leah-njeri.webp', 600],
  ['photo-1544005313-94ddf0286df2', 'team/amina-yttc.webp', 600],
  ['photo-1524504388940-b1c1722653e1', 'team/zawadi-yttc.webp', 600],
  ['photo-1506794778202-cad84cf45f1d', 'team/daniel-yttc.webp', 600],
  ['photo-1540555700478-4be289fbecef', 'contact/visit-touch.webp', 600],
  ['photo-1518495973542-4542c06a5843', 'contact/visit-quiet.webp', 600],
  ['photo-1515377905703-c4788e51af15', 'contact/visit-welcome.webp', 600],
  ['photo-1447452001602-7090c7ab2db3', 'yttc/academy-study.webp', 800],
  ['photo-1599901860904-17e6ed7083a0', 'auth/welcome-calm.webp', 1200],
  ['photo-1528715471578-2e5b6c0bb37a', 'intro/soma-intro.webp', 900],
];

let ok = 0, fail = 0;
for (const [id, dest, w] of SHOTS) {
  const url = `https://images.unsplash.com/${id}?q=80&w=${w}&auto=format&fit=crop`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 15000) throw new Error('too small: ' + buf.length);
    const full = path.join(OUT, dest);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    const pipe = sharp(buf);
    const meta = await pipe.metadata();
    const target = Math.min(w, meta.width || w);
    await sharp(buf).resize(target).webp({ quality: 82 }).toFile(full);
    console.log('OK ' + dest + ' (' + buf.length + '->' + fs.statSync(full).size + 'b)');
    ok++;
  } catch (e) {
    console.log('FAIL ' + dest + ' :: ' + e.message);
    fail++;
  }
}
console.log(`DONE ok=${ok} fail=${fail}`);
