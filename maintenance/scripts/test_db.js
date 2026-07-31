const db = require('./server/db');

async function test() {
  try {
    const sqlCase = `CASE 
      WHEN alamat LIKE '%KRENGAN%' OR alamat LIKE '%KRENGGAN%' THEN 'Dusun Krenggan'
      WHEN alamat LIKE '%TEGALAN%' THEN 'Dusun Tegalan'
      WHEN alamat LIKE '%SEDATI%' THEN 'Dusun Sedati'
      ELSE 'Dusun Kauman'
    END`;
    
    const [rows] = await db.query(`
      SELECT ${sqlCase} AS dusun_name, COUNT(*) as count 
      FROM penduduk 
      GROUP BY dusun_name
    `);
    console.log(rows);
    const total = rows.reduce((sum, r) => sum + r.count, 0);
    console.log('Total:', total);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
test();
