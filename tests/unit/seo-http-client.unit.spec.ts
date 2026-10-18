/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchWithRedirectTrace } from '../../scripts/seo-audit/http-client'

describe('SEO HTTP bounded retry', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('retries once after HTTP 408 and returns the successful response', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 408 }))
      .mockResolvedValueOnce(new Response('ready'))
    const response = fetchWithRedirectTrace('https://example.test/')
    await vi.runAllTimersAsync()

    expect(await response).toMatchObject({ statusCode: 200, bodyText: 'ready', retriesPerformed: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry when explicitly disabled', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 408 }))
    const response = await fetchWithRedirectTrace('https://example.test/', { allowRetry: false })

    expect(response.statusCode).toBe(408)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('stops after a second timeout and marks it inconclusive', async () => {
    fetchMock.mockRejectedValue(new DOMException('Timed out', 'AbortError'))
    const response = fetchWithRedirectTrace('https://example.test/')
    await vi.runAllTimersAsync()

    expect(await response).toMatchObject({
      timedOut: true,
      isInconclusiveTimeout: true,
      retriesPerformed: 1,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
