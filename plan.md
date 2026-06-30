# PLAN.md — Implementasi Alfarizi Plaza

## 1. Ringkasan Project

**Alfarizi Plaza** adalah personal portfolio website berbentuk **interactive pixel RPG portfolio**. Website ini bukan portfolio scroll biasa, tetapi dunia kecil bergaya **Pokémon jadul / old handheld RPG** yang bisa dijelajahi oleh user.

User menggerakkan karakter player menggunakan tombol **WASD**, mendekati NPC, bangunan, atau object tertentu, lalu menekan tombol **F** untuk berinteraksi.

Project ini tidak menggunakan sistem masuk ke dalam bangunan. Semua bangunan hanya menjadi **object interaktif** yang membuka modal portfolio.

## 2. Konsep Utama

| Komponen    | Fungsi                                                                      |
| ----------- | --------------------------------------------------------------------------- |
| PNG Asset   | Visual game: player, NPC, building, UI, icons, object                       |
| JSON Data   | Konten portfolio dan konfigurasi map                                        |
| JavaScript  | Engine ringan untuk render, movement, collision, interaction, dialog, modal |
| HTML/CSS    | Shell website, canvas/game area, UI layer                                   |
| PDF         | Dokumen formal untuk CV dan sertifikat                                      |
| PNG Preview | Preview visual sertifikat di dalam modal/frame                              |

## 3. Output Akhir yang Diharapkan

| Output               | Deskripsi                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Static web portfolio | Bisa berjalan tanpa backend                                                                   |
| Pixel game interface | Visual tetap pixelated dan old RPG                                                            |
| Player movement      | Player bisa bergerak dengan WASD                                                              |
| Collision            | Player tidak bisa menembus object                                                             |
| Interaction prompt   | Muncul `[F] Talk`, `[F] Read`, atau `[F] Interact`                                            |
| NPC dialog           | Dialog muncul dari `npc_dialogs.json`                                                         |
| Portfolio modal      | Project, skills, education, professional, organization, achievement, contact tampil dari JSON |
| CV viewer            | CV tampil sebagai scroll/modal dan PDF bisa dibuka/download                                   |
| Certificate viewer   | Sertifikat tampil dengan frame pixel dan PDF bisa dibuka/download                             |

## 4. Struktur Folder Project

```text
NEW-PORTFOLIO/
├── index.html
├── src/
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── main.js
│       ├── config.js
│       ├── assetLoader.js
│       ├── dataLoader.js
│       ├── mapRenderer.js
│       ├── playerController.js
│       ├── collisionManager.js
│       ├── interactionManager.js
│       ├── dialogManager.js
│       └── modalManager.js
└── assets/
    ├── building/
    ├── characters/
    ├── data/
    ├── docs/
    ├── icons/
    ├── images/
    ├── maps/
    ├── objects/
    ├── tilesets/
    └── ui/
```

## 5. Asset Utama yang Sudah Dibangun

### 5.1 Building / Section Object

| File                                             | Fungsi                          |
| ------------------------------------------------ | ------------------------------- |
| `assets/building/building_project_lab.png`       | Membuka daftar project          |
| `assets/building/building_skill_center.png`      | Membuka daftar skills           |
| `assets/building/building_campus_hall.png`       | Membuka education               |
| `assets/building/building_career_office.png`     | Membuka professional experience |
| `assets/building/building_organization_base.png` | Membuka organization experience |
| `assets/building/building_achievement_arena.png` | Membuka achievements            |
| `assets/building/building_contact_gate.png`      | Membuka contact dan CV          |

### 5.2 Player

| File                                              | Fungsi              |
| ------------------------------------------------- | ------------------- |
| `assets/characters/player/player_spritesheet.png` | Sprite player utama |
| `assets/characters/player/player_raw.png`         | Raw/cadangan player |

### 5.3 NPC

| File                                             | Fungsi             |
| ------------------------------------------------ | ------------------ |
| `assets/characters/npc/npc_father.png`           | NPC Father         |
| `assets/characters/npc/npc_mother_hijab.png`     | NPC Mother         |
| `assets/characters/npc/npc_older_brother.png`    | NPC Older Brother  |
| `assets/characters/npc/npc_girlfriend_hijab.png` | NPC Girlfriend     |
| `assets/characters/npc/npc_pak_nurrochman.png`   | NPC Pak Nurrochman |
| `assets/characters/npc/npc_zhafran.png`          | NPC Zhafran        |
| `assets/characters/npc/npc_thofa.png`            | NPC Thofa          |

