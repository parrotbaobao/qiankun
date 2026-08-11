export function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{([^}]+)\}\}/g) ?? []
  return [...new Set(matches.map(m => m.slice(2, -2).trim()))]
}

export function fillTemplate(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{([^}]+)\}\}/g, (_, name) => vars[name.trim()] ?? `{{${name.trim()}}}`)
}

export function formatVarLabel(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
