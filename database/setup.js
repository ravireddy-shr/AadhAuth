// Optional MongoDB setup script (Node.js)
// Run: node database/setup.js

const { MongoClient } = require('mongodb');

async function ensureCollection(db, name) {
  const existing = await db.listCollections({ name }).toArray();
  if (existing.length === 0) {
    await db.createCollection(name);
    console.log(`Created collection: ${name}`);
    return;
  }

  console.log(`Collection already exists: ${name}`);
}

(async () => {
  const url = process.env.MONGO_URL || 'mongodb://localhost:27017';
  const client = new MongoClient(url);

  try {
    await client.connect();
    const db = client.db('aadhaar_verification');

    await ensureCollection(db, 'users');
    await ensureCollection(db, 'logs');

    console.log('Database setup completed.');
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
})();
