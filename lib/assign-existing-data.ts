import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN!,
});

async function assignExistingData(userId: string) {
  console.log(`Assigning existing data to user: ${userId}`);

  // Update jobs
  const jobsResult = await db.execute({
    sql: 'UPDATE jobs SET user_id = ? WHERE user_id IS NULL',
    args: [userId],
  });
  console.log(`✓ Updated ${jobsResult.rowsAffected} jobs`);

  // Update overhead
  const overheadResult = await db.execute({
    sql: 'UPDATE overhead SET user_id = ? WHERE user_id IS NULL',
    args: [userId],
  });
  console.log(`✓ Updated ${overheadResult.rowsAffected} overhead entries`);

  // Update settings
  const settingsResult = await db.execute({
    sql: 'UPDATE settings SET user_id = ? WHERE user_id IS NULL',
    args: [userId],
  });
  console.log(`✓ Updated ${settingsResult.rowsAffected} settings entries`);

  // Update IRS rates
  const irsRatesResult = await db.execute({
    sql: 'UPDATE irs_rates SET user_id = ? WHERE user_id IS NULL',
    args: [userId],
  });
  console.log(`✓ Updated ${irsRatesResult.rowsAffected} IRS rate entries`);

  console.log('\n✅ All existing data has been assigned to your account!');
}

// Get userId from command line argument
const userId = process.argv[2];

if (!userId) {
  console.error('❌ Error: Please provide your Clerk user ID as an argument');
  console.error('Usage: TURSO_URL="..." TURSO_TOKEN="..." npx tsx lib/assign-existing-data.ts YOUR_USER_ID');
  process.exit(1);
}

assignExistingData(userId).catch(console.error);
