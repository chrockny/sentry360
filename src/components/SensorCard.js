import SparkLine from "./SparkLine";
import { fmt } from "../lib/format";

export default function SensorCard({ label, unit, value, estado, series, range }) {
  const v = value == null ? "--" : fmt(value);

  return (
    <div className={"card " + (estado ? estado.toLowerCase() : "")}>
      <div className="cardHead">
        <div className="cardLabel">{label}</div>
        <div className="cardValue mono">
          {v} <span className="unit">{unit}</span>
        </div>
      </div>

      <div className="chartBox">
        <SparkLine
          series={series || []}
          min={range?.min}
          max={range?.max}
        />
      </div>

      <div className="cardFoot">
        <div className="mono muted">
          RANGE {range?.min ?? 0} → {range?.max ?? 1}
        </div>
        <div className="mono muted">
          PTS {series?.length ?? 0}
        </div>
      </div>
    </div>
  );
}
