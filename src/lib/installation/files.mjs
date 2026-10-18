import { randomBytes } from 'node:crypto'
import { open, link, rename, unlink } from 'node:fs/promises'

// Keep temporary files beside the target: rename/link must stay on the same filesystem.
export async function writePrivateFile(target, contents, exclusive = false) {
  const temporary = `${target}.${randomBytes(12).toString('hex')}.tmp`
  try {
    const handle = await open(temporary, 'wx', 0o600)
    try { await handle.writeFile(contents, 'utf8'); await handle.sync() }
    finally { await handle.close() }
    if (exclusive) await link(temporary, target)
    else await rename(temporary, target)
  } finally {
    await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error })
  }
}

export function environmentValues(record) {
  if (!record.databaseUrl || !record.website?.siteUrl || !record.secret) throw new Error('Incomplete configuration')
  return { DATABASE_URL: record.databaseUrl, PAYLOAD_SECRET: record.secret, NEXT_PUBLIC_SERVER_URL: record.website.siteUrl }
}

export function environmentText(record) {
  return Object.entries(environmentValues(record)).map(([name, value]) => {
    // Avoid dotenv/Next variable expansion changing a preexisting hosting secret.
    // Complex values use the private JSON/manual hosting fallback instead.
    if (/[\r\n"'\\$]/.test(value)) throw new Error('Manual configuration required')
    return `${name}=${value}`
  }).join('\n') + '\n'
}
