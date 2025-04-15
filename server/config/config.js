const { Pool } = require('pg');

  // NISA GCP
  const poolNisa = new Pool({
    user: 'noc',
    host: '172.17.76.36',
    database: 'nisa',
    password: 'myrep123!',
    port: 5432,
  });

module.exports = poolNisa;
