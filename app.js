/**
 * ==========================================================================
 * Aplikasi Jadwal Sholat Digital - Mobile-First Edition
 * Titik Markaz: RSUD dr. R. Koesma Tuban, Jawa Timur
 * Koordinat: -6.8996° LS, 112.0494° BT | Elevasi: ~12 mdpl | Zona: WIB (UTC+7)
 * Metode: Hisab Astronomi Standar Kemenag RI / MABIMS
 * ==========================================================================
 */

// Konfigurasi Markaz RSUD dr. R. Koesma Tuban
const CONFIG = {
  markazName: "RSUD dr. R. Koesma Tuban",
  address: "Jl. Dr. Wahidin Sudirohusodo No. 800, Sidorejo, Kec. Tuban, Kab. Tuban, Jawa Timur 62315",
  lat: -6.8996,
  lng: 112.0494,
  elevation: 12, // mdpl
  timezone: 7, // WIB
  qiblaBearing: 294.13, // Derajat dari Utara sejati ke Ka'bah
  kaabaLat: 21.4225,
  kaabaLng: 39.8262,
  defaultIhtiyat: 2 // Koreksi kehati-hatian Kemenag RI (+2 menit)
};

// State Aplikasi
let appState = {
  selectedDate: new Date(),
  dateOffset: 0, // 0 = Hari ini, -1 = Kemarin, 1 = Besok
  ihtiyat: parseInt(localStorage.getItem('koesma_ihtiyat') || CONFIG.defaultIhtiyat, 10),
  soundEnabled: localStorage.getItem('koesma_sound') === 'true',
  audioVolume: parseFloat(localStorage.getItem('koesma_vol') || '0.8'),
  viewMode: localStorage.getItem('koesma_view_mode') || 'list', // 'list' atau 'grid'
  currentTimings: null,
  activePrayerKey: null,
  nextPrayerKey: null,
  compassHeading: 0,
  hasCompassSensor: false,
  tvMode: false,
  tasbihCount: 0
};

// Metadata 8 Waktu Sholat dengan Kaligrafi Arab & Deskripsi
const PRAYER_METADATA = [
  { key: 'imsak', name: 'Imsak', arabic: 'الإمساك', icon: 'moon', desc: 'Batas sahur puasa' },
  { key: 'subuh', name: 'Subuh', arabic: 'الفجر', icon: 'sunrise', desc: 'Fajar shodiq' },
  { key: 'terbit', name: 'Terbit', arabic: 'الشروق', icon: 'sun', desc: 'Syuruq matahari' },
  { key: 'dhuha', name: 'Dhuha', arabic: 'الضحى', icon: 'sun-medium', desc: 'Matahari naik sepenggalah' },
  { key: 'dzuhur', name: 'Dzuhur', arabic: 'الظهر', icon: 'sun', desc: 'Matahari tergelincir' },
  { key: 'ashar', name: 'Ashar', arabic: 'العصر', icon: 'cloud-sun', desc: 'Bayangan menyamai benda' },
  { key: 'maghrib', name: 'Maghrib', arabic: 'المغرب', icon: 'sunset', desc: 'Matahari terbenam' },
  { key: 'isya', name: 'Isya', arabic: 'العشاء', icon: 'moon-star', desc: 'Hilangnya mega merah' }
];

/* -------------------------------------------------------------------------- */
/* 1. ENGINE ASTRONOMI HISAB KEMENAG RI / MABIMS (STANDALONE OFFLINE)         */
/* -------------------------------------------------------------------------- */

class KoesmaPrayerEngine {
  static degToRad(deg) { return (deg * Math.PI) / 180.0; }
  static radToDeg(rad) { return (rad * 180.0) / Math.PI; }

  static fixAngle(a) {
    a = a - 360.0 * Math.floor(a / 360.0);
    return a < 0 ? a + 360.0 : a;
  }

  static fixHour(h) {
    h = h - 24.0 * Math.floor(h / 24.0);
    return h < 0 ? h + 24.0 : h;
  }

