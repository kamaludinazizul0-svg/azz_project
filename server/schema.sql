DROP TABLE IF EXISTS berita;
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

DROP TABLE IF EXISTS agenda;
CREATE TABLE IF NOT EXISTS agenda (
  id BIGINT PRIMARY KEY,
  nama VARCHAR(255),
  tanggal VARCHAR(50),
  waktu VARCHAR(50),
  lokasi VARCHAR(255),
  deskripsi TEXT
);

DROP TABLE IF EXISTS surat;
CREATE TABLE IF NOT EXISTS surat (
  id BIGINT PRIMARY KEY,
  nama VARCHAR(255),
  nik VARCHAR(50),
  alamat TEXT,
  no_wa VARCHAR(50),
  jenis_surat VARCHAR(150),
  keperluan TEXT,
  lampiran_ktp VARCHAR(255),
  lampiran VARCHAR(255),
  created_at VARCHAR(100),
  workflow_stage VARCHAR(50) DEFAULT 'Operator',
  status VARCHAR(50) DEFAULT 'Pending',
  catatan TEXT,
  hasil_surat VARCHAR(255)
);

DROP TABLE IF EXISTS pengaduan;
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

DROP TABLE IF EXISTS permohonan_info;
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

DROP TABLE IF EXISTS perangkat;
CREATE TABLE IF NOT EXISTS perangkat (
  id BIGINT PRIMARY KEY,
  nama VARCHAR(255),
  jabatan VARCHAR(150),
  foto VARCHAR(255),
  nip VARCHAR(100),
  periode VARCHAR(100),
  urutan INT
);

DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY,
  username VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  nama VARCHAR(150),
  role VARCHAR(50)
);

DROP TABLE IF EXISTS logs;
CREATE TABLE IF NOT EXISTS logs (
  id BIGINT PRIMARY KEY,
  waktu VARCHAR(100),
  username VARCHAR(100),
  aksi VARCHAR(100),
  detail TEXT
);

DROP TABLE IF EXISTS mitra;
CREATE TABLE IF NOT EXISTS mitra (
  id BIGINT PRIMARY KEY,
  nama VARCHAR(255),
  deskripsi TEXT,
  kontak VARCHAR(100),
  foto VARCHAR(255),
  link VARCHAR(255)
);

DROP TABLE IF EXISTS ppid;
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
