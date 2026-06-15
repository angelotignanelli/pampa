// Gauge radial de 270° con track en degradé (verde → ámbar → coral) y knob en el valor.

export function Gauge({ value, size = 200 }: { value: number; size?: number }) {
  const cx = 100;
  const cy = 100;
  const r = 80;
  const sw = 14;
  const C = 2 * Math.PI * r;
  const arcFrac = 0.75; // 270°
  const arcLen = C * arcFrac;
  const v = Math.max(0, Math.min(100, value)) / 100;

  // El arco arranca (tras rotate 135°) en la pantalla a 135° y barre 270° en sentido horario.
  const knobAngle = (135 + v * 270) * (Math.PI / 180);
  const knobX = cx + r * Math.cos(knobAngle);
  const knobY = cy + r * Math.sin(knobAngle);

  return (
    <svg viewBox={`0 0 ${size === 200 ? 200 : 200} 200`} width={size} height={size} role="img" aria-label={`Salud del rodeo: ${Math.round(value)}%`}>
      <defs>
        <linearGradient id="gaugeGrad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#3e4a35" />
          <stop offset="55%" stopColor="#c9913f" />
          <stop offset="100%" stopColor="#cf6b43" />
        </linearGradient>
      </defs>

      {/* Track gris */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--bg-secondary)"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={`${arcLen} ${C - arcLen}`}
        transform={`rotate(135 ${cx} ${cy})`}
      />
      {/* Progreso en degradé */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="url(#gaugeGrad)"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={`${arcLen * v} ${C - arcLen * v}`}
        transform={`rotate(135 ${cx} ${cy})`}
      />
      {/* Knob */}
      <circle cx={knobX} cy={knobY} r={9} fill="var(--bg-primary)" stroke="var(--olive)" strokeWidth={4} />

      <text x={cx} y={cy - 2} textAnchor="middle" fontSize={30} fontWeight={500} fill="var(--text-primary)">
        {Math.round(value)}%
      </text>
      <text x={cx} y={cy + 20} textAnchor="middle" fontSize={11} fill="var(--text-tertiary)">
        del rodeo
      </text>
    </svg>
  );
}
