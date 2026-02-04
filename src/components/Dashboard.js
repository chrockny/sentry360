"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import StatusBadge from "./StatusBadge";
import SensorCard from "./SensorCard";
import { SENSOR_RANGES } from "../lib/ranges";
import { clamp, fmt, fmtSecondsToClock, fmtMsToClock } from "../lib/format";

const DEFAULT_POLL = 1200;
const HISTORY_LEN = 60; // puntos por sensor (ajústalo)

function buildUrl() {


  const url = `https://sentry-360-default-rtdb.firebaseio.com/live.json`;

  return url;
}

function normalizeTelemetry(raw) {
  const t = raw && typeof raw === "object" ? raw : {};

  const tsMs =
    Number.isFinite(+t.ts_ms) ? +t.ts_ms :
    (Number.isFinite(+t.ts) ? +t.ts : null);

  return {
    device: String(t.device ?? "SENTRY-360"),
    online: Boolean(t.online ?? false),

    estado: String(t.estado ?? "DESCONOCIDO"),
    motivo: String(t.motivo ?? "-"),

    T: Number.isFinite(+t.T) ? +t.T : null,
    H: Number.isFinite(+t.H) ? +t.H : null,
    HI: Number.isFinite(+t.HI) ? +t.HI : null,

    gas: Number.isFinite(+t.gas) ? +t.gas : null,
    base: Number.isFinite(+t.base) ? +t.base : null,

    luz: Number.isFinite(+t.luz) ? +t.luz : null,   // <- NUEVO

    rain: Boolean(t.rain ?? false),
    flame: Boolean(t.flame ?? false),
    soloPeligro: Boolean(t.soloPeligro ?? false),

    seq: Number.isFinite(+t.seq) ? +t.seq : null,
    ts_ms: tsMs,
  };
}



function pushHistory(history, key, point) {
  const prev = history[key] || [];
  const next = prev.concat(point);
  if (next.length > HISTORY_LEN) return next.slice(next.length - HISTORY_LEN);
  return next;
}

