/** SVG colors for charts. Recharts takes literal colors, so light and dark are separate sets. */
export interface ChartTheme {
  line: string;
  band: string;
  grid: string;
  axis: string;
  tick: string;
  secondary: string;
  /** Fill inside hollow (detection-limit) dots: the chart background. */
  surface: string;
}

const LIGHT: ChartTheme = {
  line: "rgb(15 118 110)", // teal-700
  band: "rgb(16 185 129)", // emerald-500
  grid: "rgb(226 232 240)", // slate-200
  axis: "rgb(148 163 184)", // slate-400
  tick: "rgb(100 116 139)", // slate-500
  secondary: "rgb(148 163 184)",
  surface: "rgb(255 255 255)",
};

const DARK: ChartTheme = {
  line: "rgb(45 212 191)", // teal-400
  band: "rgb(52 211 153)", // emerald-400
  grid: "rgb(51 65 85)", // slate-700
  axis: "rgb(71 85 105)", // slate-600
  tick: "rgb(148 163 184)", // slate-400
  secondary: "rgb(100 116 139)",
  surface: "rgb(15 23 42)", // slate-900
};

export function chartTheme(dark: boolean): ChartTheme {
  return dark ? DARK : LIGHT;
}
