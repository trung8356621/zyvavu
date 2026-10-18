// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { databaseURL, databaseError, validateAdmin, validateWebsite } from '@/lib/installation/validation'
import { assertNotInstalled, newInstallationRecord, readRecord, saveRecord, withInstallationLock, persistEnvironment, hasPersistedConfiguration, type InstallationRecord } from '@/lib/installation/store'
import { setupMessages } from '@/lib/installation/messages'
import { defaultDatabaseSSL } from '@/lib/installation/input'

const website = { siteName: 'Demo', siteUrl: 'https://example.com', language: 'vi', timezone: 'Asia/Ho_Chi_Minh', activeThemeId: 'corporate' }
const database = { host: 'db.example.com', port: '5432', database: 'cms', username: 'operator', password: 'a@b:#\n', ssl: 'verify-full' }
let directory: string
let record: InstallationRecord
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'zyvavu-setup-unit-'))
  vi.stubEnv('SETUP_STATE_DIR', path.join(directory, 'state'))
  vi.spyOn(process, 'cwd').mockReturnValue(directory)
  record = { phase: 'database', secret: 'generated-secret', databaseUrl: databaseURL(database), website }
})
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }) })

describe('setup validation and localization', () => {
  it('uses local SSL defaults only for loopback hosts, with no new driver modes', () => {
    for (const host of ['127.0.0.1', 'localhost', '::1', '[::1]']) expect(defaultDatabaseSSL(host)).toBe('disable')
    for (const host of ['db.example.com', 'localhost.example.com', '192.168.1.10']) expect(defaultDatabaseSSL(host)).toBe('verify-full')
  })
  it('encodes credentials and preserves remote host and verified TLS', () => {
    const url = new URL(databaseURL(database))
    expect(decodeURIComponent(url.password)).toBe(database.password)
    expect(url.hostname).toBe('db.example.com')
    expect(url.searchParams.get('sslmode')).toBe('verify-full')
    expect(databaseURL(database)).not.toContain('\n')
  })
  it('rejects invalid ports, host injection and insecure unsupported TLS modes', () => {
    for (const input of [{ port: '0' }, { port: '65536' }, { host: 'host/path' }, { ssl: 'no-verify' }]) expect(() => databaseURL({ ...database, ...input })).toThrow('validation')
  })
  it('accepts only supported site settings and strong administrator credentials', () => {
    expect(validateWebsite(website).siteUrl).toBe('https://example.com')
    for (const input of [{ siteUrl: 'https://example.com/path' }, { timezone: 'Invalid' }, { language: 'fr' }, { activeThemeId: '__proto__' }]) expect(() => validateWebsite({ ...website, ...input })).toThrow('validation')
    expect(() => validateAdmin({ email: 'owner@example.com', password: 'short' })).toThrow('adminValidation')
    expect(validateAdmin({ email: 'OWNER@example.com', password: 'long-private-password' }).email).toBe('owner@example.com')
  })
  it('maps PostgreSQL errors without leaking diagnostic text', () => {
    for (const [code, key] of [['28P01', 'authentication'], ['3D000', 'missingDatabase'], ['42501', 'databasePermission'], ['ECONNREFUSED', 'connection']]) {
      expect(databaseError({ code, message: 'private connection data' }).key).toBe(key)
    }
  })
  it('has nonempty Vietnamese and English translations for every key and error', () => {
    expect(Object.keys(setupMessages.vi)).toEqual(Object.keys(setupMessages.en))
    expect(Object.keys(setupMessages.vi.errors)).toEqual(Object.keys(setupMessages.en.errors))
    for (const language of Object.values(setupMessages)) for (const value of Object.values(language)) {
      if (typeof value === 'string') expect(value.length).toBeGreaterThan(0)
      else for (const error of Object.values(value)) expect(error.length).toBeGreaterThan(0)
    }
  })
})
describe('private installation persistence', () => {
  it('allows first setup directly and permanently refuses installed-state reuse', () => {
    expect(() => assertNotInstalled(null)).not.toThrow()
    expect(() => assertNotInstalled(record)).not.toThrow()
    expect(() => assertNotInstalled({ ...record, phase: 'installed' })).toThrow('installed')
  })
  it('generates independent cryptographically strong Payload secrets without activation', () => {
    const first = newInstallationRecord()
    expect(first.secret).toMatch(/^[a-f0-9]{96}$/)
    expect(first.secret).not.toBe(newInstallationRecord().secret)
  })
  it('atomically saves and resumes progress without administrator passwords', async () => {
    await saveRecord(record)
    expect(await readRecord()).toEqual(record)
    await saveRecord({ ...record, phase: 'website' })
    expect((await readRecord())?.phase).toBe('website')
    expect(await readRecord()).not.toHaveProperty('password')
  })
  it('serializes competing workers and releases the lock on failure', async () => {
    await expect(withInstallationLock(async () => {
      await expect(withInstallationLock(async () => true)).rejects.toThrow('busy')
      throw new Error('failure')
    })).rejects.toThrow('failure')
    expect(await withInstallationLock(async () => true)).toBe(true)
  })
  it('preserves existing env files and supports hosting variables', async () => {
    await writeFile(path.join(directory, '.env.local'), 'EXISTING=value\n')
    await expect(persistEnvironment(record)).rejects.toThrow('manualConfiguration')
    const fallback = JSON.parse(await readFile(path.join(directory, 'state', 'hosting.json'), 'utf8'))
    expect(fallback).toEqual({ DATABASE_URL: record.databaseUrl, PAYLOAD_SECRET: record.secret, NEXT_PUBLIC_SERVER_URL: website.siteUrl })
    expect(await readFile(path.join(directory, '.env.local'), 'utf8')).toBe('EXISTING=value\n')
    vi.stubEnv('DATABASE_URL', record.databaseUrl!)
    vi.stubEnv('PAYLOAD_SECRET', record.secret)
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', website.siteUrl)
    await expect(persistEnvironment(record)).resolves.toBeUndefined()
  })
  it('writes a new configuration once and permits an identical retry', async () => {
    await persistEnvironment(record)
    await expect(persistEnvironment(record)).resolves.toBeUndefined()
  })
  it('does not serialize secrets that dotenv expansion could silently change', async () => {
    await expect(persistEnvironment({ ...record, secret: 'private$hosting-secret' })).rejects.toThrow('manualConfiguration')
  })
})

