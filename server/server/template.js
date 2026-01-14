export function renderTemplate(input, vars) {
  return input
    .replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, key) => {
      const v = vars?.[key];
      return v === undefined || v === null ? "" : String(v);
    })
    .replace(/\{\{([a-zA-Z0-9]+)\}\}/g, (m, key) => {
      const v = vars?.[key];
      return v === undefined || v === null ? "" : String(v);
    });
}
