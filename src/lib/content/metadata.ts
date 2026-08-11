export interface MarkdownHeading {
  id: string
  text: string
  level: 2 | 3
}

export function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~[\]()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function extractMarkdownHeadings(markdown: string): MarkdownHeading[] {
  const seen = new Map<string, number>()
  const headings: MarkdownHeading[] = []

  for (const line of markdown.split('\n')) {
    const match = line.match(/^(#{2,3})\s+(.+)$/)

    if (!match) {
      continue
    }

    const text = match[2].replace(/\s+#+$/, '').trim()
    const base = slugifyHeading(text)

    if (!base) {
      continue
    }

    const count = seen.get(base) || 0
    seen.set(base, count + 1)

    headings.push({
      id: count ? `${base}-${count + 1}` : base,
      text,
      level: match[1].length as 2 | 3,
    })
  }

  return headings
}
