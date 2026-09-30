# Class 1-B Task Management & E-Learning Platform

Workspace kolaboratif dan platform akademik terpadu internal khusus untuk satu kelas: **Kelas 1-B**.

Dibangun dengan prinsip desain **clean, minimal, professional, academic productivity software** (tanpa dekorasi AI-generated yang berlebihan), arsitektur **Public-First**, performa tinggi, dan efisiensi penyimpanan database.

---

## 🚀 Fitur Utama

### 1. Public-First Architecture
- Akses publik instan tanpa login untuk tamu dan mahasiswa:
  - **Public Dashboard**: Agenda batas waktu tugas terdekat, materi kuliah terbaru, pengumuman tersemat, dan ringkasan mata kuliah semester.
  - **Public Tasks**: Daftar tugas kelas 1-B dengan filter mata kuliah, prioritas, dan status.
  - **Public Materials**: Katalog materi kuliah, modul PDF, slide presentasi, dan tautan referensi.
  - **Public Announcements**: Papan pengumuman akademik resmi kelas.

### 2. Autentikasi & Alur Password Aman
- Menggunakan **Supabase Auth** di sisi server (Server-Side Architecture).
- **Tanpa Pendaftaran Publik (No Public Sign-Up)**: Akun mahasiswa dikelola secara terpusat oleh Admin.
- **Initial Password Flow**: Mahasiswa menerima password default yang dapat dikonfigurasi melalui `DEFAULT_INITIAL_PASSWORD`.
- **Force Change Password**: Saat pertama kali login, akun yang memiliki flag `mustChangePassword = true` otomatis diarahkan ke `/change-password` dan tidak dapat mengakses fitur internal sebelum mengganti password.
- **Admin Password Reset**: Admin dapat mereset password mahasiswa bermasalah ke password default baru via Server-Side Admin API. Sistem tidak pernah menampilkan atau menyimpan password lama mahasiswa.

### 3. Role-Based Access Control (RBAC)
Empat tingkat otorisasi yang ditegakkan secara ketat di server:
- **GUEST**: Read-only publik (Dashboard, Tasks, Materials, Announcements). Tidak dapat melakukan mutasi data atau melihat area privat.
- **MEMBER** (Mahasiswa Reguler):
  - Dashboard Personal (Tugas saya, status pengerjaan, deadline mendesak, overdue warning).
  - Mengatur progress mandiri (Todo, In Progress, Review, Done & slider 0-100%).
  - Mengunduh materi pembelajaran.
  - Mengumpulkan penugasan & praktikum (file upload PDF/DOCX/ZIP atau link).
  - Manajemen profil & ganti password.
- **PJ** (Pengurus Mata Kuliah / Kelas):
  - Semua hak akses Member.
  - Membuat dan mengedit tugas kelas.
  - Membuat penugasan praktikum dan mengunggah materi modul.
  - Menerbitkan pengumuman kelas.
  - Hanya dapat mengedit/menghapus konten yang dibuatnya sendiri.
- **ADMIN** (Superuser Kelas — `damarraditya@gmail.com`):
  - Full control atas seluruh entitas dan mata kuliah.
  - Manajemen anggota (Ubah role, reset password, aktivasi/deaktivasi akun).
  - Log audit aktivitas kelas.
  - **Mode "View As" (Preview Mode)**: Menguji tampilan antarmuka dari sudut pandang Guest, Member, atau PJ tanpa merusak sesi autentikasi asli dan dengan perlindungan blokir mutasi otomatis selama mode preview aktif.

### 4. Manajemen Tugas (Task Management)
- Tampilan fleksibel:
  - **All Tasks** (Tabel dengan pencarian teks, filter mata kuliah, filter prioritas, dan filter status).
  - **My Tasks** (Khusus tugas yang ditujukan ke seluruh kelas atau di-assign ke user).
  - **Kanban Board** (Kolom TODO, IN PROGRESS, REVIEW, DONE).
  - **Calendar View** (Visualisasi deadline tugas berdasarkan tanggal).
  - **Task Detail Modal** (Informasi detail, lampiran, dan statistik agregat pengerjaan kelas).