describe('temporary setup directory lifecycle', () => {
  it('removes completed progress only after configuration is safely persisted and the lock released', async () => {
    await withInstallationLock(async () => {
      await persistEnvironment(record)
      await saveRecord({ ...record, phase: 'installed' })
      expect(await readRecord()).not.toBeNull()
    })
    await expect(stat(path.join(directory, 'state'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(readFile(path.join(directory, 'state', 'state.json'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(readFile(path.join(directory, 'state', 'lock'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await hasPersistedConfiguration()).toBe(true)
    expect(await readRecord()).toBeNull()
  })
  it('retains provisioning progress and configuration after a failed installation', async () => {
    await expect(withInstallationLock(async () => {
      await persistEnvironment(record)
      await saveRecord({ ...record, phase: 'provisioning' })
      throw new Error('interrupted')
    })).rejects.toThrow('interrupted')
    expect((await readRecord())?.phase).toBe('provisioning')
    expect(await hasPersistedConfiguration()).toBe(true)
  })
  it('preserves unrelated files and never recursively deletes a custom state directory', async () => {
    await saveRecord(record)
    await writeFile(path.join(directory, 'state', 'keep.txt'), 'keep')
    await withInstallationLock(async () => { await saveRecord({ ...record, phase: 'installed' }) })
    expect(await readFile(path.join(directory, 'state', 'keep.txt'), 'utf8')).toBe('keep')
    expect(await hasPersistedConfiguration()).toBe(true)
    expect(await readRecord()).toBeNull()
  })
  it('keeps recovery state when configuration persistence fails', async () => {
    await writeFile(path.join(directory, '.env.local'), 'EXISTING=value')
    await expect(withInstallationLock(async () => { await saveRecord({ ...record, phase: 'installed' }) })).rejects.toThrow('manualConfiguration')
    expect((await readRecord())?.phase).toBe('installed')
    expect(await readFile(path.join(directory, '.env.local'), 'utf8')).toBe('EXISTING=value')
  })
})
