"use client";

import { useEffect, useState } from "react";
import { getDatabase, ref, set, onValue, off } from "firebase/database";

function nowId() {
  // id simple para "cambio"
  return Date.now();
}

async function sendCmd(db, dev, mode) {
  const id = nowId();
  const node = dev === "FAN" ? "fan" : "luz";
  await set(ref(db, `cmd/${node}`), {
    mode,          // "ON" | "OFF" | "AUTO"
    id,            // cambia siempre
    ts_ms: Date.now(),
  });
}

export default function ControlPanel({ app }) {
  const [fan, setFan] = useState(null);
  const [luz, setLuz] = useState(null);
  const [online, setOnline] = useState(null);

  useEffect(() => {
    const db = getDatabase(app);

    const fanRef = ref(db, "cmd/fan");
    const luzRef = ref(db, "cmd/luz");
    const liveRef = ref(db, "live"); // tu live.json

    const unsubFan = onValue(fanRef, (snap) => setFan(snap.val()));
    const unsubLuz = onValue(luzRef, (snap) => setLuz(snap.val()));
    const unsubLive = onValue(liveRef, (snap) => setOnline(snap.val()?.online ?? null));

    return () => {
      off(fanRef); off(luzRef); off(liveRef);
      // (onValue ya se desuscribe solo en v9 si guardas la función; igual dejo off)
    };
  }, [app]);

  const db = getDatabase(app);

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 14, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h3 style={{ margin: 0 }}>CONTROL REMOTO</h3>
        <div style={{ opacity: 0.8 }}>
          ESP32/UNO: <b>{online === null ? "..." : online ? "ONLINE" : "OFFLINE"}</b>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        {/* FAN */}
        <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <b>FAN</b>
            <span style={{ opacity: 0.8 }}>Actual: <b>{fan?.mode ?? "—"}</b></span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => sendCmd(db, "FAN", "ON")}>ON</button>
            <button onClick={() => sendCmd(db, "FAN", "OFF")}>OFF</button>
            <button onClick={() => sendCmd(db, "FAN", "AUTO")}>AUTO</button>
          </div>
        </div>

        {/* LUZ */}
        <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <b>LUZ</b>
            <span style={{ opacity: 0.8 }}>Actual: <b>{luz?.mode ?? "—"}</b></span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => sendCmd(db, "LUZ", "ON")}>ON</button>
            <button onClick={() => sendCmd(db, "LUZ", "OFF")}>OFF</button>
            <button onClick={() => sendCmd(db, "LUZ", "AUTO")}>AUTO</button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
        Nota: Estos botones escriben en Firebase → ESP32 lo lee → manda CMD al Arduino.
      </div>
    </div>
  );
}