/** Replaces {placeholders}: fmt("Dès {amount}", { amount: "1 000 DH" }). */
export function fmt(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}
