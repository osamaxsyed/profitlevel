import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN!,
});

async function migrate() {
  console.log('Starting migration to add user_id columns...');

  try {
    // Add user_id to jobs table
    await db.execute(`
      ALTER TABLE jobs ADD COLUMN user_id TEXT;
    `);
    console.log('✓ Added user_id to jobs');

    // Add user_id to overhead table
    await db.execute(`
      ALTER TABLE overhead ADD COLUMN user_id TEXT;
    `);
    console.log('✓ Added user_id to overhead');

    // Add user_id to settings table
    await db.execute(`
      ALTER TABLE settings ADD COLUMN user_id TEXT;
    `);
    console.log('✓ Added user_id to settings');

    // Add user_id to irs_rates table
    await db.execute(`
      ALTER TABLE irs_rates ADD COLUMN user_id TEXT;
    `);
    console.log('✓ Added user_id to irs_rates');

    console.log('\n✅ Migration completed successfully!');
    console.log('Note: Materials, Labor, and Mileage inherit user_id from their job');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
