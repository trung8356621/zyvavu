import { describe, expect, it } from 'vitest'

import {
  buildMailtoHref,
  buildTelHref,
  ensureContactEntryId,
  normalizeContactEntries,
  resolveContactHref,
  SAMPLE_CONTACT_ENTRIES,
  selectContactEntries,
  validateContactEntryFields,
  validateContactLink,
  type ContactEntry,
} from '@/lib/site/contact'

const baseEntries: ContactEntry[] = SAMPLE_CONTACT_ENTRIES.map((entry, order) => ({
  ...entry,
  order,
}))

describe('contact entry data model', () => {
  it('adds and normalizes entries with stable ids and order', () => {
    const normalized = normalizeContactEntries([
      {
        entryId: 'contact-phone',
        key: 'Hotline',
        value: '+84 1900 8888',
        semantics: 'phone',
        order: 1,
      },
      { key: 'Custom', value: 'Hello', link: 'https://zyvavu.test', order: 0 },
    ])
    expect(normalized).toHaveLength(2)
    expect(normalized[0].key).toBe('Custom')
    expect(normalized[0].entryId).toMatch(/^contact-/)
    expect(normalized[1].entryId).toBe('contact-phone')
  })

  it('keeps entryId when key is renamed', () => {
    const renamed = normalizeContactEntries([
      {
        entryId: 'contact-phone',
        key: 'Support Line',
        value: '+84 1900 8888',
        semantics: 'phone',
        order: 0,
      },
    ])
    expect(renamed[0].entryId).toBe('contact-phone')
    expect(renamed[0].key).toBe('Support Line')
    expect(resolveContactHref(renamed[0])).toBe(buildTelHref('+84 1900 8888'))
  })

  it('updates phone/email href from value, not key', () => {
    const phone = {
      entryId: 'contact-phone',
      key: 'Anything',
      value: '+84 28 1234 5678',
      semantics: 'phone' as const,
      order: 0,
    }
    const email = {
      entryId: 'contact-email',
      key: 'Inbox',
      value: 'support@zyvavu.test',
      semantics: 'email' as const,
      order: 1,
    }
    expect(resolveContactHref(phone)).toBe(buildTelHref(phone.value))
    expect(resolveContactHref(email)).toBe(buildMailtoHref(email.value))
    expect(
      resolveContactHref({
        value: phone.value,
        semantics: 'phone',
        link: null,
      }),
    ).toBe(buildTelHref(phone.value))
    // Renaming key must not change tel:/mailto: resolution.
    expect(
      resolveContactHref({
        value: phone.value,
        semantics: 'phone',
        link: null,
      }),
    ).toBe(resolveContactHref({ value: phone.value, semantics: 'phone', link: 'https://ignored.test' }))
  })

  it('reorders by order field', () => {
    const reordered = normalizeContactEntries([
      { entryId: 'b', key: 'B', value: '2', order: 2 },
      { entryId: 'a', key: 'A', value: '1', order: 0 },
      { entryId: 'c', key: 'C', value: '3', order: 1 },
    ])
    expect(reordered.map((e) => e.entryId)).toEqual(['a', 'c', 'b'])
  })

  it('skips deleted entries in widget selection gracefully', () => {
    const selected = selectContactEntries(baseEntries, [
      'contact-phone',
      'missing-id',
      'contact-facebook',
    ])
    expect(selected.map((e) => e.entryId)).toEqual(['contact-phone', 'contact-facebook'])
  })

  it('validates optional link and rejects unsafe schemes', () => {
    expect(validateContactLink('')).toBe(true)
    expect(validateContactLink('https://zyvavu.test/about')).toBe(true)
    expect(validateContactLink('javascript:alert(1)')).not.toBe(true)
    expect(validateContactLink('data:text/html,hi')).not.toBe(true)
    expect(
      resolveContactHref({
        value: 'X',
        link: 'javascript:alert(1)',
        semantics: null,
      }),
    ).toBeNull()
  })

  it('validates phone/email semantics against value', () => {
    expect(
      validateContactEntryFields({
        key: 'Hotline',
        value: 'not-a-phone',
        semantics: 'phone',
      }),
    ).not.toBe(true)
    expect(
      validateContactEntryFields({
        key: 'Email',
        value: 'bad-email',
        semantics: 'email',
      }),
    ).not.toBe(true)
    expect(
      validateContactEntryFields({
        key: 'Hotline',
        value: '+84 1900 8888',
        semantics: 'phone',
      }),
    ).toBe(true)
  })

  it('ensures generated entry ids are stable non-empty strings', () => {
    expect(ensureContactEntryId('contact-phone')).toBe('contact-phone')
    expect(ensureContactEntryId('')).toMatch(/^contact-/)
  })
})
