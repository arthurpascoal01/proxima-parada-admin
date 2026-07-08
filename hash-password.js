// Uso: node hash-password.js "minhaSenhaForte123"
// Copie o hash gerado para a variável de ambiente ADMIN_PASSWORD_HASH.
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.error('Uso: node hash-password.js "sua-senha"');
  process.exit(1);
}

bcrypt.hash(password, 10).then((hash) => {
  console.log('\nADMIN_PASSWORD_HASH=' + hash + '\n');
});
