import argon2 from 'argon2';
const hash = await argon2.hash('mypassword');
console.log('Hash:', hash);
console.log('Verify OK:', await argon2.verify(hash, 'mypassword'));
console.log('Verify FAIL:', await argon2.verify(hash, 'wrongpassword'));
