/** Shadow DOM styles. Kept as a string so the component is a single drop-in file. */

export const styles = `
:host {
  --gt-bg: #0b0b0d;
  --gt-panel: #121316;
  --gt-panel-2: #17181c;
  --gt-line: rgba(255, 255, 255, 0.08);
  --gt-text: #f2f2f3;
  --gt-muted: #8b8d96;
  --gt-dim: #5c5e67;
  --gt-up: #5eeaa8;
  --gt-down: #ff7a6b;
  --gt-accent: #5eeaa8;
  --gt-radius: 14px;
  --gt-font: "Inter", "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, sans-serif;
  --gt-mono: "JetBrains Mono", "Cascadia Mono", Consolas, monospace;

  display: block;
  box-sizing: border-box;
  font-family: var(--gt-font);
  color: var(--gt-text);
  background: var(--gt-bg);
  border-radius: var(--gt-radius);
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  container-type: inline-size;
}

:host([theme="light"]) {
  --gt-bg: #f4f5f8;
  --gt-panel: #ffffff;
  --gt-panel-2: #fafbfc;
  --gt-line: rgba(15, 20, 30, 0.1);
  --gt-text: #15171c;
  --gt-muted: #63666f;
  --gt-dim: #8a8d96;
}

:host([theme="glass"]) {
  --gt-bg: rgba(16, 18, 24, 0.62);
  --gt-panel: rgba(255, 255, 255, 0.05);
  --gt-panel-2: rgba(255, 255, 255, 0.03);
  --gt-line: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(26px) saturate(150%);
}

* { box-sizing: border-box; }

.gt-root { display: flex; flex-direction: column; height: 100%; min-height: 200px; }

/* header ------------------------------------------------------------------ */
.gt-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--gt-line);
  background: var(--gt-panel);
}
.gt-logo {
  width: 22px; height: 22px; border-radius: 7px; flex: none;
  display: grid; place-items: center;
  background: linear-gradient(140deg, var(--gt-accent), color-mix(in srgb, var(--gt-accent) 55%, #6ea8ff));
  color: #06120c; font-size: 11px; font-weight: 800;
}
.gt-title { font-size: 12.5px; font-weight: 650; letter-spacing: 0.2px; white-space: nowrap; }
.gt-search { position: relative; flex: 1 1 auto; min-width: 90px; }
.gt-search input {
  width: 100%; height: 28px; padding: 0 10px 0 26px;
  border: 1px solid var(--gt-line); border-radius: 9px;
  background: var(--gt-panel-2); color: var(--gt-text);
  font: inherit; font-size: 12px; outline: none;
}
.gt-search input:focus { border-color: color-mix(in srgb, var(--gt-accent) 60%, transparent); }
.gt-search svg { position: absolute; left: 8px; top: 7px; width: 13px; height: 13px; color: var(--gt-dim); pointer-events: none; }
.gt-results {
  position: absolute; top: 32px; left: 0; right: 0; z-index: 20; max-height: 240px; overflow-y: auto;
  border: 1px solid var(--gt-line); border-radius: 11px; background: var(--gt-panel);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45); padding: 4px; display: none;
}
.gt-results.open { display: block; }
.gt-hit { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; cursor: pointer; font-size: 12px; }
.gt-hit:hover, .gt-hit.sel { background: color-mix(in srgb, var(--gt-accent) 16%, transparent); }
.gt-hit b { font-weight: 650; min-width: 56px; }
.gt-hit span { color: var(--gt-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* body -------------------------------------------------------------------- */
.gt-body { display: grid; grid-template-columns: 210px minmax(0, 1fr); flex: 1 1 auto; min-height: 0; }
@container (max-width: 430px) { .gt-body { grid-template-columns: minmax(0, 1fr); } .gt-list { display: none; } }

/* watchlist --------------------------------------------------------------- */
.gt-list { border-right: 1px solid var(--gt-line); overflow-y: auto; overflow-x: hidden; background: var(--gt-panel); }
.gt-row {
  display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; align-items: center; gap: 8px;
  padding: 8px 10px; cursor: pointer; border-left: 2px solid transparent; min-width: 0;
}
.gt-row > div { min-width: 0; }
.gt-row:hover { background: var(--gt-panel-2); }
.gt-row.sel { background: var(--gt-panel-2); border-left-color: var(--gt-accent); }
.gt-avatar {
  width: 22px; height: 22px; border-radius: 6px; object-fit: contain; background: var(--gt-panel-2);
  display: grid; place-items: center; overflow: hidden; flex: none;
  font-size: 9px; font-weight: 700; letter-spacing: 0.2px; color: var(--gt-muted);
}
.gt-mono { font-size: 11.5px; font-weight: 640; letter-spacing: 0.2px; }
.gt-sub { font-size: 10px; color: var(--gt-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gt-px { font-size: 12px; font-weight: 620; font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.gt-ch { font-size: 10.5px; font-weight: 620; font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.gt-up { color: var(--gt-up); }
.gt-down { color: var(--gt-down); }
.gt-flat { color: var(--gt-muted); }

/* chart ------------------------------------------------------------------- */
.gt-main { display: flex; flex-direction: column; min-width: 0; overflow-y: auto; }
.gt-quote { padding: 12px 14px 6px; display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.gt-name { font-size: 15px; font-weight: 650; }
.gt-exchange { font-size: 10.5px; color: var(--gt-dim); }
.gt-price { font-size: 30px; font-weight: 660; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.gt-badge { padding: 3px 8px; border-radius: 8px; font-size: 12px; font-weight: 650; font-variant-numeric: tabular-nums; }
.gt-badge.up { background: color-mix(in srgb, var(--gt-up) 16%, transparent); color: var(--gt-up); }
.gt-badge.down { background: color-mix(in srgb, var(--gt-down) 16%, transparent); color: var(--gt-down); }
.gt-badge.flat { background: var(--gt-panel-2); color: var(--gt-muted); }
.gt-ranges { display: flex; gap: 3px; padding: 4px 14px 0; flex-wrap: wrap; }
.gt-range {
  padding: 3px 9px; border: 0; border-radius: 7px; background: transparent; color: var(--gt-muted);
  font: inherit; font-size: 11px; font-weight: 600; cursor: pointer;
}
.gt-range:hover { background: var(--gt-panel-2); color: var(--gt-text); }
.gt-range.active { background: color-mix(in srgb, var(--gt-accent) 16%, transparent); color: var(--gt-accent); }
.gt-chart { position: relative; height: var(--gt-chart-height, 240px); margin: 8px 14px 0; }
.gt-chart svg { display: block; width: 100%; height: 100%; }
.gt-grid { stroke: var(--gt-line); stroke-width: 1; }
.gt-label { fill: var(--gt-dim); font-size: 9.5px; font-family: var(--gt-font); }
.gt-cross { stroke: rgba(255, 255, 255, 0.28); stroke-width: 1; stroke-dasharray: 3 3; }
.gt-tip {
  position: absolute; pointer-events: none; padding: 5px 8px; border-radius: 8px;
  border: 1px solid var(--gt-line); background: var(--gt-panel); font-size: 11px; line-height: 1.45;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.4); white-space: nowrap; transform: translate(-50%, -130%);
}
.gt-tip b { font-variant-numeric: tabular-nums; }
.gt-tip i { color: var(--gt-muted); font-style: normal; }
.gt-stats {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px;
  padding: 12px 14px 14px;
}
.gt-stat { border-top: 1px solid var(--gt-line); padding-top: 6px; }
.gt-stat span { display: block; font-size: 10px; color: var(--gt-dim); text-transform: uppercase; letter-spacing: 0.4px; }
.gt-stat b { font-size: 12.5px; font-weight: 620; font-variant-numeric: tabular-nums; }
.gt-empty { display: grid; place-items: center; height: 100%; color: var(--gt-dim); font-size: 12px; }
.gt-foot { padding: 7px 14px; border-top: 1px solid var(--gt-line); font-size: 10.5px; color: var(--gt-dim); display: flex; gap: 8px; }
`;
