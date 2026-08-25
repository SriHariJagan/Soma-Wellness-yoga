// ============================================================
// services/referralService.js
// Unique referral-code generation + credit handling.
// ============================================================
import crypto from 'crypto';
import Referral from '../models/Referral.js';
import User from '../models/User.js';

const REWARD_PER_JOIN = Number(process.env.REFERRAL_REWARD || 500);

export async function generateUniqueCode(name = '') {
  const prefix = (name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'YOGA');
  // Loop until the random suffix yields a code not already taken.
  for (let i = 0; i < 10; i++) {
    const code = `${prefix}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const exists = await Referral.exists({ code });
    if (!exists) return code;
  }
  return `${prefix}${Date.now().toString(36).toUpperCase()}`;
}

// Ensure a user has a referral record; returns it.
export async function ensureReferral(user) {
  let ref = await Referral.findOne({ user: user._id });
  if (!ref) {
    const code = await generateUniqueCode(user.name);
    ref = await Referral.create({ user: user._id, code });
  }
  return ref;
}

// Credit the owner of `code` for a newly-joined user.
export async function applyReferral(code, newUser) {
  if (!code) return;
  const ref = await Referral.findOne({ code: code.trim() }).populate('user', 'name email');
  if (!ref || ref.user.equals(newUser._id)) return;

  ref.joined.push({ user: newUser._id, name: newUser.name, reward: REWARD_PER_JOIN });
  ref.earned += REWARD_PER_JOIN;
  await ref.save();

  await User.findByIdAndUpdate(ref.user, { $inc: { referralCount: 1 } });

  // Notify referrer via email
  try {
    const { default: emailService } = await import('./email/email.service.js');
    const referrerUser = ref.user;
    if (referrerUser?.email) {
      await emailService.sendMail(
        referrerUser.email,
        'Referral Reward Earned!',
        `<h2 style="color:#2D1406;">Referral Reward!</h2>
         <p>Hi ${referrerUser.name || 'there'},</p>
         <p>Your friend <strong>${newUser.name}</strong> has joined <strong>Pragya Yoga Alliance</strong> using your referral link.</p>
         <p>You have earned a reward of <strong>₹${REWARD_PER_JOIN}</strong>!</p>
         <p>Keep sharing your referral code to earn more rewards.</p>
         <p style="color:#7C6A58;font-size:12px;">— Pragya Yoga Alliance Team</p>`,
        `Referral Reward Earned!\n\nHi ${referrerUser.name || 'there'},\n\nYour friend ${newUser.name} has joined Pragya Yoga Alliance using your referral link.\n\nYou have earned a reward of ₹${REWARD_PER_JOIN}!\n\nKeep sharing your referral code to earn more rewards.\n\n— Pragya Yoga Alliance Team`,
      );
    }
  } catch (err) {
    console.error('Referral reward email failed:', err.message);
  }
}

export default { generateUniqueCode, ensureReferral, applyReferral };
