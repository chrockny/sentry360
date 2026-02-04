import { statusTone } from "../lib/format";

export default function StatusBadge({ estado, online }) {
  const s = (estado || "DESCONOCIDO").toUpperCase();
  const tone = statusTone(s, online);

  return (
    <div className={"badge " + tone}>
      <span className="badgeDot" />
      <span className="mono">{online ? s : "OFFLINE"}</span>
    </div>
  );
}