export default function Dashboard() {
  const url = useMemo(buildUrl, []);
  const pollMs = useMemo(() => {
    const v = Number(process.env.NEXT_PUBLIC_POLL_MS);
    return Number.isFinite(v) ? clamp(v, 300, 10000) : DEFAULT_POLL;
  }, []);

  const [telemetry, setTelemetry] = useState(() =>
    normalizeTelemetry({

      device: "SENTRY-360",
      online: false,
      estado: "OFFLINE",
      motivo: "-",
      ts_ms: Date.now(),
    })
  );
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

const [history, setHistory] = useState(() => ({
  T: [],
  H: [],
  HI: [],
  gas: [],
  base: [],
  luz: [], // <- NUEVO
}));


  const [net, setNet] = useState({ ok: true, lastErr: null, lastFetchMs: null });

  const lastSeqRef = useRef(null);

  useEffect(() => {
    if (!url) {
      setNet({ ok: false, lastErr: "Falta NEXT_PUBLIC_FIREBASE_DB_URL o NEXT_PUBLIC_FIREBASE_PATH", lastFetchMs: null });
      return;
    }

    let alive = true;

    async function tick() {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (!alive) return;

        const norm = normalizeTelemetry(data);

        // Evita “repetir” el mismo frame si el seq no cambia (si tu nodo se actualiza por seq)
        const seq = norm.seq;
        const seqUnchanged = seq != null && lastSeqRef.current === seq;

        setTelemetry(norm);
        setNet({ ok: true, lastErr: null, lastFetchMs: Date.now() });

        if (!seqUnchanged) {
          lastSeqRef.current = seq;

          const ts = norm.ts_ms || Date.now();
          setHistory((h) => {
            const nh = { ...h };
            if (norm.T != null) nh.T = pushHistory(h, "T", { t: ts, v: norm.T });
            if (norm.H != null) nh.H = pushHistory(h, "H", { t: ts, v: norm.H });
            if (norm.HI != null) nh.HI = pushHistory(h, "HI", { t: ts, v: norm.HI });
            if (norm.gas != null) nh.gas = pushHistory(h, "gas", { t: ts, v: norm.gas });
            if (norm.base != null) nh.base = pushHistory(h, "base", { t: ts, v: norm.base });
            if (norm.luz != null) nh.luz = pushHistory(h, "luz", { t: ts, v: norm.luz });

            return nh;
          });
        }
      } catch (e) {
        if (!alive) return;
        setNet({ ok: false, lastErr: String(e?.message || e), lastFetchMs: Date.now() });
      }
    }

    tick();
    const id = setInterval(tick, pollMs);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [url, pollMs]);

  const isOnline = telemetry.online && telemetry.estado !== "OFFLINE";

  return (
    <div className="dash">
      <div className="dashTop">
        <div className="statusBlock">
          <div className="statusHeader">
            <div className="statusTitle">ESTADO</div>
            <StatusBadge estado={telemetry.estado} online={telemetry.online} />
          </div>

          <div className="statusRow">
            <div className="statusKey">Dispositivo</div>
            <div className="statusVal mono">{telemetry.device}</div>
          </div>

          <div className="statusRow">
            <div className="statusKey">Motivo</div>
            <div className="statusVal">{telemetry.motivo}</div>
          </div>
<div className="statusRow">
  <div className="statusKey">LUZ</div>
  <div className="statusVal mono">{telemetry.luz ?? "-"} (
{telemetry.luz > 700 ? "ALTA" : telemetry.luz > 300 ? "NORMAL" : "OSCURO"}

  )</div>
</div>

          <div className="statusRow">
            <div className="statusKey">SEQ</div>
            <div className="statusVal mono">{telemetry.seq ?? "-"}</div>
          </div>
<div className="statusRow">
  <div className="statusKey">LUZ</div>
  <div className="statusVal mono">{telemetry.luz}</div>
</div>


         <div className="statusRow">
  <div className="statusKey">TS</div>
  <div className="statusVal mono">
    {mounted ? String(telemetry.ts_ms ?? "-") : "-"}
  </div>


          </div>

          <div className="statusRow">
            <div className="statusKey">Consola</div>
            <div className={"statusVal " + (net.ok ? "ok" : "bad")}>
              {net.ok ? "SYNC OK" : "SYNC ERROR"}
              {net.lastErr ? <span className="muted"> · {net.lastErr}</span> : null}
            </div>
          </div>

         <div className="flags">
  <div className={"flag " + (telemetry.rain ? "on" : "")}>RAIN</div>
  <div className={"flag " + (telemetry.flame ? "on" : "")}>FLAME</div>
  <div className={"flag " + (telemetry.soloPeligro ? "on" : "")}>SOLO-PELIGRO</div>
  <div className={"flag " + (telemetry.online ? "on" : "")}>ONLINE</div>
</div>

        </div>

        <div className="noteBlock">
          <div className="noteTitle">CANAL</div>
          <div className="noteText">
            Arduino UNO (sensores) → ESP32 (gateway UART con ACK/CRC/SEQ) → Firebase RTDB → Consola Web.
          </div>

          <div className="noteTitle" style={{ marginTop: 14 }}>REGLAS VISUALES</div>
          <div className="noteText">
            NORMAL / ALERTA / PELIGRO se renderiza como señal de misión: glow, bordes, ruido ligero y rejilla.
          </div>
        </div>
      </div>

      <div className="grid">
        <SensorCard
          label="Temperatura"
          unit="°C"
          value={telemetry.T}
          estado={telemetry.estado}
          series={history.T}
          range={SENSOR_RANGES.T}
        />
        <SensorCard
          label="Humedad"
          unit="%"
          value={telemetry.H}
          estado={telemetry.estado}
          series={history.H}
          range={SENSOR_RANGES.H}
        />
        <SensorCard
          label="Índice de calor"
          unit="°C"
          value={telemetry.HI}
          estado={telemetry.estado}
          series={history.HI}
          range={SENSOR_RANGES.HI}
        />
        <SensorCard
          label="Gas"
          unit="u"
          value={telemetry.gas}
          estado={telemetry.estado}
          series={history.gas}
          range={SENSOR_RANGES.gas}
        />
        <SensorCard
          label="Base"
          unit="u"
          value={telemetry.base}
          estado={telemetry.estado}
          series={history.base}
          range={SENSOR_RANGES.base}
        />
        <SensorCard
  label="Luz (LDR)"
  unit="adc"
  value={telemetry.luz}
  estado={telemetry.estado}
  series={history.luz}
  range={SENSOR_RANGES.luz}
/>

      </div>

      <div className="hintRow">
        <div className="hintPill mono">
          POLL {pollMs}ms
        </div>
        <div className="hintPill mono">
          URL {url ? "OK" : "MISSING"}
        </div>
        <div className="hintPill mono">
          HIST {HISTORY_LEN} pts
        </div>
      </div>
    </div>
  );
}
