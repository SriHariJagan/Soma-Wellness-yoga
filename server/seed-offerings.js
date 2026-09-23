// ============================================================
// seed-offerings.js
// Wipes Offering + Service down to the canonical public catalog
// (server/config/publicCatalog.js) so every surface shows the same
// pasted Services-page list — including the two SOMA Work Well items.
// Run: node seed-offerings.js
// ============================================================
import './loadEnv.js';
import mongoose from 'mongoose';
import Offering from './models/Offering.js';
import Service from './models/Service.js';
import {
  PUBLIC_CATALOG,
  PUBLIC_SERVICE_NAMES,
  RETIRED_SERVICE_NAMES,
  RETIRED_OFFERING_NAMES,
  toOfferingDoc,
  toServiceDoc,
} from './config/publicCatalog.js';

const MONGO_URI = process.env.MONGO_URI;

async function wipeAndSeed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // ── Offerings (Services page source) ──
    const offeringDel = await Offering.deleteMany({});
    console.log(`[WIPE] Offerings removed: ${offeringDel.deletedCount}`);

    let offeringsCreated = 0;
    for (const entry of PUBLIC_CATALOG) {
      await Offering.create(toOfferingDoc(entry));
      console.log(`  [CREATE] Offering: ${entry.name} — KES ${entry.price}`);
      offeringsCreated += 1;
    }

    // ── Services (admin / reception / chatbot source) ──
    const serviceDel = await Service.deleteMany({});
    console.log(`[WIPE] Services removed: ${serviceDel.deletedCount}`);

    let servicesCreated = 0;
    for (const entry of PUBLIC_CATALOG) {
      await Service.create(toServiceDoc(entry));
      console.log(`  [CREATE] Service: ${entry.name} — KES ${entry.price}`);
      servicesCreated += 1;
    }

    // Safety: ensure retired names are gone even if a future edit re-adds them.
    await Offering.deleteMany({ name: { $in: RETIRED_OFFERING_NAMES } });
    await Service.deleteMany({ name: { $in: RETIRED_SERVICE_NAMES } });

    const offeringCount = await Offering.countDocuments();
    const serviceCount = await Service.countDocuments();
    console.log(
      `\nDone! Offerings created: ${offeringsCreated} (total ${offeringCount}), ` +
      `Services created: ${servicesCreated} (total ${serviceCount})`,
    );

    // Quick sanity: names must match 1:1 between collections.
    const offeringNames = (await Offering.find({}, { name: 1 }).lean()).map((o) => o.name).sort();
    const serviceNames = (await Service.find({}, { name: 1 }).lean()).map((s) => s.name).sort();
    const expected = [...PUBLIC_SERVICE_NAMES].sort();
    const match = JSON.stringify(offeringNames) === JSON.stringify(expected)
      && JSON.stringify(serviceNames) === JSON.stringify(expected);
    console.log(`Catalog sync check: ${match ? 'OK' : 'MISMATCH — inspect names manually'}`);

    process.exit(match ? 0 : 1);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

wipeAndSeed();
