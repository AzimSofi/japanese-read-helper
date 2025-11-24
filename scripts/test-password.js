const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const password = 'REDACTED';
const hash = process.env.AUTH_PASSWORD_HASH;

console.log('Testing password verification...\n');
console.log('Password to test:', password);
console.log('Hash from .env.local:', hash ? hash.substring(0, 20) + '...' : 'NOT FOUND');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? 'Found' : 'NOT FOUND');
console.log('');

if (!hash) {
  console.error('❌ AUTH_PASSWORD_HASH not found in environment variables!');
  console.error('Make sure .env.local exists and has AUTH_PASSWORD_HASH set.');
  process.exit(1);
}

bcrypt.compare(password, hash).then(result => {
  if (result) {
    console.log('✅ Password verification PASSED');
    console.log('The password "REDACTED" matches the hash!');
  } else {
    console.log('❌ Password verification FAILED');
    console.log('The password "REDACTED" does NOT match the hash.');
    console.log('\nGenerating new hash for "REDACTED"...');
    bcrypt.hash(password, 10).then(newHash => {
      console.log('\nReplace AUTH_PASSWORD_HASH in .env.local with:');
      console.log('AUTH_PASSWORD_HASH=' + newHash);
    });
  }
}).catch(err => {
  console.error('Error testing password:', err.message);
});
