import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.error('Usage: npx tsx scripts/generate-password-hash.ts <password>');
  process.exit(1);
}

async function generateHash() {
  const hash = await bcrypt.hash(password, 10);
  console.log('\nAdd this to your .env.local:');
  console.log(`AUTH_PASSWORD_HASH="${hash}"`);
  console.log('\nAlso add a random session secret:');
  console.log(`SESSION_SECRET="<generate-a-random-32-character-string>"`);
}

generateHash();
