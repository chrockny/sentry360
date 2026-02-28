"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import StatusBadge from "./StatusBadge";
import SensorCard from "./SensorCard";
import { SENSOR_RANGES } from "../lib/ranges";

// Firebase (Realtime Database)
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, onValue, off, update } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

const HISTORY_LEN = 60;
const OFFLINE_TIMEOUT_MS = 4000;
const STALE_CHECK_MS = 200;

// Firebase config (embebido)
const firebaseConfig = {
  apiKey: "AIzaSyCmlA0RWbwWvGrc0VjvnGSOyax91_0Uo7s",
  authDomain: "sentry-360.firebaseapp.com",
  databaseURL: "https://sentry-360-default-rtdb.firebaseio.com",
  projectId: "sentry-360",
  storageBucket: "sentry-360.firebasestorage.app",
  messagingSenderId: "718662351345",
  appId: "1:718662351345:web:d80cbb3cae870cf720ac50",
  measurementId: "G-RVP0K69VHM",
};

function normalizeTelemetry(raw) {
  const t = raw && typeof raw === "object" ? raw : {};

  const tsServer =
    Number.isFinite(+t.ts_server) ? +t.ts_server : null;

  const tsMs =
    Number.isFinite(+t.ts_ms) ? +t.ts_ms : Number.isFinite(+t.ts) ? +t.ts : null;

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
    luz: Number.isFinite(+t.luz) ? +t.luz : null,

    rain: Boolean(t.rain ?? false),
    flame: Boolean(t.flame ?? false),
    soloPeligro: Boolean(t.soloPeligro ?? false),

    seq: Number.isFinite(+t.seq) ? +t.seq : null,

    // ambos timestamps
    ts_server: tsServer, // epoch ms (correcto para stale)
    ts_ms: tsMs,         // millis() del ESP32 (solo informativo)

    lightOn: Boolean(t.lightOn ?? false),
    fanOn: Boolean(t.fanOn ?? false),

    lastCtrlErr: String(t.lastCtrlErr ?? ""),
  };
}

function pushHistory(history, key, point) {
  const prev = history[key] || [];
  const next = prev.concat(point);
  if (next.length > HISTORY_LEN) return next.slice(next.length - HISTORY_LEN);
  return next;
}

function luzNivel(v) {
  if (!Number.isFinite(v)) return "-";
  if (v > 700) return "ALTA";
  if (v > 300) return "NORMAL";
  return "OSCURO";
}

function initFirebaseOnce() {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  try {
    getAnalytics(app);
  } catch {}
  const db = getDatabase(app);
  return { app, db };
}

