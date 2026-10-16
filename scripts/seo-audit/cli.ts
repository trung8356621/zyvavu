import fs from 'node:fs'
import path from 'node:path'
import type { AuditConfig } from './types'
import { runSeoAudit } from './audit-runner'
import { formatMarkdownReport } from './reporter'

function parseArgs(args: string[]): AuditConfig {
  const config: AuditConfig = {
    baseUrl: 'http://localhost:3107',
    maxDepth: 3,
    maxPages: 30,
    outputDir: './audit-reports',
    format: 'all',
  }

  for (const arg of args) {
    if (arg.startsWith('--url=')) {
      config.baseUrl = arg.split('=')[1]
    } else if (arg.startsWith('--depth=')) {
      config.maxDepth = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--max-pages=')) {
      config.maxPages = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--pairs=')) {
      const filePath = arg.split('=')[1]
      try {
        const content = fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf-8')
        config.pairs = JSON.parse(content)
      } catch (err: unknown) {
        console.error(`Failed to load pairs from ${filePath}: ${(err as Error).message}`)
      }
    } else if (arg.startsWith('--inventory=')) {
      const filePath = arg.split('=')[1]
      try {
        const content = fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf-8')
        config.urlInventory = JSON.parse(content)
      } catch (err: unknown) {
        console.error(`Failed to load inventory from ${filePath}: ${(err as Error).message}`)
      }
    } else if (arg.startsWith('--output-dir=')) {
      config.outputDir = arg.split('=')[1]
    } else if (arg.startsWith('--format=')) {
      config.format = arg.split('=')[1] as 'markdown' | 'json' | 'all'
    }
  }

  return config
}

async function main() {
  const args = process.argv.slice(2)
  const config = parseArgs(args)

  console.log(`Starting Zyvavu SEO Parity Audit against ${config.baseUrl}...`)
  console.log(`Mode: ${config.pairs && config.pairs.length > 0 ? 'Mode B (WordPress Parity Comparison)' : 'Mode A (Zyvavu Self-Audit)'}`)

  const report = await runSeoAudit(config)
  const outputDir = path.resolve(process.cwd(), config.outputDir || './audit-reports')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-')
  const mdPath = path.join(outputDir, `seo-audit-${timestampStr}.md`)
  const jsonPath = path.join(outputDir, `seo-audit-${timestampStr}.json`)
  const latestMdPath = path.join(outputDir, `latest.md`)
  const latestJsonPath = path.join(outputDir, `latest.json`)

  const markdownContent = formatMarkdownReport(report)
  const jsonContent = JSON.stringify(report, null, 2)

  if (config.format === 'markdown' || config.format === 'all') {
    fs.writeFileSync(mdPath, markdownContent, 'utf-8')
    fs.writeFileSync(latestMdPath, markdownContent, 'utf-8')
    console.log(`Markdown report written to: ${mdPath}`)
  }

  if (config.format === 'json' || config.format === 'all') {
    fs.writeFileSync(jsonPath, jsonContent, 'utf-8')
    fs.writeFileSync(latestJsonPath, jsonContent, 'utf-8')
    console.log(`JSON report written to: ${jsonPath}`)
  }

  console.log('\n--- AUDIT SUMMARY ---')
  console.log(`Total Pages Audited: ${report.summary.totalAuditedUrls}`)
  console.log(`Total URLs Crawled: ${report.summary.crawledPages}`)
  console.log(`PASS: ${report.summary.passCount} | FAIL: ${report.summary.failCount} | WARNING: ${report.summary.warningCount}`)
  console.log(`Severity -> High: ${report.summary.highCount} | Medium: ${report.summary.mediumCount} | Low: ${report.summary.lowCount}`)
  console.log(`Parity Status: ${report.parityStatus}`)
}

main().catch((err) => {
  console.error('Audit run failed:', err)
  process.exit(1)
})