  static calculate(date, lat = CONFIG.lat, lng = CONFIG.lng, tz = CONFIG.timezone, ihtiyat = appState.ihtiyat) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    let Y = year;
    let M = month;
    if (M <= 2) {
      Y -= 1;
      M += 12;
    }
    const A = Math.floor(Y / 100);
    const B = 2 - A + Math.floor(A / 4);
    const JD = Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + day + B - 1524.5;

    const D = JD - 2451545.0;
    const g = this.fixAngle(357.529 + 0.98560028 * D);
    const q = this.fixAngle(280.459 + 0.98564736 * D);
    const L = this.fixAngle(q + 1.915 * Math.sin(this.degToRad(g)) + 0.020 * Math.sin(this.degToRad(2 * g)));
    const e = 23.439 - 0.00000036 * D;

    const sinD = Math.sin(this.degToRad(e)) * Math.sin(this.degToRad(L));
    const delta = Math.asin(sinD);
    const cosD = Math.cos(delta);

    const RA = this.fixAngle(this.radToDeg(Math.atan2(Math.cos(this.degToRad(e)) * Math.sin(this.degToRad(L)), Math.cos(this.degToRad(L))))) / 15.0;
    const EqT = q / 15.0 - RA;

    const noon = this.fixHour(12 + tz - (lng / 15.0) - EqT);

    const tAngle = (altitudeDeg) => {
      const latRad = this.degToRad(lat);
      const altRad = this.degToRad(altitudeDeg);
      const cosT = (Math.sin(altRad) - Math.sin(latRad) * sinD) / (Math.cos(latRad) * cosD);
      if (cosT < -1 || cosT > 1) return null;
      return this.radToDeg(Math.acos(cosT)) / 15.0;
    };

    const dip = 0.0347 * Math.sqrt(CONFIG.elevation);
    const sunRadiusDip = -0.833 - dip;

    const subuhT = tAngle(-20.0);
    const terbitT = tAngle(sunRadiusDip);
    const dhuhaT = tAngle(4.5);
    
    const latRad = this.degToRad(lat);
    const asharAltRad = Math.atan(1 / (1 + Math.tan(Math.abs(latRad - delta))));
    const asharT = tAngle(this.radToDeg(asharAltRad));

    const maghribT = tAngle(sunRadiusDip);
    const isyaT = tAngle(-18.0);

    const toTimeStr = (hourVal, extraMin = 0) => {
      const totalMinutes = Math.round((hourVal * 60) + extraMin);
      const h = Math.floor(totalMinutes / 60) % 24;
      const m = totalMinutes % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const subuhHours = noon - subuhT;

    return {
      imsak: toTimeStr(subuhHours, ihtiyat - 10),
      subuh: toTimeStr(subuhHours, ihtiyat),
      terbit: toTimeStr(noon - terbitT, 0),
      dhuha: toTimeStr(noon - dhuhaT, ihtiyat),
      dzuhur: toTimeStr(noon, ihtiyat),
      ashar: toTimeStr(noon + asharT, ihtiyat),
      maghrib: toTimeStr(noon + maghribT, ihtiyat),
      isya: toTimeStr(noon + isyaT, ihtiyat)
    };
  }
}

/* -------------------------------------------------------------------------- */
/* 2. KONVERTER KALENDER HIJRIAH                                              */
/* -------------------------------------------------------------------------- */

