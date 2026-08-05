/** Minimaler Ersatz für `clsx`/`classnames` — keine zusätzliche Abhängigkeit für eine Zeile Logik. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