- **Efisiensi Database**:
  - Target default: **Semua Mahasiswa (`ALL`)** — tidak membuat baris `TaskAssignment` redundan untuk setiap mahasiswa.
  - Target **Mahasiswa Tertentu (`SPECIFIC`)**: Dilengkapi komponen pemilih anggota dengan pencarian, multi-select, badge counter, dan tombol pilih/reset semua.
  - **Lazy Progress Tracking**: Record `TaskProgress` per mahasiswa hanya dibuat/di-upsert saat mahasiswa pertama kali berinteraksi dengan tugas terkait.

### 5. E-Learning & Materi Terpusat (Supabase Storage)
- Hierarki: `Mata Kuliah` -> `Topik / Bab` -> `Materi`.
- Berkas fisik disimpan di **Supabase Storage** (bucket `materials` dan `submissions`) dengan pembatasan ukuran maksimal 10 MB dan validasi tipe berkas (PDF, DOC/DOCX, PPT/PPTX, TXT, ZIP).
- Satu berkas materi hanya diunggah satu kali dan digunakan bersama oleh seluruh kelas (tidak ada duplikasi berkas per mahasiswa).
- Pilihan visibilitas: `PUBLIC` atau `AUTHENTICATED`.

### 6. Penugasan & Pengumpulan (Assignments & Submissions)
- Pengumuman tugas laporan praktikum dengan batas waktu resmi.
- Pengumpulan berkas atau tautan pengerjaan mandiri.
- Deteksi otomatis pengumpulan terlambat (*Late Submission*) berdasarkan timestamp batas waktu vs timestamp penyerahan.

### 7. Audit Logging
- Pencatatan seluruh aksi penting (pembuatan tugas, upload materi, perubahan role, pengumpulan tugas, reset password) pada tabel `ActivityLog` tanpa menyimpan data sensitif/password.

---

## 🛠 Stack Teknologi

