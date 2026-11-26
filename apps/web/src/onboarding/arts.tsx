/** Живые иллюстрации: только SVG/CSS, без внешних ассетов. */

export function ArtCapture() {
  const chips = [
    { x: 18, y: 16, d: "0s", label: "link" },
    { x: 96, y: 6, d: ".35s", label: "note" },
    { x: 176, y: 14, d: ".7s", label: "pdf" },
    { x: 246, y: 4, d: "1.05s", label: "audio" },
    { x: 60, y: 62, d: "1.4s", label: "video" },
  ];
  return (
    <svg viewBox="0 0 320 210" className="ob-svg" role="img" aria-label="Материалы стекаются в архив">
      <defs>
        <linearGradient id="obVault" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--ob-a)" stopOpacity=".95" />
          <stop offset="1" stopColor="var(--ob-b)" stopOpacity=".8" />
        </linearGradient>
      </defs>
      {chips.map((c, i) => (
        <g key={c.label} className="ob-float" style={{ animationDelay: c.d }}>
          <rect x={c.x} y={c.y} width="58" height="30" rx="9" className="ob-chip-rect" />
          <circle cx={c.x + 15} cy={c.y + 15} r="5" fill="var(--ob-a)" opacity={0.5 + i * 0.1} />
          <rect x={c.x + 26} y={c.y + 11} width="22" height="3.5" rx="2" className="ob-line" />
          <rect x={c.x + 26} y={c.y + 18} width="14" height="3.5" rx="2" className="ob-line dim" />
        </g>
      ))}
      <path d="M47 46 C 90 110, 130 120, 160 138" className="ob-funnel" />
      <path d="M125 36 C 140 100, 150 116, 160 138" className="ob-funnel" style={{ animationDelay: ".4s" }} />
      <path d="M205 44 C 190 104, 175 118, 160 138" className="ob-funnel" style={{ animationDelay: ".8s" }} />
      <path d="M275 34 C 240 100, 190 118, 160 138" className="ob-funnel" style={{ animationDelay: "1.2s" }} />
      <rect x="96" y="140" width="128" height="52" rx="14" fill="url(#obVault)" opacity=".18" />
      <rect x="96" y="140" width="128" height="52" rx="14" className="ob-vault" />
      <rect x="112" y="156" width="60" height="5" rx="2.5" className="ob-line" />
      <rect x="112" y="168" width="38" height="5" rx="2.5" className="ob-line dim" />
      <circle cx="200" cy="166" r="11" className="ob-pulse" />
      <path d="M195 166 l4 4 l7 -8" className="ob-tick" />
    </svg>
  );
}

export function ArtAI() {
  return (
    <svg viewBox="0 0 320 210" className="ob-svg" role="img" aria-label="Аннотация и теги создаются автоматически">
      <rect x="24" y="22" width="176" height="164" rx="14" className="ob-doc" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x="42"
          y={46 + i * 20}
          height="6"
          rx="3"
          className="ob-type"
          style={{ animationDelay: `${0.25 + i * 0.28}s`, ["--w" as string]: `${[132, 118, 140, 96, 124][i]}px` }}
        />
      ))}
      <g className="ob-spark">
        <path d="M232 40 l6 16 l16 6 l-16 6 l-6 16 l-6 -16 l-16 -6 l16 -6 z" fill="var(--ob-a)" />
      </g>
      {["аннотация", "теги", "язык"].map((t, i) => (
        <g key={t} className="ob-pop" style={{ animationDelay: `${1.5 + i * 0.3}s` }}>
          <rect x="216" y={96 + i * 32} width="86" height="24" rx="12" className="ob-tag" />
          <circle cx="230" cy={108 + i * 32} r="4" fill={i === 1 ? "var(--ob-b)" : "var(--ob-a)"} />
          <rect x="240" y={105 + i * 32} width="48" height="5" rx="2.5" className="ob-line" />
        </g>
      ))}
    </svg>
  );
}

export function ArtSearch() {
  const nodes = [
    { x: 60, y: 120, hit: true },
    { x: 118, y: 92, hit: false },
    { x: 132, y: 158, hit: true },
    { x: 196, y: 116, hit: false },
    { x: 248, y: 78, hit: true },
    { x: 258, y: 164, hit: false },
  ];
  const edges = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [1, 4]];
  return (
    <svg viewBox="0 0 320 210" className="ob-svg" role="img" aria-label="Семантический поиск связывает материалы по смыслу">
      <rect x="24" y="20" width="272" height="36" rx="18" className="ob-searchbar" />
      <circle cx="48" cy="38" r="7" className="ob-glass" />
      <path d="M53 43 l6 6" className="ob-glass" />
      <rect x="68" y="34" height="7" rx="3.5" className="ob-type" style={{ animationDelay: ".2s", ["--w" as string]: "150px" }} />
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
          className="ob-edge" style={{ animationDelay: `${0.6 + i * 0.16}s` }}
        />
      ))}
      {nodes.map((n, i) => (
        <g key={i} className={n.hit ? "ob-node hit" : "ob-node"} style={{ animationDelay: `${1 + i * 0.2}s` }}>
          <circle cx={n.x} cy={n.y} r={n.hit ? 13 : 9} />
          {n.hit && <circle cx={n.x} cy={n.y} r="13" className="ob-ring" />}
        </g>
      ))}
    </svg>
  );
}

export function ArtExport() {
  return (
    <svg viewBox="0 0 320 210" className="ob-svg" role="img" aria-label="Экспорт в Markdown, JSON и Obsidian">
      <path d="M30 40 h56 l12 14 h192 a10 10 0 0 1 10 10 v112 a10 10 0 0 1 -10 10 H30 a10 10 0 0 1 -10 -10 V50 a10 10 0 0 1 10 -10 z" className="ob-folder" />
      {["Заметка.md", "Лекция.md", "attachments/"].map((f, i) => (
        <g key={f} className="ob-pop" style={{ animationDelay: `${0.3 + i * 0.25}s` }}>
          <rect x="44" y={78 + i * 30} width="150" height="22" rx="7" className="ob-file" />
          <rect x="56" y={86 + i * 30} width="8" height="6" rx="2" fill={i === 2 ? "var(--ob-b)" : "var(--ob-a)"} />
          <rect x="72" y={86 + i * 30} width={i === 2 ? 76 : 96} height="6" rx="3" className="ob-line" />
        </g>
      ))}
      {["MD", "JSON", "OBS"].map((f, i) => (
        <g key={f} className="ob-badge" style={{ animationDelay: `${1.1 + i * 0.22}s` }}>
          <rect x="212" y={78 + i * 30} width="72" height="22" rx="11" className="ob-tag" />
          <text x="248" y={93 + i * 30} textAnchor="middle" className="ob-badge-text">{f}</text>
        </g>
      ))}
      <g className="ob-zip">
        <rect x="196" y="164" width="88" height="26" rx="9" className="ob-vault" />
        <text x="240" y="181" textAnchor="middle" className="ob-badge-text">.zip</text>
      </g>
    </svg>
  );
}
