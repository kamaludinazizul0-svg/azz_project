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
      SELECT 
        ${sqlCase} AS dusun_name,
        SUBSTRING_INDEX(SUBSTRING_INDEX(alamat, 'RT/RW : ', -1), '/', -1) as rw,
        COUNT(*) as count 
      FROM penduduk 
      WHERE alamat LIKE '%RT/RW%'
      GROUP BY dusun_name, rw
      ORDER BY dusun_name, rw
    `);
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
test();
