# 🕌 Jadwal Sholat Digital - Markaz RSUD dr. R. Koesma Tuban

Aplikasi web modern, responsif, dan akurat untuk menampilkan jadwal waktu sholat, imsakiyah, dan pengingat adzan digital dengan titik markaz hisab astronomis di **RSUD dr. R. Koesma Kabupaten Tuban, Jawa Timur**.

🌐 **Website Live Online:** [https://koesmamr.github.io/jadwal-sholat-rsud-koesma/](https://koesmamr.github.io/jadwal-sholat-rsud-koesma/)

---

## 📍 Parameter Markaz & Hisab Astronomi

| Parameter | Keterangan / Nilai |
|---|---|
| **Lokasi Markaz** | RSUD dr. R. Koesma Tuban, Jawa Timur |
| **Alamat** | Jl. Dr. Wahidin Sudirohusodo No. 800, Tuban, Jatim 62315 |
| **Koordinat Lintang (Lat)** | `-6.8996°` LS (6°53'58.6" S) |
| **Koordinat Bujur (Lng)** | `112.0494°` BT (112°02'57.8" E) |
| **Ketinggian Tempat (Elevasi)** | `~12 mdpl` |
| **Zona Waktu** | WIB (UTC +07:00) |
| **Arah Kiblat** | `294.13°` (Barat Laut / ~24° dari Barat ke Utara) |
| **Jarak ke Ka'bah** | `± 8.580 KM` |
| **Standar Perhitungan** | Kementerian Agama RI (Kemenag) & MABIMS |
| **Koreksi Ihtiyat** | `+2 Menit` (Default Standar Kemenag) |

---

## ✨ Fitur Utama

1. **Jam Digital Real-Time & Kalender Ganda:**
   - Jam digital sinkron detik dengan detil WIB.
   - Tanggal Masehi dan konversi Kalender Hijriah otomatis.

2. **Hitung Mundur Waktu Sholat (Live Countdown):**
   - Mendeteksi waktu sholat berikutnya secara dinamis.
   - Dilengkapi bar visual progres waktu sholat.

3. **8 Waktu Sholat Lengkap:**
   - Imsak, Subuh, Terbit (Syuruq), Dhuha, Dzuhur, Ashar, Maghrib, dan Isya.
   - Indikator kartu yang sedang aktif atau yang berikutnya dengan animasi pulse glow.

4. **🔊 Audio Notifikasi & Adzan:**
   - Web Audio API synthesizer mandiri (suara chime islami merdu tanpa ketergantungan koneksi).
   - Audio Adzan terintegrasi dengan tombol uji suara dan toggle switch.

5. **🧭 Kompas Arah Kiblat Interaktif:**
   - Menghitung azimuth kiblat akurat 294.13° dari RSUD Koesma Tuban.
   - Mendukung sensor orientasi giroskop/kompas bawaan smartphone.

6. **📺 Mode TV Display (Layar Penuh Kiosk):**
   - Khusus monitor TV di lobby rumah sakit, ruang tunggu poliklinik, IGD, maupun Musholla RSUD.
   - Tampilan kontras tinggi dengan running text pengumuman.

7. **📅 Jadwal 1 Bulan Penuh & Siap Cetak (PDF):**
   - Tabel jadwal sholat 1 bulan berjalan.
   - Dilengkapi tombol cetak dengan stylesheet `@media print` rapi untuk ditempel di mading/ruangan.

8. **⚡ 100% Offline Capable & Resilient:**
   - Menggunakan rumus algoritma hisab astronomis lokal di dalam JavaScript murni sehingga tetap berfungsi akurat tanpa koneksi internet sekalipun.

---

## 🛠️ Menjalankan Secara Lokal

Cukup clone repository dan buka file `index.html` di browser apa pun:

```bash
git clone https://github.com/koesmamr/jadwal-sholat-rsud-koesma.git
cd jadwal-sholat-rsud-koesma
# Buka langsung file index.html di browser Anda
```

---

## 📄 Lisensi
Didistribusikan di bawah lisensi MIT. Silakan digunakan dan dimanfaatkan untuk kemaslahatan umat dan RSUD dr. R. Koesma Tuban.
