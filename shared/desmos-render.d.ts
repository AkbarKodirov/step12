export type DesmosLine = { text: string; latex?: string; color?: string; graphed?: boolean; params?: [string, string][]; rmse?: string; result?: string; others?: [string, string][][] }
export type DesmosScreen = {
  title?: string
  lines: DesmosLine[]
  curves: { color?: string; dashed?: boolean; segs: [number, number][][] }[]
  points: { x: number; y: number; label: string }[]
  window: [number, number, number, number]
}
export const DESMOS_COLORS: Record<string, string>
export const DESMOS_ORDER: string[]
export function fmt(v: number): string
export function toLatex(t: string): string
export function desmosLatex(latex: string | undefined, text: string): string
export function renderDesmosSvg(screen: DesmosScreen): string