### 5.4 Object

| File                                               | Fungsi                   |
| -------------------------------------------------- | ------------------------ |
| `assets/objects/plaza/statue_alfarizi.png`         | Landmark utama plaza     |
| `assets/objects/prasasti/prasasti_alfarizi.png`    | Readable identity object |
| `assets/objects/plaza/spawn_marker.png`            | Penanda spawn player     |
| `assets/objects/contact_gate/object_cv_scroll.png` | Visual scroll untuk CV   |

### 5.5 UI

| File                                 | Fungsi                          |
| ------------------------------------ | ------------------------------- |
| `assets/ui/interaction_talk.png`     | Prompt interaksi NPC            |
| `assets/ui/interaction_read.png`     | Prompt baca object              |
| `assets/ui/interaction_interact.png` | Prompt interaksi building/modal |
| `assets/ui/ui_dialog_box.png`        | Dialog box                      |
| `assets/ui/ui_dialog_nameplate.png`  | Background nama NPC             |
| `assets/ui/ui_dialog_arrow.png`      | Indikator lanjut dialog         |
| `assets/ui/ui_modal_panel.png`       | Modal panel                     |
| `assets/ui/ui_button_default.png`    | Button default                  |
| `assets/ui/ui_close_button.png`      | Close button                    |
| `assets/ui/ui_control_hint.png`      | Hint kontrol                    |
| `assets/ui/ui_certificate_frame.png` | Frame sertifikat                |

### 5.6 Icons

| File                                    | Fungsi         |
| --------------------------------------- | -------------- |
| `assets/icons/icon_email_pixel.png`     | Icon email     |
| `assets/icons/icon_github_pixel.png`    | Icon GitHub    |
| `assets/icons/icon_linkedin_pixel.png`  | Icon LinkedIn  |
| `assets/icons/icon_instagram_pixel.png` | Icon Instagram |
| `assets/icons/icon_cv_pixel.png`        | Icon CV        |

### 5.7 Docs dan Images

| File                                                         | Fungsi                          |
| ------------------------------------------------------------ | ------------------------------- |
| `assets/docs/cv_muhammad_alfarizi_habibullah.pdf`            | CV formal                       |
| `assets/docs/cert_bangkit.pdf`                               | Sertifikat Bangkit              |
| `assets/docs/cert_coding_camp.pdf`                           | Sertifikat Coding Camp          |
| `assets/docs/tech_for_ummah_ki_ptkin_2025_certificate.pdf`   | Sertifikat lomba Tech For Ummah |
| `assets/images/cert_bangkit.png`                             | Preview sertifikat Bangkit      |
| `assets/images/cert_coding_camp.png`                         | Preview sertifikat Coding Camp  |
| `assets/images/tech_for_ummah_ki_ptkin_2025_certificate.png` | Preview sertifikat lomba        |
| `assets/images/hmps.png`                                     | Gambar organisasi HMPS/HMIT     |

## 6. Data JSON yang Sudah Dibangun

| File                            | Fungsi                                      |
| ------------------------------- | ------------------------------------------- |
| `assets/data/profile.json`      | Identitas utama dan konsep portfolio        |
| `assets/data/npc_dialogs.json`  | Dialog semua NPC                            |
| `assets/data/projects.json`     | Daftar project utama                        |
| `assets/data/skills.json`       | Daftar skills                               |
| `assets/data/education.json`    | Pendidikan dan bootcamp                     |
| `assets/data/professional.json` | Internship/professional experience          |
| `assets/data/organization.json` | Pengalaman organisasi                       |
| `assets/data/achievements.json` | Achievement kompetisi                       |
| `assets/data/contact.json`      | Email, GitHub, LinkedIn, Instagram, CV      |
| `assets/data/cv.json`           | CV versi structured data untuk scroll/modal |

## 7. Map JSON yang Sudah Dibangun

