import type { Field } from 'payload'

export const publicPathField: Field = {
  name: 'publicPath',
  type: 'text',
  admin: {
    position: 'sidebar',
    description: 'Optional public path. Leave empty to use the slug. Set this to keep an existing WordPress URL.',
  },
}
