export function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)

  if (!match) {
    return { data: {}, content: raw }
  }

  const data: Record<string, unknown> = {}
  const lines = match[1].split('\n')

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)

    if (!pair) {
      continue
    }

    const [, key, value] = pair

    if (value === '') {
      const list: string[] = []

      while (lines[index + 1]?.startsWith('  - ')) {
        index += 1
        list.push(lines[index].replace(/^  - /, '').trim())
      }

      data[key] = list
      continue
    }

    if (value === 'true' || value === 'false') {
      data[key] = value === 'true'
      continue
    }

    data[key] = value.replace(/^['"]|['"]$/g, '')
  }

  return { data, content: match[2] }
}
