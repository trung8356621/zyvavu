/**
 * Build a searchable Lucide catalog from the installed lucide-static package.
 * Run: node scripts/generate-icon-catalog.mjs
 */
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const tags = require('lucide-static/tags.json')
const pkg = require('lucide-static/package.json')

const CATEGORY_RULES = [
  ['arrows', [/arrow/, /chevron/, /move/, /corner/, /unfold/, /shrink/, /expand/]],
  [
    'devices',
    [
      /device/,
      /monitor/,
      /smartphone/,
      /tablet/,
      /laptop/,
      /cpu/,
      /hard.?drive/,
      /keyboard/,
      /mouse/,
      /printer/,
      /router/,
      /server/,
      /usb/,
      /bluetooth/,
      /wifi/,
      /battery/,
    ],
  ],
  ['communication', [/mail/, /message/, /chat/, /phone/, /call/, /inbox/, /send/, /reply/, /voicemail/]],
  ['media', [/play/, /pause/, /music/, /video/, /film/, /camera/, /image/, /mic/, /volume/, /speaker/, /radio/, /podcast/]],
  ['files', [/file/, /folder/, /document/, /clipboard/, /archive/, /download/, /upload/, /save/, /trash/, /delete/]],
  ['layout', [/layout/, /panel/, /sidebar/, /grid/, /columns/, /rows/, /split/, /align/, /distribute/, /gallery/]],
  ['shapes', [/circle/, /square/, /triangle/, /hexagon/, /octagon/, /diamond/, /shape/, /box/]],
  ['text', [/type/, /text/, /font/, /bold/, /italic/, /underline/, /heading/, /letter/, /spell/, /quote/]],
  ['weather', [/cloud/, /sun/, /moon/, /rain/, /snow/, /wind/, /thermometer/, /umbrella/, /droplet/]],
  ['nature', [/tree/, /leaf/, /flower/, /mountain/, /flame/, /sprout/, /bug/, /bird/, /fish/, /paw/]],
  ['travel', [/plane/, /car/, /bus/, /train/, /ship/, /bike/, /map/, /navigation/, /compass/, /globe/, /luggage/, /hotel/]],
  ['security', [/lock/, /key/, /shield/, /fingerprint/, /scan/, /eye/, /password/, /vault/]],
  ['time', [/clock/, /timer/, /calendar/, /history/, /hourglass/, /watch/, /alarm/]],
  ['users', [/user/, /people/, /person/, /contact/, /group/, /team/, /profile/]],
  ['commerce', [/cart/, /shopping/, /store/, /bag/, /credit/, /wallet/, /receipt/, /tag/, /badge/, /gift/, /percent/]],
  ['design', [/palette/, /brush/, /pen/, /pencil/, /paint/, /crop/, /layers/, /component/, /figma/, /bezier/]],
  ['development', [/code/, /terminal/, /bug/, /git/, /database/, /server/, /api/, /bracket/, /binary/]],
  ['math', [/plus/, /minus/, /equal/, /percent/, /sigma/, /pi/, /calculator/, /hash/, /infinity/]],
  ['medical', [/heart/, /activity/, /pill/, /syringe/, /stethoscope/, /hospital/, /ambulance/, /bandage/]],
  ['notifications', [/bell/, /alert/, /warning/, /info/, /help/, /badge/]],
  ['home', [/home/, /house/, /building/, /door/, /sofa/, /lamp/, /bed/]],
  ['social', [/share/, /thumbs/, /heart/, /star/, /bookmark/, /rss/, /at.?sign/]],
  ['accessibility', [/accessibility/, /wheelchair/, /ear/, /contrast/, /person.?standing/]],
]

function catsFor(name, iconTags) {
  const hay = [name, ...(iconTags || [])].join(' ').toLowerCase()
  const out = []
  for (const [cat, patterns] of CATEGORY_RULES) {
    if (patterns.some((re) => re.test(hay))) out.push(cat)
  }
  return out.length ? out : ['general']
}

const icons = Object.keys(tags)
  .sort()
  .map((name) => ({
    name,
    tags: tags[name] || [],
    categories: catsFor(name, tags[name]),
  }))

const categories = [...new Set(icons.flatMap((i) => i.categories))].sort()
const catalog = {
  source: 'lucide-static',
  version: pkg.version,
  generatedAt: new Date().toISOString(),
  categories,
  icons,
}

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/lib/icons/generated')
mkdirSync(outDir, { recursive: true })
const outFile = path.join(outDir, 'lucide-catalog.json')
writeFileSync(outFile, JSON.stringify(catalog))
console.log(`ICON_CATALOG_OK ${icons.length} icons → ${outFile}`)