export default function Dashboard() {
  const { db } = useMemo(() => initFirebaseOnce(), []);
  const liveRef = useMemo(() => ref(db, "live"), [db]);
  const ctrlRef = useMemo(() => ref(db, "ctrl"), [db]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [telemetry, setTelemetry] = useState(() =>
    normalizeTelemetry({
      device: "SENTRY-360",
      online: false,
      estado: "OFFLINE",
      motivo: "-",
      ts_ms: null,
      lightOn: false,
      fanOn: false,
    })
  );

  const [history, setHistory] = useState(() => ({
    T: [],
    H: [],
    HI: [],
    gas: [],
    base: [],
    luz: [],
  }));

  const [net, setNet] = useState({ ok: true, lastErr: null, lastMs: null });

  // CONTROL: lo que pide la web (desde /ctrl)
const [ctrl, setCtrl] = useState({ luzMode: "OFF", fanMode: "OFF", ts_ms: null });
  const [ctrlNet, setCtrlNet] = useState({ ok: true, lastErr: null });

  // Offline detector por “freeze de datos”
  const lastSeqRef = useRef(null);
  const lastChangeMsRef = useRef(Date.now());
  const offlineRef = useRef(false);

  // Suscripción a /ctrl
  useEffect(() => {
    let alive = true;

    const unsubCtrl = onValue(
      ctrlRef,
      (snap) => {
        if (!alive) return;
        const v = snap.val() || {};
       setCtrl({
  luzMode: String(v.luzMode ?? "OFF").toUpperCase(),
  fanMode: String(v.fanMode ?? "OFF").toUpperCase(),
  ts_ms: Number.isFinite(+v.ts_ms) ? +v.ts_ms : null,
});
        setCtrlNet({ ok: true, lastErr: null });
      },
      (err) => {
        if (!alive) return;
        setCtrlNet({ ok: false, lastErr: String(err?.message || err) });
      }
    );

    return () => {
      alive = false;
      try {
        unsubCtrl();
      } catch {}
      try {
        off(ctrlRef);
      } catch {}
    };
  }, [ctrlRef]);

  // Enviar comandos a /ctrl (la web manda; ESP32 ejecuta)
  async function setLight(next) {
    try {
await update(ctrlRef, { luzMode: next ? "ON" : "OFF", ts_ms: Date.now() });
    } catch (e) {
      console.error(e);
    }
  }

  async function setFan(next) {
    try {
await update(ctrlRef, { fanMode: next ? "ON" : "OFF", ts_ms: Date.now() });
    } catch (e) {
      console.error(e);
    }
  }

  // Suscripción a /live (telemetría)
  useEffect(() => {
    let alive = true;

    const unsub = onValue(
      liveRef,
      (snap) => {
        if (!alive) return;

        const data = snap.val();
        const norm = normalizeTelemetry(data);
        const now = Date.now();
       const tsServer = norm.ts_server;
const seq = norm.seq;

// usamos ts_server si existe; si no, fallback a seq
const marker = tsServer != null ? tsServer : seq;
const markerChanged =
  marker != null && marker !== lastSeqRef.current;

if (markerChanged) {
  lastSeqRef.current = marker;
  lastChangeMsRef.current = now;
  offlineRef.current = false;
}
        const finalTelemetry = {
          ...norm,
          online: offlineRef.current ? false : norm.online,
          estado: offlineRef.current ? "OFFLINE" : norm.estado,
          motivo: offlineRef.current ? "STALE DATA" : norm.motivo,
        };

        setTelemetry(finalTelemetry);
        setNet({ ok: true, lastErr: null, lastMs: now });

        if (markerChanged) {
          const ts = Number.isFinite(finalTelemetry.ts_ms)
            ? finalTelemetry.ts_ms
            : now;

          setHistory((h) => {
            const nh = { ...h };
            if (finalTelemetry.T != null)
              nh.T = pushHistory(h, "T", { t: ts, v: finalTelemetry.T });
            if (finalTelemetry.H != null)
              nh.H = pushHistory(h, "H", { t: ts, v: finalTelemetry.H });
            if (finalTelemetry.HI != null)
              nh.HI = pushHistory(h, "HI", { t: ts, v: finalTelemetry.HI });
            if (finalTelemetry.gas != null)
              nh.gas = pushHistory(h, "gas", { t: ts, v: finalTelemetry.gas });
            if (finalTelemetry.base != null)
              nh.base = pushHistory(h, "base", { t: ts, v: finalTelemetry.base });
            if (finalTelemetry.luz != null)
              nh.luz = pushHistory(h, "luz", { t: ts, v: finalTelemetry.luz });
            return nh;
          });
        }
      },
      (err) => {
        if (!alive) return;
        const now = Date.now();
        setNet({ ok: false, lastErr: String(err?.message || err), lastMs: now });
      }
    );

const staleId = setInterval(() => {
  const now = Date.now();

  setTelemetry((prev) => {
    const tsServer = Number.isFinite(+prev.ts_server) ? +prev.ts_server : null;

    // si tenemos ts_server, usamos eso (regla correcta)
    const isStale = tsServer != null
      ? (now - tsServer) > OFFLINE_TIMEOUT_MS
      : (now - lastChangeMsRef.current) > OFFLINE_TIMEOUT_MS;

    offlineRef.current = isStale;

    if (!isStale) return prev;

    return {
      ...prev,
      online: false,
      estado: "OFFLINE",
      motivo: "STALE DATA",
    };
  });
}, STALE_CHECK_MS);
    return () => {
      alive = false;
      clearInterval(staleId);
      try {
        unsub();
      } catch {}
      try {
        off(liveRef);
      } catch {}
    };
  }, [liveRef]);

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
            <div className="statusVal mono">
              {telemetry.luz ?? "-"}{" "}
              <span className="muted">({luzNivel(telemetry.luz)})</span>
            </div>
          </div>

          <div className="statusRow">
            <div className="statusKey">SEQ</div>
            <div className="statusVal mono">{telemetry.seq ?? "-"}</div>
          </div>

          <div className="statusRow">
            <div className="statusKey">TS_MS</div>
            <div className="statusVal mono">
              {mounted ? String(telemetry.ts_ms ?? "-") : "-"}
            </div>
          </div>
          <div className="statusRow">
  <div className="statusKey">TS_SERVER</div>
  <div className="statusVal mono">
    {mounted ? String(telemetry.ts_server ?? "-") : "-"}
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
            <div className={"flag " + (telemetry.soloPeligro ? "on" : "")}>
              SOLO-PELIGRO
            </div>
            <div className={"flag " + (telemetry.online ? "on" : "")}>
              ONLINE
            </div>
          </div>

         
        </div>

        <div className="noteBlock">
          <div className="noteTitle">CANAL</div>
          <div className="noteText">
            Arduino UNO (sensores) → ESP32 (gateway UART con ACK/CRC/SEQ) → Firebase
            RTDB → Consola Web.
          </div>

          <div className="noteTitle" style={{ marginTop: 14 }}>
            OFFLINE RULE
          </div>
          <div className="noteText">
            Si el <span className="mono">seq</span> no cambia por{" "}
            {OFFLINE_TIMEOUT_MS}ms → OFFLINE.
          </div>
        </div>
         {/* ===== CONTROL ===== */}
          <div className="controlBlock">
            <div className="controlTitle">CONTROL</div>

            <div className="controlRow">
              <div className="controlLeft">
                <div className="controlLabel">LUCES</div>
                <div className="controlState mono">
                  CMD: {ctrl.luzMode}  {}
                  <span className={telemetry.lightOn ? "ok" : "muted"}>
                    {telemetry.lightOn ? "ON" : "OFF"}
                  </span>
                </div>
              </div>

              <div className="controlBtns">
                <button
className={"btnCtl " + (ctrl.luzMode === "ON" ? "on" : "")}
                  onClick={() => setLight(true)}
                  disabled={!mounted}
                >
                  PRENDER
                </button>
                <button
className={"btnCtl " + (ctrl.luzMode === "OFF" ? "on" : "")}
                  onClick={() => setLight(false)}
                  disabled={!mounted}
                >
                  APAGAR
                </button>
              </div>
            </div>

            <div className="controlRow">
              <div className="controlLeft">
                <div className="controlLabel">VENTILADOR</div>
                <div className="controlState mono">
                  CMD: {ctrl.fanMode} {}
                  <span className={telemetry.fanOn ? "ok" : "muted"}>
                    {telemetry.fanOn ? "ON" : "OFF"}
                  </span>
                </div>
              </div>

              <div className="controlBtns">
                <button
className={"btnCtl " + (ctrl.fanMode === "ON" ? "on" : "")}
              onClick={() => setFan(true)}
                  disabled={!mounted}
                >
                  PRENDER
                </button>
                <button
className={"btnCtl " + (ctrl.fanMode === "OFF" ? "on" : "")}                      onClick={() => setFan(false)}
                  disabled={!mounted}
                >
                  APAGAR
                </button>
              </div>
            </div>

            <div className={"controlNet mono " + (ctrlNet.ok ? "ok" : "bad")}>
              CTRL {ctrlNet.ok ? "SYNC OK" : "SYNC ERROR"}
              {ctrlNet.lastErr ? (
                <span className="muted"> · {ctrlNet.lastErr}</span>
              ) : null}
              {telemetry.lastCtrlErr ? (
                <span className="muted"> · ESP32: {telemetry.lastCtrlErr}</span>
              ) : null}
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
        <div className="hintPill mono">MODE REALTIME</div>
        <div className="hintPill mono">HIST {HISTORY_LEN} pts</div>
        <div className="hintPill mono">STALE {OFFLINE_TIMEOUT_MS}ms</div>
      </div>
    </div>
  );
}