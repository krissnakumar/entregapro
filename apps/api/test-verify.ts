import * as argon2 from 'argon2';

async function main() {
  const hash = "$argon2id$v=19$m=65536,t=3,p=4$EmJHIUEox26awYq2pVZssA$G5xRhYUZ3pLwXE+ID0V4KUfNuTg+ZQKmA/0wj2m+284";
  const password = "admin123";
  
  try {
    const isValid = await argon2.verify(hash, password);
    console.log(`Password verification: ${isValid ? 'SUCCESS' : 'FAILED'}`);
  } catch (err) {
    console.error(`Verification error: ${err.message}`);
  }
}

main();
