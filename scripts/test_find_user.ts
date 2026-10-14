import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config.ts'

console.log('Initializing Payload...')
try {
  const payload = await getPayload({ config })
  console.log('Payload initialized.')
  const { jwtSign } = await import('../node_modules/payload/dist/auth/jwt.js')
  const { JWTAuthentication } = await import('../node_modules/payload/dist/auth/strategies/jwt.js')
  const { token } = await jwtSign({
    fieldsToSign: {
      id: 7,
      collection: 'users',
      email: 'trungtien1993@gmail.com',
      role: 'system-admin',
      sid: 'b4f37667-b545-41c4-8d68-692a3c30c8a7',
    },
    secret: payload.secret,
    tokenExpiration: 7200,
  })
  console.log('Token:', token.substring(0, 50) + '...')

  const headers = new Headers()
  headers.set('Cookie', `payload-token=${token}`)
  headers.set('Origin', 'https://zyvavu.test')

  const authResult = await JWTAuthentication({
    headers,
    payload,
    strategyName: 'local-jwt',
  })
  console.log('JWTAuthentication result:', authResult)

  const res = await fetch('http://zyvavu.test/api/users/me', {
    headers: {
      Cookie: `payload-token=${token}`,
      'Sec-Fetch-Site': 'same-origin',
    },
  })
  console.log('Fetch status:', res.status)
  console.log('Fetch body with Sec-Fetch-Site only:', await res.json())
} catch (e) {
  console.error('Error:', e)
}
process.exit(0)
