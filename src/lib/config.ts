/**
 * Konfigurasi Terpusat Aplikasi / Situs
 * Mengatur identitas publik, branding nama kelas, dan setelan akses publik.
 */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_CLASS_NAME || "Kelas 1-B",
  code: process.env.NEXT_PUBLIC_CLASS_CODE || "1-B",
  title: "Platform Akademik & Manajemen Tugas",
  description: "Platform akademik terpadu pemantauan tugas, arsip materi perkuliahan, dan pengumuman kelas.",
  footerText: "Platform Akademik Terpadu & E-Learning",
  publicSchedule: {
    // Jadwal publik tanpa nama dosen dan ruang kecuali diaktifkan di pengaturan
    showLecturer: false,
    showRoom: false,
  },
};

export type SiteConfig = typeof siteConfig;

