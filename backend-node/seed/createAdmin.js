import { connectDb, disconnectDb } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { hashPassword } from '../src/utils/hash.js';

// Creates (or promotes) the first admin — the only way an admin comes into being,
// since public registration is removed. Driven by env or CLI args:
//   ADMIN_EMAIL=a@x.com ADMIN_PASSWORD='StrongPass123' npm run seed:admin
//   node seed/createAdmin.js a@x.com 'StrongPass123'
export async function createAdmin(emailArg, passwordArg) {
  const email = (emailArg || process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = passwordArg || process.env.ADMIN_PASSWORD || '';
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required (env vars or CLI args).');
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
  }

  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'ADMIN';
    if (existing.deletedAt) existing.deletedAt = null;
    await existing.save();
    console.log(`[seed] promoted existing user to ADMIN: ${email}`);
    return existing;
  }

  const user = await User.create({
    email,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
    emailVerified: true,
    mustChangePassword: true, // forces a password change on first login
    lang: 'fr',
  });
  console.log(`[seed] created ADMIN: ${email} (must change password on first login)`);
  return user;
}

// Allow `npm run seed:admin` standalone.
if (import.meta.url === `file://${process.argv[1]}`) {
  await connectDb();
  await createAdmin(process.argv[2], process.argv[3]);
  await disconnectDb();
  process.exit(0);
}
