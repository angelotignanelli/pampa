import { gdpFmt } from "@/lib/cat";

type Point = { date: Date; avg: number };

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function WeightChart({
  series,
  targetKg,
  projDate,
}: {
  series: Point[];
  targetKg: number;
  projDate: Date | null;
}) {
  if (series.length < 2) {
    return <div className="empty">Sin pesajes suficientes para graficar.</div>;
  }

  const W = 320;
  const H = 150;
  const padL = 34;
  const padR = 8;
  const padT = 10;
  const padB = 30;

  const last = series[series.length - 1];
  const minV = Math.min(...series.map((p) => p.avg)) - 10;
  const maxV = Math.max(targetKg, ...series.map((p) => p.avg)) + 5;

  const t0 = series[0].date.getTime();
  const tEnd = (projDate ?? last.date).getTime();
  const span = Math.max(1, tEnd - t0);

  const x = (d: Date) => padL + ((d.getTime() - t0) / span) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - minV) / (maxV - minV)) * (H - padT - padB);

  const realPts = series.map((p) => `${x(p.date).toFixed(1)},${y(p.avg).toFixed(1)}`).join(" ");
  const projPts =
    projDate !== null ? `${x(last.date).toFixed(1)},${y(last.avg).toFixed(1)} ${x(projDate).toFixed(1)},${y(targetKg).toFixed(1)}` : "";

  const fmtTick = (d: Date) => `${MONTHS[d.getMonth()]}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Curva de peso del lote">
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="var(--border)" strokeWidth={1} />
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--border)" strokeWidth={1} />
      <text x={padL - 6} y={y(maxV) + 4} textAnchor="end" fontSize={9} fill="var(--text-tertiary)">
        {Math.round(maxV)}
      </text>
      <text x={padL - 6} y={y(minV)} textAnchor="end" fontSize={9} fill="var(--text-tertiary)">
        {Math.round(minV)}
      </text>
      {projPts && <polyline points={projPts} fill="none" stroke="#1D9E75" strokeWidth={2.5} strokeDasharray="4 3" />}
      <polyline points={realPts} fill="none" stroke="#1D9E75" strokeWidth={2.5} />
      {series.map((p, i) => (
        <g key={i}>
          <circle cx={x(p.date)} cy={y(p.avg)} r={3.5} fill="#1D9E75" />
          <text x={x(p.date)} y={H - padB + 14} textAnchor="middle" fontSize={9} fill="var(--text-tertiary)">
            {fmtTick(p.date)}
          </text>
        </g>
      ))}
      {projDate && (
        <>
          <circle cx={x(projDate)} cy={y(targetKg)} r={3.5} fill="none" stroke="#1D9E75" strokeWidth={2} />
          <text x={x(projDate)} y={H - padB + 14} textAnchor="middle" fontSize={9} fill="#0F6E56">
            {fmtTick(projDate)}*
          </text>
        </>
      )}
    </svg>
  );
}

export function gdpLabel(n: number) {
  return gdpFmt(n);
}