| File                               | Fungsi                                                    |
| ---------------------------------- | --------------------------------------------------------- |
| `assets/maps/alfarizi_plaza.json`  | Konfigurasi world, player, object, NPC, layer, dan posisi |
| `assets/maps/interactions.json`    | Definisi interaksi tombol F                               |
| `assets/maps/collision_layer.json` | Collider object, NPC, building, dan batas map             |

## 8. Prinsip Implementasi

| Prinsip                 | Penjelasan                                       |
| ----------------------- | ------------------------------------------------ |
| Static first            | Project harus bisa berjalan tanpa backend        |
| JSON-driven             | Konten dan konfigurasi harus dibaca dari JSON    |
| Minimal hardcode        | Hindari menulis data portfolio langsung di JS    |
| Pixelated visual        | Gunakan `image-rendering: pixelated`             |
| No building interior    | Tidak ada scene masuk bangunan                   |
| Modal-based interaction | Building membuka modal, bukan scene baru         |
| Progressive build       | Bangun kecil, test, fix, baru lanjut             |
| Debuggable              | Error asset/path harus terlihat jelas di console |
| Clean structure         | JS dibuat modular agar mudah dirawat             |

## 9. Planning Implementasi per Sesi

| Sesi | Fokus                   | Tujuan                                                                           | Output yang Diharapkan                                                                                                          | Evaluasi                                                                                           |
| ---- | ----------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 0    | Audit Project           | AI agent memahami struktur folder, asset, JSON, dan arah project sebelum coding. | Ringkasan struktur project, dependency asset-data, potensi path error, dan daftar file penting.                                 | Agent tidak langsung coding. Agent bisa menjelaskan PNG = visual, JSON = data/config, JS = engine. |
| 1    | Setup Website Dasar     | Membuat fondasi static website.                                                  | `index.html`, `src/css/style.css`, `src/js/main.js`. Canvas/game container muncul.                                              | Browser bisa membuka halaman tanpa console error.                                                  |
| 2    | JSON & Asset Loader     | Membuat loader untuk membaca JSON dan preload gambar.                            | `dataLoader.js`, `assetLoader.js`. Bisa load `alfarizi_plaza.json`, `interactions.json`, `collision_layer.json`, dan asset PNG. | Console menunjukkan JSON terbaca. Jika path salah, muncul warning/error jelas.                     |
| 3    | Render Map & Object     | Menampilkan asset world berdasarkan `alfarizi_plaza.json`.                       | Building, statue, prasasti, NPC, spawn marker, dan player tampil di canvas.                                                     | Posisi asset masuk akal. Semua gambar tampil pixelated.                                            |
| 4    | Player Movement         | Player bisa bergerak dengan WASD.                                                | `playerController.js`. Player bergerak atas, bawah, kiri, kanan.                                                                | Gerakan stabil, tidak terlalu cepat, tidak keluar world.                                           |
| 5    | Collision System        | Mencegah player menembus object.                                                 | `collisionManager.js`. Collider dibaca dari `collision_layer.json`.                                                             | Player tidak bisa menembus building, NPC, statue, prasasti, dan batas map.                         |
| 6    | Interaction Prompt      | Menampilkan prompt saat player dekat object interaktif.                          | `interactionManager.js`. Muncul `[F] Talk`, `[F] Read`, atau `[F] Interact`.                                                    | Prompt muncul hanya saat dekat target dan hilang saat menjauh. Target terdekat diprioritaskan.     |
| 7    | Dialog System           | Mengaktifkan dialog NPC dan readable object.                                     | `dialogManager.js`. Dialog NPC dari `npc_dialogs.json` tampil di `ui_dialog_box.png`.                                           | Nama NPC tampil, teks tidak overflow, dialog bisa lanjut dan ditutup.                              |
| 8    | Modal Portfolio         | Membuka data portfolio melalui building.                                         | `modalManager.js`. Project, skills, education, professional, organization, achievement, contact tampil dari JSON.               | Semua building bisa membuka data yang sesuai. UI tetap pixel RPG, bukan dashboard modern.          |
| 9    | CV & Certificate Viewer | Mengaktifkan fitur CV dan sertifikat.                                            | CV scroll tampil dari `cv.json`. Sertifikat tampil dengan `ui_certificate_frame.png`. PDF bisa view/download.                   | Tombol View/Download CV dan certificate berjalan. Path PDF dan preview benar.                      |
| 10   | Polish & QA             | Merapikan visual, bug, dan usability.                                            | Final pass untuk UI, modal, dialog, collision, responsive desktop, dan console error.                                           | Semua fitur utama jalan tanpa error. Game terasa rapi, pixelated, dan konsisten.                   |

