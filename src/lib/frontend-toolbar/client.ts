export async function logoutToolbarSession(url: string): Promise<void> {
  const response = await fetch(url, {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { DisableAutologin: 'true' },
  })
  if (!response.ok) throw new Error('Logout failed')
}
