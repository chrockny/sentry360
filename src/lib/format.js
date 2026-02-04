export function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

export function fmt(n) {
  if (!Number.isFinite(n)) return "--";
  // 0-2 decimales según magnitud
  const abs = Math.abs(n);
  const d = abs >= 100 ? 0 : abs >= 10 ? 1 : 1;
  return n.toFixed(d);
}

export function fmtMsToClock(ms) {
  const t = Number.isFinite(ms) ? ms : Date.now();
  const d = new Date(t);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
export function fmtSecondsToClock(sec) {
  if (!Number.isFinite(sec)) return "--:--:--";
  const s = Math.max(0, Math.floor(sec));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function statusTone(estado, online) {
  if (!online) return "offline";
  const s = String(estado || "").toUpperCase();
  if (s.includes("PELIGRO") || s.includes("DANGER")) return "danger";
  if (s.includes("ALERTA") || s.includes("WARNING")) return "warning";
  if (s.includes("NORMAL") || s.includes("OK")) return "normal";
  return "unknown";
}
