const db = require('./server/db');

async function test() {
  try {
    const sqlCase = `CASE 
      WHEN alamat LIKE '%KRENGAN%' OR alamat LIKE '%KRENGGAN%' THEN 'Dusun Krenggan'
      WHEN alamat LIKE '%KAUMAN%' THEN 'Dusun Kauman'
      WHEN alamat LIKE '%TEGALAN%' THEN 'Dusun Tegalan'
      WHEN alamat LIKE '%SEDATI%' THEN 'Dusun Sedati'
      ELSE 'Lainnya'
    END`;
    
    const [rows] = await db.query(`
      SELECT alamat, COUNT(*) as count 
      FROM penduduk 
      WHERE ${sqlCase} = 'Lainnya' 
      GROUP BY alamat
      ORDER BY count DESC
      LIMIT 20
    `);
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
test();