function getHijriDate(date) {
  try {
    const hijriFormatter = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return hijriFormatter.format(date);
  } catch (e) {
    const hijriMonths = [
      "Muharram", "Safar", "Rabi'ul Awwal", "Rabi'ul Akhir",
      "Jumadil Ula", "Jumadil Akhir", "Rajab", "Sya'ban",
      "Ramadhan", "Syawwal", "Dzulqa'dah", "Dzulhijjah"
    ];
    let day = date.getDate();
    let month = date.getMonth();
    let year = date.getFullYear();

    let m = month + 1;
    let y = year;
    if (m < 3) {
      y -= 1;
      m += 12;
    }

    let a = Math.floor(y / 100);
    let b = 2 - a + Math.floor(a / 4);
    let jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524;

    let z = jd - 1948440 + 10632;
    let n = Math.floor((z - 1) / 10631);
    z = z - 10631 * n + 354;
    let j = (Math.floor((10985 - z) / 5316)) * (Math.floor((50 * z) / 17719)) + (Math.floor(z / 5670)) * (Math.floor((43 * z) / 15238));
    z = z - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
    let hMonth = Math.floor((24 * z) / 709);
    let hDay = z - Math.floor((709 * hMonth) / 24);
    let hYear = 30 * n + j - 30;

    return `${hDay} ${hijriMonths[hMonth - 1] || 'Bulan Hijriah'} ${hYear} H`;
  }
}

/* -------------------------------------------------------------------------- */
/* 3. AUDIO ENGINE & NOTIFIKASI ADZAN                                         */
/* -------------------------------------------------------------------------- */

let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playAdzanChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [
      { freq: 440.0, time: 0.0, dur: 0.8 },
      { freq: 554.37, time: 0.6, dur: 0.8 },
      { freq: 659.25, time: 1.2, dur: 1.2 },
      { freq: 554.37, time: 2.2, dur: 0.8 },
      { freq: 440.0, time: 2.9, dur: 1.5 }
    ];

    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.time);

      const startTime = ctx.currentTime + n.time;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.35 * appState.audioVolume, startTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + n.dur);
    });
  } catch (err) {
    console.warn("Audio playback error:", err);
  }
}

function triggerAdzanAlert(prayerName) {
  showAdzanPopup(prayerName);

  if (navigator.vibrate) {
    navigator.vibrate([300, 100, 300, 100, 600]);
  }

  if (!appState.soundEnabled) return;

  const audioEl = document.getElementById('adzan-audio-player');
  if (audioEl) {
    audioEl.volume = appState.audioVolume;
    audioEl.play().catch(() => {
      playAdzanChime();
    });
  } else {
    playAdzanChime();
  }
}

function showAdzanPopup(prayerName) {
  const modal = document.getElementById('adzan-alert-modal');
  const title = document.getElementById('adzan-alert-title');
  const message = document.getElementById('adzan-alert-message');
  
  if (title) title.textContent = `Waktu Sholat ${prayerName} Tiba`;
  if (message) message.textContent = `Wilayah RSUD dr. R. Koesma Tuban dan sekitarnya. Mari segera menunaikan sholat berjamaah.`;
  
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeAdzanPopup() {
  const modal = document.getElementById('adzan-alert-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  const audioEl = document.getElementById('adzan-audio-player');
  if (audioEl) {
    audioEl.pause();
    audioEl.currentTime = 0;
  }
}

/* -------------------------------------------------------------------------- */
/* 4. SINKRONISASI JADWAL (ONLINE + OFFLINE)                                   */
/* -------------------------------------------------------------------------- */

async function loadPrayerTimings(targetDate = appState.selectedDate) {
  const localTimings = KoesmaPrayerEngine.calculate(targetDate);
  appState.currentTimings = localTimings;

  try {
    const d = targetDate.getDate();
    const m = targetDate.getMonth() + 1;
    const y = targetDate.getFullYear();
    const dateQuery = `${d}-${m}-${y}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://api.aladhan.com/v1/timings/${dateQuery}?latitude=${CONFIG.lat}&longitude=${CONFIG.lng}&method=20`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.data && data.data.timings) {
        const t = data.data.timings;
        const applyIhtiyat = (timeStr, extraMinutes = 0) => {
          const [hh, mm] = timeStr.split(':').map(Number);
          const total = (hh * 60 + mm + extraMinutes + 1440) % 1440;
          const nh = Math.floor(total / 60);
          const nm = total % 60;
          return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
        };

        const iht = appState.ihtiyat;
        appState.currentTimings = {
          imsak: applyIhtiyat(t.Imsak, iht - 2),
          subuh: applyIhtiyat(t.Fajr, iht - 2),
          terbit: t.Sunrise,
          dhuha: applyIhtiyat(t.Sunrise, 25),
          dzuhur: applyIhtiyat(t.Dhuhr, iht - 2),
          ashar: applyIhtiyat(t.Asr, iht - 2),
          maghrib: applyIhtiyat(t.Maghrib, iht - 2),
          isya: applyIhtiyat(t.Isha, iht - 2)
        };
      }
    }
  } catch (e) {
    // Mode offline / standalone hisab
  }

  renderPrayerSchedule();
  updateCountdown();
}