## 10. Detail File per Sesi

| Sesi | File Utama yang Dibuat/Diubah                       | Catatan                                                      |
| ---- | --------------------------------------------------- | ------------------------------------------------------------ |
| 0    | Tidak ada file baru                                 | Hanya audit dan pemahaman struktur project                   |
| 1    | `index.html`, `src/css/style.css`, `src/js/main.js` | Fondasi awal website                                         |
| 2    | `src/js/dataLoader.js`, `src/js/assetLoader.js`     | Loader harus reusable                                        |
| 3    | `src/js/mapRenderer.js`                             | Render object dari `assets/maps/alfarizi_plaza.json`         |
| 4    | `src/js/playerController.js`                        | Movement bisa statis dulu, animasi spritesheet bisa menyusul |
| 5    | `src/js/collisionManager.js`                        | Collider diambil dari JSON, bukan hardcode di JS             |
| 6    | `src/js/interactionManager.js`                      | Deteksi jarak player dengan target dari `interactions.json`  |
| 7    | `src/js/dialogManager.js`                           | Dialog NPC dari `npc_dialogs.json`                           |
| 8    | `src/js/modalManager.js`                            | Modal membaca file data JSON                                 |
| 9    | `modalManager.js`, helper tambahan bila perlu       | CV scroll, preview sertifikat, open PDF, download PDF        |
| 10   | Semua file terkait                                  | Refactor kecil, bugfix, polish, QA                           |

## 11. Checklist Evaluasi Setiap Sesi

| Poin Evaluasi      | Pertanyaan                                                         |
| ------------------ | ------------------------------------------------------------------ |
| Struktur file      | Apakah file dibuat di folder yang benar?                           |
| Console            | Apakah ada error di browser console?                               |
| Asset path         | Apakah semua path asset sesuai folder project?                     |
| Data source        | Apakah data diambil dari JSON, bukan hardcode berlebihan?          |
| Visual style       | Apakah tetap pixelated dan old RPG?                                |
| Fungsi utama       | Apakah fitur sesi tersebut benar-benar berjalan?                   |
| Tidak lompat fitur | Apakah agent tidak mengerjakan fitur sesi berikutnya terlalu jauh? |
| Maintainability    | Apakah kode cukup modular dan mudah dibaca?                        |

## 12. Checklist Fitur Akhir

| Area              | Ekspektasi                                  |
| ----------------- | ------------------------------------------- |
| Player            | Muncul di spawn marker dan bisa bergerak    |
| WASD              | Movement berjalan stabil                    |
| Collision         | Player tidak menembus object                |
| Project Lab       | Membuka `projects.json`                     |
| Skill Center      | Membuka `skills.json`                       |
| Campus Hall       | Membuka `education.json`                    |
| Career Office     | Membuka `professional.json`                 |
| Organization Base | Membuka `organization.json`                 |
| Achievement Arena | Membuka `achievements.json`                 |
| Contact Corner    | Membuka `contact.json`                      |
| CV                | Bisa preview scroll, view PDF, dan download |
| Certificate       | Bisa preview PNG, view PDF, dan download    |
| NPC               | Semua NPC bisa dialog                       |
| Statue            | Bisa dibaca                                 |
| Prasasti          | Bisa dibaca                                 |
| Prompt F          | Muncul sesuai target                        |
| UI                | Tetap pixelated dan konsisten               |

## 13. Prioritas Implementasi

| Prioritas | Yang Dikerjakan      | Alasan                                      |
| --------- | -------------------- | ------------------------------------------- |
| 1         | Setup + loader       | Tanpa ini asset dan data tidak bisa dipakai |
| 2         | Render map           | Harus melihat dunia game muncul dulu        |
| 3         | Movement + collision | Inti eksplorasi player                      |
| 4         | Interaction prompt   | Menghubungkan player dengan object          |
| 5         | Dialog + modal       | Menghidupkan isi portfolio                  |
| 6         | CV + certificate     | Fitur lanjutan setelah modal dasar stabil   |
| 7         | Polish               | Setelah fitur utama berjalan                |

