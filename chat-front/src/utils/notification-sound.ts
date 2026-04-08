let sharedCtx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (sharedCtx) return sharedCtx
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  sharedCtx = new Ctor()
  return sharedCtx
}

/** Вызвать после первого жеста пользователя (клик/тап), иначе звук может быть заблокирован политикой автовоспроизведения. */
export async function ensureNotificationAudioUnlocked(): Promise<void> {
  const ctx = getContext()
  if (!ctx || ctx.state !== 'suspended') return
  try {
    await ctx.resume()
  } catch {
    // ignore
  }
}

/** Короткий двухтоновый сигнал для входящего сообщения (без внешних файлов). */
export function playIncomingMessageSound(): void {
  const ctx = getContext()
  if (!ctx) return

  const run = () => {
    const t0 = ctx.currentTime
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.0001, t0)
    master.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02)
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28)
    master.connect(ctx.destination)

    const freqs = [784, 1048]
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t0 + i * 0.06)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.35, t0 + i * 0.06)
      osc.connect(g)
      g.connect(master)
      osc.start(t0 + i * 0.06)
      osc.stop(t0 + 0.22 + i * 0.06)
    })
  }

  if (ctx.state === 'suspended') {
    void ctx.resume().then(run).catch(() => {})
    return
  }
  run()
}