/* -------------------------------------------------------------------------- */
/* 5. TAMPILAN JADWAL (LIST VIEW VS GRID VIEW PADA HP)                        */
/* -------------------------------------------------------------------------- */

function toggleViewMode(mode) {
  appState.viewMode = mode;
  localStorage.setItem('koesma_view_mode', mode);

  const btnList = document.getElementById('view-btn-list');
  const btnGrid = document.getElementById('view-btn-grid');

  if (btnList && btnGrid) {
    if (mode === 'list') {
      btnList.classList.add('bg-teal-600', 'text-white');
      btnList.classList.remove('text-teal-300', 'hover:bg-teal-900/40');
      btnGrid.classList.remove('bg-teal-600', 'text-white');
      btnGrid.classList.add('text-teal-300', 'hover:bg-teal-900/40');
    } else {
      btnGrid.classList.add('bg-teal-600', 'text-white');
      btnGrid.classList.remove('text-teal-300', 'hover:bg-teal-900/40');
      btnList.classList.remove('bg-teal-600', 'text-white');
      btnList.classList.add('text-teal-300', 'hover:bg-teal-900/40');
    }
  }

  renderPrayerSchedule();
}

function getIconSvg(key) {
  if (key === 'imsak' || key === 'isya') {
    return `<svg class="w-5 h-5 sm:w-6 sm:h-6 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>`;
  } else if (key === 'subuh' || key === 'terbit') {
    return `<svg class="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`;
  } else if (key === 'dhuha' || key === 'dzuhur') {
    return `<svg class="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2v2m0 16v2m10-10h-2M4 12H2m17.07-7.07l-1.41 1.41M6.34 17.66l-1.41 1.41m14.14 0l-1.41-1.41M6.34 6.34L4.93 4.93M12 7a5 5 0 100 10 5 5 0 000-10z"></path></svg>`;
  } else if (key === 'ashar') {
    return `<svg class="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>`;
  } else {
    return `<svg class="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`;
  }
}