## 14. Aturan Saat Bekerja dengan AI Agent

| Kondisi                 | Tindakan                                             |
| ----------------------- | ---------------------------------------------------- |
| Satu sesi belum selesai | Jangan lanjut ke sesi berikutnya                     |
| Ada console error       | Fix dulu sebelum menambah fitur                      |
| Asset tidak muncul      | Cek path asset dan loader                            |
| Posisi object tidak pas | Revisi `alfarizi_plaza.json`                         |
| Collision tidak pas     | Revisi `collision_layer.json`                        |
| Prompt salah target     | Revisi `interactions.json` atau logic nearest target |
| UI terlalu modern       | Kembalikan ke pixel RPG style                        |
| Data di-hardcode        | Refactor agar membaca dari JSON                      |
| Player stuck            | Cek collider dan player hitbox                       |
| Modal overflow          | Perbaiki CSS dan layout modal                        |

## 15. Prinsip Visual

| Elemen      | Prinsip                                           |
| ----------- | ------------------------------------------------- |
| Canvas      | Harus pixelated                                   |
| Asset PNG   | Jangan blur                                       |
| Modal       | Gunakan gaya pixel panel                          |
| Dialog      | Gunakan dialog box RPG                            |
| Button      | Gunakan button pixel                              |
| Certificate | Preview dalam frame pixel                         |
| CV          | Tampil sebagai scroll/surat gulung                |
| Font        | Gunakan font pixel/legal jika tersedia            |
| Efek visual | Hindari glassmorphism atau efek modern berlebihan |

## 16. Prompt Strategy

Setiap prompt ke AI agent sebaiknya memiliki format:

```text
Konteks:
- Jelaskan sesi saat ini.
- Jelaskan file yang boleh dibuat/diubah.
- Jelaskan file yang tidak boleh diubah.

Tujuan:
- Jelaskan fitur yang harus selesai.

Batasan:
- Jangan mengerjakan fitur sesi berikutnya.
- Jangan mengubah struktur asset.
- Jangan hardcode data portfolio.
- Gunakan JSON sebagai source of truth.

Ekspektasi:
- Sebutkan output file.
- Sebutkan cara test.
- Sebutkan acceptance criteria.

Setelah selesai:
- Agent harus menjelaskan file apa yang dibuat.
- Agent harus menjelaskan cara menjalankan/test.
- Agent harus menyebut potensi issue.
```

## 17. Acceptance Criteria MVP

MVP dianggap selesai jika:

| Kriteria                              | Status |
| ------------------------------------- | ------ |
| Website bisa dibuka dari `index.html` | Wajib  |
| Canvas/game area tampil               | Wajib  |
| Player tampil                         | Wajib  |
| Player bisa WASD                      | Wajib  |
| Object utama tampil                   | Wajib  |
| Collision aktif                       | Wajib  |
| Prompt F aktif                        | Wajib  |
| Dialog NPC aktif                      | Wajib  |
| Modal building aktif                  | Wajib  |
| Contact link aktif                    | Wajib  |
| CV bisa view/download                 | Wajib  |
| Certificate bisa view/download        | Wajib  |
| Tidak ada console error utama         | Wajib  |
| Visual tetap pixelated                | Wajib  |

## 18. Catatan Penting

* Project ini adalah static portfolio berbasis game, bukan game RPG kompleks.
* Tidak perlu backend untuk MVP.
* Tidak perlu database.
* Tidak perlu login.
* Tidak perlu masuk ke bangunan.
* Semua data portfolio harus dibaca dari JSON.
* Asset final menggunakan `.png`.
* PDF digunakan untuk dokumen formal.
* Preview dokumen menggunakan `.png`.
* Google Drive tidak diperlukan jika file sudah disimpan lokal di project.
* Fokus utama adalah pengalaman portfolio yang interaktif, rapi, personal, dan mudah dijelajahi.
