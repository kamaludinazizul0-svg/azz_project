-- =====================================================
-- Schema Database Website Desa Kauman
-- Versi: Production-Safe (TANPA DROP TABLE)
-- Gunakan script ini untuk setup database baru.
-- Untuk update database yang sudah ada, gunakan ALTER TABLE.
-- =====================================================

CREATE TABLE IF NOT EXISTS berita (
  id BIGINT PRIMARY KEY,
  judul VARCHAR(255),
  kategori VARCHAR(100),
  tanggal VARCHAR(50),
  waktu VARCHAR(50),
  ringkasan TEXT,
  konten TEXT,
  gambar VARCHAR(255),
  penulis VARCHAR(100),
  dilihat INT DEFAULT 0,
  aktif BOOLEAN DEFAULT TRUE,
  slug VARCHAR(255),
  lokasi VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS agenda (
  id BIGINT PRIMARY KEY,
  nama VARCHAR(255),
  tanggal VARCHAR(50),
  waktu VARCHAR(50),
  lokasi VARCHAR(255),
  deskripsi TEXT
);

CREATE TABLE IF NOT EXISTS telepon_darurat (
  id BIGINT PRIMARY KEY,
  nama VARCHAR(255),
  nomor VARCHAR(50),
  kategori VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS saran (
  id BIGINT PRIMARY KEY,
  nama VARCHAR(255),
  no_hp VARCHAR(50),
  kategori VARCHAR(100),
  rating VARCHAR(50),
  judul VARCHAR(255),
  isi TEXT,
  created_at VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Baru'
);

CREATE TABLE IF NOT EXISTS pengaduan (
  id BIGINT PRIMARY KEY,
  nama VARCHAR(255),
  no_hp VARCHAR(50),
  nik VARCHAR(50),
  kategori VARCHAR(100),
  judul VARCHAR(255),
  isi TEXT,
  prioritas VARCHAR(50),
  foto VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Menunggu',
  created_at VARCHAR(100),
  catatan TEXT
);

CREATE TABLE IF NOT EXISTS permohonan_info (
  id BIGINT PRIMARY KEY,
  nama VARCHAR(255),
  no_hp VARCHAR(50),
  email VARCHAR(150),
  instansi VARCHAR(150),
  informasi_diminta TEXT,
  tujuan TEXT,
  format VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Menunggu',
  created_at VARCHAR(100),
  catatan TEXT,
  link_dokumen VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS perangkat (
  id BIGINT PRIMARY KEY,
  nama VARCHAR(255),
  jabatan VARCHAR(150),
  foto VARCHAR(255),
  nip VARCHAR(100),
  periode VARCHAR(100),
  urutan INT,
  tugas TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY,
  username VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  nama VARCHAR(150),
  role VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS logs (
  id BIGINT PRIMARY KEY,
  waktu VARCHAR(100),
  username VARCHAR(100),
  aksi VARCHAR(100),
  detail TEXT
);

CREATE TABLE IF NOT EXISTS mitra (
  id BIGINT PRIMARY KEY,
  nama VARCHAR(255),
  deskripsi TEXT,
  kontak VARCHAR(100),
  foto VARCHAR(255),
  link VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS ppid (
  id BIGINT PRIMARY KEY,
  kategori VARCHAR(100),
  judul VARCHAR(255),
  file VARCHAR(255),
  tanggal VARCHAR(100),
  nama VARCHAR(255),
  deskripsi TEXT,
  aktif BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS gis_points (
  id BIGINT PRIMARY KEY,
  nama VARCHAR(255),
  kategori VARCHAR(100),
  lat VARCHAR(50),
  lng VARCHAR(50),
  deskripsi TEXT,
  foto VARCHAR(255),
  created_at VARCHAR(100)
);

-- Tabel data format JSON (id + data)
CREATE TABLE IF NOT EXISTS desa_profil (
  id BIGINT PRIMARY KEY,
  data LONGTEXT
);

CREATE TABLE IF NOT EXISTS slider (
  id BIGINT PRIMARY KEY,
  data LONGTEXT
);

CREATE TABLE IF NOT EXISTS galeri (
  id BIGINT PRIMARY KEY,
  data LONGTEXT
);

CREATE TABLE IF NOT EXISTS listing (
  id BIGINT PRIMARY KEY,
  data LONGTEXT
);

CREATE TABLE IF NOT EXISTS apbdesa (
  id BIGINT PRIMARY KEY,
  data LONGTEXT
);

CREATE TABLE IF NOT EXISTS idm (
  id BIGINT PRIMARY KEY,
  data LONGTEXT
);

CREATE TABLE IF NOT EXISTS program (
  id BIGINT PRIMARY KEY,
  data LONGTEXT
);

CREATE TABLE IF NOT EXISTS pendidikan (
  id BIGINT PRIMARY KEY,
  data LONGTEXT
);

CREATE TABLE IF NOT EXISTS statistik_tambahan (
  id BIGINT PRIMARY KEY,
  data LONGTEXT
);

CREATE TABLE IF NOT EXISTS pembangunan (
  id BIGINT PRIMARY KEY,
  nama VARCHAR(255),
  lokasi VARCHAR(255),
  anggaran VARCHAR(100),
  sumber_dana VARCHAR(150),
  progress INT,
  foto VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS statistik (
  id BIGINT PRIMARY KEY,
  judul VARCHAR(255),
  tipe VARCHAR(50),
  labels LONGTEXT,
  data LONGTEXT
);

CREATE TABLE IF NOT EXISTS desa_config (
  id INT NOT NULL AUTO_INCREMENT,
  config_key VARCHAR(100) NOT NULL,
  config_value LONGTEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY config_key (config_key)
);

CREATE TABLE IF NOT EXISTS settings (
  key_name VARCHAR(255) NOT NULL PRIMARY KEY,
  value_data LONGTEXT
);