- **Framework**: [Next.js](https://nextjs.org/) App Router (TypeScript strict)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI System**: [shadcn/ui](https://ui.shadcn.com/) dengan `@base-ui/react` primitives
- **ORM & Source of Truth**: [Prisma ORM](https://www.prisma.io/)
- **Database & Auth & Storage**: [Supabase](https://supabase.com/) (PostgreSQL + Supabase Auth + Supabase Storage)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/)
- **Validation**: [Zod](https://zod.dev/)

---

## 📋 Langkah Instalasi & Menjalankan Lokal

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd e-learning-1b
npm install
```

### 2. Konfigurasi Environment Variables

Salin template file `.env.example` ke `.env.local` dan `.env`:

```bash
cp .env.example .env.local
cp .env.example .env
```

Buka `.env.local` dan lengkapi dengan kredensial Supabase project Anda:

```env
# Koneksi Database PostgreSQL Supabase
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Kredensial Supabase API
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUz..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUz..."

# Password Awal Mahasiswa
DEFAULT_INITIAL_PASSWORD="pwuinjkt"
```

> **Catatan Keamanan:** Jangan pernah melakukan commit file `.env.local` atau mengekspos `SUPABASE_SERVICE_ROLE_KEY` ke sisi klien (browser).

### 3. Migrasi Database & Setup Storage Supabase

Jalankan Prisma migration untuk membuat tabel, relasi, indeks, Row Level Security (RLS), dan bucket storage Supabase:

```bash
npx prisma migrate dev
```

atau untuk deployment produksi:

```bash
npx prisma migrate deploy
```

File SQL yang dieksekusi berada di:
`prisma/migrations/20260929000000_init/migration.sql`

File tersebut secara otomatis mengonfigurasi:
- Tabel data aplikasi (`classes`, `profiles`, `class_memberships`, `courses`, `topics`, `materials`, `tasks`, `task_assignments`, `task_progress`, `assignments`, `submissions`, `announcements`, `activity_logs`).
- Indeks untuk query performa tinggi.
- `ENABLE ROW LEVEL SECURITY` pada seluruh tabel.
- Pembuatan storage bucket `materials` dan `submissions` di Supabase Storage beserta policy aksesnya.

### 4. Seed Data Awal (Idempotent)

Jalankan script seed untuk menginisialisasi Kelas 1-B, mendaftarkan 32 mahasiswa ke Supabase Auth & profil database, mengangkat admin default, serta membuat sample mata kuliah dan penugasan awal:

```bash
npm run db:seed
```

Data seed mencakup:
- **Kelas**: `Kelas 1-B` (Kode: `1-B`)
- **Admin**: `damarraditya@gmail.com` (Role: `ADMIN`)
- **Mahasiswa**: 31 email mahasiswa lainnya (Role: `MEMBER`, `mustChangePassword = true`)
- **Sample Mata Kuliah**: Matematika Diskrit, Literasi Digital, Pemrograman Berorientasi Objek, dll.

### 5. Jalankan Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) pada browser Anda.

---

## 🧪 Validasi Kualitas Kode & Build

Untuk memastikan kode bersih dari error tipe maupun linting sebelum deployment:

```bash
# Validasi tipe TypeScript
npx tsc --noEmit

# Linting kode
npm run lint

# Production Build
npm run build
```

Semua pengujian lolos tanpa error dan tanpa peringatan (*0 errors, 0 warnings*).

---

## 👥 Pengguna Awal Terdaftar

Akun admin dan 31 mahasiswa berikut terdaftar pada inisialisasi awal Kelas 1-B:

| No | Email | Role Awal |
|---|---|---|
| 1 | `damarraditya@gmail.com` | **ADMIN** |
| 2 | `prabulintangpamungkas@gmail.com` | MEMBER |
| 3 | `syamilhanifalfatih@gmail.com` | MEMBER |
| 4 | `adrianbagastiaagusani@gmail.com` | MEMBER |
| 5 | `muhammadzaatulkahfi@gmail.com` | MEMBER |
| 6 | `irenasyaukanirustam@gmail.com` | MEMBER |
| 7 | `fachrihasanpatrisa@gmail.com` | MEMBER |
| 8 | `mnabilarrizki@gmail.com` | MEMBER |
| 9 | `riziqwafialmajid@gmail.com` | MEMBER |
| 10 | `muhammadirsyaadfadillah@gmail.com` | MEMBER |
| 11 | `fatihnathansyahirawan@gmail.com` | MEMBER |
| 12 | `ahmadfauzannadhir@gmail.com` | MEMBER |
| 13 | `fikrirahmadhan@gmail.com` | MEMBER |
| 14 | `muhammadihsanfirzatullah@gmail.com` | MEMBER |
| 15 | `fajardwikihermawan@gmail.com` | MEMBER |
| 16 | `zahranhakim@gmail.com` | MEMBER |
| 17 | `arifalpianrizky@gmail.com` | MEMBER |
| 18 | `rasyahaikalakbar@gmail.com` | MEMBER |
| 19 | `muhammadfaizrabbani@gmail.com` | MEMBER |
| 20 | `farrassyahmiakram@gmail.com` | MEMBER |
| 21 | `muhammadabidzarzuhdi@gmail.com` | MEMBER |
| 22 | `dhafinmarifatulmuslim@gmail.com` | MEMBER |
| 23 | `asyrafzahiruladam@gmail.com` | MEMBER |
| 24 | `ihsanulfalah@gmail.com` | MEMBER |
| 25 | `zalfaadhwaghina@gmail.com` | MEMBER |
| 26 | `mohrizkiakbar@gmail.com` | MEMBER |
| 27 | `heidaraliramadhani@gmail.com` | MEMBER |
| 28 | `efanimanulhaqsubhan@gmail.com` | MEMBER |
| 29 | `muhammadghalibbandono@gmail.com` | MEMBER |
| 30 | `muhamadsaidridho@gmail.com` | MEMBER |
| 31 | `nadyasafiraamalia@gmail.com` | MEMBER |
| 32 | `wahyusetiyawan@gmail.com` | MEMBER |

---

## 🔒 Keamanan & Kebijakan Data
- Database dilindungi Row Level Security (RLS).
- Seluruh mutasi divalidasi dan diotorisasi di server menggunakan helper terpusat `requireUser()`, `requireRole()`, `requireAdmin()`, dan `requirePJ()`.
- Input divalidasi ketat menggunakan Zod schema sebelum menyentuh query database.
- Unggahan berkas diverifikasi tipe MIME dan batas ukuran di server sebelum diteruskan ke Supabase Storage.
