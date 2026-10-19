/**
 * Web Audio API synthesizer for focus & break chime notifications.
 * Works natively in all modern browsers without external asset files.
 */

export type AlertIntensityLevel = "SOFT" | "NORMAL" | "STRONG";

class SoundEffects {
  private ctx: AudioContext | null = null;
  private alarmInterval: ReturnType<typeof setInterval> | null = null;
  private alarmTimeout: ReturnType<typeof setTimeout> | null = null;
  private isAlarmPlaying = false;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Helper: Pola tiga bunyi (three-tone chime).
   */
  private playThreeTonePattern(intensity: AlertIntensityLevel = "NORMAL", volumePercent: number = 80) {
    const ctx = this.getContext();
    if (!ctx) return;

    // Normalisasi volume 0..1
    const vol = Math.max(0, Math.min(100, volumePercent)) / 100;
    if (vol <= 0) return;

    // Karakter nada berdasarkan intensitas:
    // SOFT: A4, C#5, E5 (harmoni lembut, nada hangat)
    // NORMAL: C5, E5, G5 (nada do-mi-sol jernih, seimbang)
    // STRONG: E5, G#5, B5 (nada tinggi tegas, lebih menonjol)
    let notes: number[];
    let baseGain: number;
    let oscType: OscillatorType;

    switch (intensity) {
      case "SOFT":
        notes = [440.0, 554.37, 659.25];
        baseGain = 0.15;
        oscType = "sine";
        break;
      case "STRONG":
        notes = [659.25, 830.61, 987.77];
        baseGain = 0.35;
        oscType = "triangle";
        break;
      case "NORMAL":
      default:
        notes = [523.25, 659.25, 783.99];
        baseGain = 0.25;
        oscType = "sine";
        break;
    }

    const effectiveGain = baseGain * vol;
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = oscType;
      osc.frequency.setValueAtTime(freq, now + idx * 0.16);

      // Attack & decay envelope
      gain.gain.setValueAtTime(0, now + idx * 0.16);
      gain.gain.linearRampToValueAtTime(effectiveGain, now + idx * 0.16 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.16);
      osc.stop(now + idx * 0.16 + 0.45);
    });
  }

  /**
   * Bunyi berulang sampai ditutup (maks 60 detik) dengan pola tiga bunyi.
   */
  startRepeatingAlarm(
    intensity: AlertIntensityLevel = "NORMAL",
    volumePercent: number = 80,
    onAutoStop?: () => void
  ) {
    if (this.isAlarmPlaying) return;
    this.isAlarmPlaying = true;

    // Bunyi pertama langsung diputar
    this.playThreeTonePattern(intensity, volumePercent);

    // Ulangi pola tiga bunyi setiap 2.4 detik
    this.alarmInterval = setInterval(() => {
      if (!this.isAlarmPlaying) return;
      this.playThreeTonePattern(intensity, volumePercent);
    }, 2400);

    // Batas waktu maksimal 60 detik untuk auto-stop
    this.alarmTimeout = setTimeout(() => {
      this.stopRepeatingAlarm();
      onAutoStop?.();
    }, 60000);
  }

  /**
   * Menghentikan bunyi alarm seketika saat ditutup.
   */
  stopRepeatingAlarm() {
    this.isAlarmPlaying = false;
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
    if (this.alarmTimeout) {
      clearTimeout(this.alarmTimeout);
      this.alarmTimeout = null;
    }
  }

  /**
   * Memutar 1 sampel pola tiga bunyi untuk tombol "Tes bunyi".
   */
  playAlarmSample(intensity: AlertIntensityLevel = "NORMAL", volumePercent: number = 80) {
    this.playThreeTonePattern(intensity, volumePercent);
  }

  get isAlarmActive(): boolean {
    return this.isAlarmPlaying;
  }

  /**
   * Chime lembut saat sesi fokus selesai (1x play)
   */
  playSessionComplete(volumePercent: number = 80) {
    const ctx = this.getContext();
    if (!ctx) return;
    const vol = Math.max(0, Math.min(100, volumePercent)) / 100;

    const notes = [392.0, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0, now + idx * 0.15);
      gain.gain.linearRampToValueAtTime(0.2 * vol, now + idx * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.6);
    });
  }

  /**
   * Chime rileks saat waktu istirahat selesai (C5 -> E5 -> G4)
   */
  playBreakComplete(volumePercent: number = 80) {
    const ctx = this.getContext();
    if (!ctx) return;
    const vol = Math.max(0, Math.min(100, volumePercent)) / 100;

    const notes = [523.25, 659.25, 392.0];
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.2);

      gain.gain.setValueAtTime(0, now + idx * 0.2);
      gain.gain.linearRampToValueAtTime(0.2 * vol, now + idx * 0.2 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.2 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.2);
      osc.stop(now + idx * 0.2 + 0.8);
    });
  }

  /**
   * Klik halus saat tombol timer ditekan
   */
  playClick() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }
}

export const soundEffects = new SoundEffects();

export function startRepeatingAlarm(
  intensity: AlertIntensityLevel = "NORMAL",
  volumePercent: number = 80,
  onAutoStop?: () => void
) {
  soundEffects.startRepeatingAlarm(intensity, volumePercent, onAutoStop);
}

export function stopRepeatingAlarm() {
  soundEffects.stopRepeatingAlarm();
}

export function playAlarmSample(intensity: AlertIntensityLevel = "NORMAL", volumePercent: number = 80) {
  soundEffects.playAlarmSample(intensity, volumePercent);
}
