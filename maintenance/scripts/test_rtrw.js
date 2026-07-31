const db = require('./server/db');

async function test() {
  try {
    const [rows] = await db.query(`
      SELECT 
        CASE 
          WHEN alamat LIKE '%KRENGAN%' OR alamat LIKE '%KRENGGAN%' THEN 'Dusun Krenggan'
          WHEN alamat LIKE '%KAUMAN%' THEN 'Dusun Kauman'
          WHEN alamat LIKE '%TEGALAN%' THEN 'Dusun Tegalan'
          WHEN alamat LIKE '%SEDATI%' THEN 'Dusun Sedati'
          ELSE 'Lainnya'
        END AS dusun_name,
        SUBSTRING_INDEX(alamat, 'RT/RW : ', -1) as rtrw,
        COUNT(*) as count 
      FROM penduduk 
      WHERE alamat LIKE '%RT/RW%'
      GROUP BY dusun_name, rtrw
      ORDER BY dusun_name, rtrw
    `);
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
test();