function renderPrayerSchedule() {
  const container = document.getElementById('prayer-schedule-container');
  if (!container || !appState.currentTimings) return;

  container.innerHTML = '';

  const isToday = appState.dateOffset === 0;

  if (appState.viewMode === 'list') {
    // Mode List Vertikal yang sangat ergonomis untuk HP
    container.className = 'flex flex-col space-y-2.5 sm:space-y-3';

    PRAYER_METADATA.forEach(meta => {
      const time = appState.currentTimings[meta.key] || '--:--';
      const isNext = isToday && meta.key === appState.nextPrayerKey;

      const row = document.createElement('div');
      row.className = `glass-panel rounded-2xl p-3.5 sm:p-4 flex items-center justify-between relative overflow-hidden transition-all duration-300 ${
        isNext ? 'prayer-card-active ring-2 ring-teal-400 bg-teal-900/60' : 'hover:bg-teal-950/40'
      }`;

      row.innerHTML = `
        <div class="flex items-center space-x-3.5">
          <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-teal-900/50 border border-teal-500/20 flex items-center justify-center shrink-0">
            ${getIconSvg(meta.key)}
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <span class="text-sm sm:text-base font-bold text-white tracking-wide">${meta.name}</span>
              <span class="font-arabic text-teal-300/80 text-xs sm:text-sm font-semibold">${meta.arabic}</span>
            </div>
            <p class="text-[11px] text-teal-300/70">${meta.desc}</p>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          ${isNext ? '<span class="hidden xs:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-400 text-teal-950 animate-pulse">BERIKUTNYA</span>' : ''}
          <div class="text-right">
            <span class="prayer-time text-xl sm:text-2xl font-mono font-bold tracking-tight text-white">${time}</span>
            <span class="text-[10px] text-teal-400 font-mono block">WIB</span>
          </div>
        </div>
        ${isNext ? '<div class="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-teal-400 to-emerald-400"></div>' : ''}
      `;
      container.appendChild(row);
    });

  } else {
    // Mode Grid (2 Kolom di HP, 4 di Tablet, 8 di TV/Desktop)
    container.className = 'grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-4 prayer-grid';

    PRAYER_METADATA.forEach(meta => {
      const time = appState.currentTimings[meta.key] || '--:--';
      const isNext = isToday && meta.key === appState.nextPrayerKey;

      const card = document.createElement('div');
      card.className = `glass-panel rounded-2xl p-3 sm:p-4 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
        isNext ? 'prayer-card-active ring-2 ring-teal-400' : ''
      }`;

      card.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <div class="p-1.5 sm:p-2 rounded-xl bg-teal-900/40 border border-teal-500/20">
            ${getIconSvg(meta.key)}
          </div>
          <span class="font-arabic text-teal-300/70 text-xs">${meta.arabic}</span>
        </div>
        <div>
          <h3 class="text-xs uppercase tracking-wider text-teal-200/80 font-medium">${meta.name}</h3>
          <p class="prayer-time text-xl sm:text-2xl font-bold tracking-tight text-white font-mono mt-0.5">${time}</p>
          <p class="text-[10px] text-teal-300/60 mt-0.5">${meta.desc}</p>
        </div>
        ${isNext ? '<div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 to-emerald-400"></div>' : ''}
      `;
      container.appendChild(card);
    });
  }
}

function updateCountdown() {
  if (!appState.currentTimings) return;

  const now = new Date();
  const currentTotalSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  const schedule = [
    { key: 'imsak', name: 'Imsak', time: appState.currentTimings.imsak },
    { key: 'subuh', name: 'Subuh', time: appState.currentTimings.subuh },
    { key: 'terbit', name: 'Terbit', time: appState.currentTimings.terbit },
    { key: 'dhuha', name: 'Dhuha', time: appState.currentTimings.dhuha },
    { key: 'dzuhur', name: 'Dzuhur', time: appState.currentTimings.dzuhur },
    { key: 'ashar', name: 'Ashar', time: appState.currentTimings.ashar },
    { key: 'maghrib', name: 'Maghrib', time: appState.currentTimings.maghrib },
    { key: 'isya', name: 'Isya', time: appState.currentTimings.isya }
  ].map(item => {
    const [hh, mm] = item.time.split(':').map(Number);
    return {
      ...item,
      sec: hh * 3600 + mm * 60
    };
  });

  let nextPrayer = null;
  let prevPrayer = null;

  for (let i = 0; i < schedule.length; i++) {
    if (schedule[i].sec > currentTotalSec) {
      nextPrayer = schedule[i];
      prevPrayer = i > 0 ? schedule[i - 1] : schedule[schedule.length - 1];
      break;
    }
  }

  let diffSec = 0;
  if (!nextPrayer) {
    nextPrayer = schedule[0];
    prevPrayer = schedule[schedule.length - 1];
    diffSec = (86400 - currentTotalSec) + nextPrayer.sec;
  } else {
    diffSec = nextPrayer.sec - currentTotalSec;
  }

  if (diffSec === 0 && appState.dateOffset === 0) {
    triggerAdzanAlert(nextPrayer.name);
  }

  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  const countdownStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const countdownEl = document.getElementById('hero-countdown-timer');
  const nextNameEl = document.getElementById('hero-next-prayer-name');
  const nextTimeEl = document.getElementById('hero-next-prayer-time');
  const progressBar = document.getElementById('hero-countdown-progress');

  if (countdownEl) countdownEl.textContent = countdownStr;
  if (nextNameEl) nextNameEl.textContent = nextPrayer.name.toUpperCase();
  if (nextTimeEl) nextTimeEl.textContent = `${nextPrayer.time} WIB`;

  if (progressBar && prevPrayer) {
    let intervalSec = 0;
    if (nextPrayer.sec >= prevPrayer.sec) {
      intervalSec = nextPrayer.sec - prevPrayer.sec;
    } else {
      intervalSec = (86400 - prevPrayer.sec) + nextPrayer.sec;
    }
    const elapsed = intervalSec - diffSec;
    const pct = Math.min(100, Math.max(0, (elapsed / intervalSec) * 100));
    progressBar.style.width = `${pct}%`;
  }

  if (appState.nextPrayerKey !== nextPrayer.key) {
    appState.nextPrayerKey = nextPrayer.key;
    renderPrayerSchedule();
  }
}

/* -------------------------------------------------------------------------- */
/* 6. NAVIGASI TANGGAL (KEMARIN, HARI INI, BESOK)                             */
/* -------------------------------------------------------------------------- */

function navigateDate(offsetChange) {
  appState.dateOffset += offsetChange;
  const target = new Date();
  target.setDate(target.getDate() + appState.dateOffset);
  appState.selectedDate = target;

  const navLabel = document.getElementById('date-nav-label');
  const navSub = document.getElementById('date-nav-sub');

  if (navLabel) {
    if (appState.dateOffset === 0) {
      navLabel.textContent = "HARI INI";
    } else if (appState.dateOffset === 1) {
      navLabel.textContent = "BESOK";
    } else if (appState.dateOffset === -1) {
      navLabel.textContent = "KEMARIN";
    } else {
      navLabel.textContent = target.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    }
  }

  if (navSub) {
    navSub.textContent = target.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  loadPrayerTimings(target);
}

function resetToToday() {
  appState.dateOffset = 0;
  appState.selectedDate = new Date();
  navigateDate(0);
}

/* -------------------------------------------------------------------------- */
/* 7. JAM REAL-TIME & SIKLUS DETIK                                            */
/* -------------------------------------------------------------------------- */

function startClock() {
  const clockEl = document.getElementById('digital-clock');
  const dateGregorianEl = document.getElementById('gregorian-date');
  const dateHijriEl = document.getElementById('hijri-date');

  function tick() {
    const now = new Date();
    
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    if (clockEl) {
      clockEl.innerHTML = `${hh}<span class="colon-blink">:</span>${mm}<span class="colon-blink">:</span>${ss} <span class="text-xs sm:text-base font-normal text-teal-300">WIB</span>`;
    }

    if (dateGregorianEl) {
      const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
      dateGregorianEl.textContent = now.toLocaleDateString('id-ID', options);
    }

    if (dateHijriEl) {
      dateHijriEl.textContent = getHijriDate(now);
    }

    if (appState.dateOffset === 0) {
      updateCountdown();
    }
  }

  tick();
  setInterval(tick, 1000);
}

/* -------------------------------------------------------------------------- */
/* 8. KOMPAS ARAH KIBLAT MOBILE DENGAN HAPTIC VIBRATION                      */
/* -------------------------------------------------------------------------- */

function initQiblaCompass() {
  const needle = document.getElementById('compass-needle');
  const dial = document.getElementById('compass-dial-ring');
  const degreeText = document.getElementById('compass-degrees');
  const sensorStatus = document.getElementById('compass-sensor-status');
  const alignBadge = document.getElementById('compass-align-badge');

  const qiblaAngle = CONFIG.qiblaBearing; // 294.13°
  let lastVibrate = 0;

  function handleOrientation(e) {
    let compass = null;
    if (e.webkitCompassHeading !== undefined) {
      compass = e.webkitCompassHeading;
    } else if (e.alpha !== null) {
      compass = 360 - e.alpha;
    }

    if (compass !== null && compass !== undefined) {
      appState.hasCompassSensor = true;
      appState.compassHeading = compass;

      const diff = Math.abs((compass - qiblaAngle + 360) % 360);
      const isAligned = diff < 3.5 || diff > 356.5;

      const needleAngle = qiblaAngle - compass;
      if (needle) needle.style.transform = `rotate(${needleAngle}deg)`;
      if (dial) dial.style.transform = `rotate(${-compass}deg)`;

      if (degreeText) degreeText.textContent = `${Math.round(compass)}°`;
      if (sensorStatus) sensorStatus.textContent = "Sensor Kompas Aktif";

      if (alignBadge) {
        if (isAligned) {
          alignBadge.classList.remove('hidden');
          alignBadge.textContent = "✨ TEPAT MENGHADAP KIBLAT!";
          if (navigator.vibrate && Date.now() - lastVibrate > 1200) {
            navigator.vibrate([40, 60, 40]);
            lastVibrate = Date.now();
          }
        } else {
          alignBadge.classList.add('hidden');
        }
      }
    }
  }

  window.requestCompassPermission = async function() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation, true);
          if (sensorStatus) sensorStatus.textContent = "Sensor Terhubung";
        } else {
          alert('Izin sensor gerak diperlukan untuk mengarahkan kompas secara otomatis.');
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
  };

  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', handleOrientation, true);
  }

  if (needle) needle.style.transform = `rotate(${qiblaAngle}deg)`;
  if (degreeText) degreeText.textContent = `${qiblaAngle.toFixed(1)}° (Barat Laut)`;
}

/* -------------------------------------------------------------------------- */
/* 9. TASBIH DIGITAL & DOA KHUSUS PASIEN RSUD                                 */
/* -------------------------------------------------------------------------- */

function tapTasbih() {
  appState.tasbihCount += 1;
  const countEl = document.getElementById('tasbih-count-display');
  if (countEl) countEl.textContent = appState.tasbihCount;

  if (navigator.vibrate) {
    navigator.vibrate(35);
  }

  if (appState.tasbihCount === 33 || appState.tasbihCount === 100) {
    if (navigator.vibrate) navigator.vibrate([50, 100, 50]);
  }
}

function resetTasbih() {
  appState.tasbihCount = 0;
  const countEl = document.getElementById('tasbih-count-display');
  if (countEl) countEl.textContent = 0;
}

function openPrayersModal() {
  const modal = document.getElementById('prayers-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closePrayersModal() {
  const modal = document.getElementById('prayers-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

/* -------------------------------------------------------------------------- */
/* 10. JADWAL 1 BULAN & CETAK PDF                                             */
/* -------------------------------------------------------------------------- */

function openMonthlySchedule() {
  const modal = document.getElementById('monthly-modal');
  const tbody = document.getElementById('monthly-table-body');
  const monthTitle = document.getElementById('monthly-title');
  if (!modal || !tbody) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  if (monthTitle) {
    monthTitle.textContent = `Jadwal Sholat Bulan ${monthNames[month]} ${year} - RSUD dr. R. Koesma Tuban`;
  }

  tbody.innerHTML = '';

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDate = now.getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const curDate = new Date(year, month, d);
    const timings = KoesmaPrayerEngine.calculate(curDate);
    const hijri = getHijriDate(curDate).split(' ')[0] + ' ' + (getHijriDate(curDate).split(' ')[1] || '');

    const tr = document.createElement('tr');
    tr.className = d === todayDate ? 'bg-teal-900/50 font-bold border-l-4 border-teal-400' : 'hover:bg-teal-950/20';

    tr.innerHTML = `
      <td class="p-2 text-center text-teal-200 border-b border-teal-800/30">${d}</td>
      <td class="p-2 text-teal-300 border-b border-teal-800/30 whitespace-nowrap">${curDate.toLocaleDateString('id-ID', { weekday: 'short' })}, ${d} ${monthNames[month]}</td>
      <td class="p-2 text-teal-400 border-b border-teal-800/30 text-[11px] whitespace-nowrap">${hijri}</td>
      <td class="p-2 text-center font-mono border-b border-teal-800/30">${timings.imsak}</td>
      <td class="p-2 text-center font-mono border-b border-teal-800/30 text-amber-300">${timings.subuh}</td>
      <td class="p-2 text-center font-mono border-b border-teal-800/30 text-gray-400">${timings.terbit}</td>
      <td class="p-2 text-center font-mono border-b border-teal-800/30">${timings.dhuha}</td>
      <td class="p-2 text-center font-mono border-b border-teal-800/30 text-yellow-300">${timings.dzuhur}</td>
      <td class="p-2 text-center font-mono border-b border-teal-800/30 text-amber-400">${timings.ashar}</td>
      <td class="p-2 text-center font-mono border-b border-teal-800/30 text-orange-400">${timings.maghrib}</td>
      <td class="p-2 text-center font-mono border-b border-teal-800/30 text-teal-300">${timings.isya}</td>
    `;
    tbody.appendChild(tr);
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeMonthlySchedule() {
  const modal = document.getElementById('monthly-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

/* -------------------------------------------------------------------------- */
/* 11. TV DISPLAY MODE                                                        */
/* -------------------------------------------------------------------------- */

function toggleTvMode() {
  appState.tvMode = !appState.tvMode;
  document.body.classList.toggle('tv-mode', appState.tvMode);

  if (appState.tvMode) {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  } else {
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }
}

/* -------------------------------------------------------------------------- */
/* 12. PENGATURAN SUARA & IHTIYAT                                             */
/* -------------------------------------------------------------------------- */

function toggleSound() {
  appState.soundEnabled = !appState.soundEnabled;
  localStorage.setItem('koesma_sound', String(appState.soundEnabled));

  const soundBtn = document.getElementById('sound-toggle-btn');
  const soundIcon = document.getElementById('sound-icon');
  const soundStatusText = document.getElementById('sound-status-text');

  if (appState.soundEnabled) {
    getAudioContext();
    if (soundBtn) soundBtn.classList.add('bg-teal-500/20', 'border-teal-400');
    if (soundStatusText) soundStatusText.textContent = "Suara Aktif";
    if (soundIcon) {
      soundIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>`;
    }
    playAdzanChime();
  } else {
    if (soundBtn) soundBtn.classList.remove('bg-teal-500/20', 'border-teal-400');
    if (soundStatusText) soundStatusText.textContent = "Suara Hening";
    if (soundIcon) {
      soundIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z m12-2l-4-4m0 4l4-4"></path>`;
    }
  }
}

function updateIhtiyat(val) {
  const num = parseInt(val, 10);
  appState.ihtiyat = num;
  localStorage.setItem('koesma_ihtiyat', String(num));

  const valEl = document.getElementById('ihtiyat-val-label');
  if (valEl) valEl.textContent = `+${num} Menit`;

  loadPrayerTimings(appState.selectedDate);
}

/* -------------------------------------------------------------------------- */
/* 13. INISIALISASI                                                           */
/* -------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  const soundStatusText = document.getElementById('sound-status-text');
  const soundBtn = document.getElementById('sound-toggle-btn');
  if (appState.soundEnabled) {
    if (soundBtn) soundBtn.classList.add('bg-teal-500/20', 'border-teal-400');
    if (soundStatusText) soundStatusText.textContent = "Suara Aktif";
  }

  const ihtiyatInput = document.getElementById('ihtiyat-input');
  const ihtiyatLabel = document.getElementById('ihtiyat-val-label');
  if (ihtiyatInput) {
    ihtiyatInput.value = appState.ihtiyat;
    if (ihtiyatLabel) ihtiyatLabel.textContent = `+${appState.ihtiyat} Menit`;
    ihtiyatInput.addEventListener('input', (e) => updateIhtiyat(e.target.value));
  }

  // Restore preferred view mode
  toggleViewMode(appState.viewMode);

  startClock();
  loadPrayerTimings(new Date());
  initQiblaCompass();

  setInterval(() => {
    if (appState.dateOffset === 0) {
      loadPrayerTimings(new Date());
    }
  }, 3600000);
});
