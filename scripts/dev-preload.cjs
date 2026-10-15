/**
 * Development Preload for Zyvavu Dev Server
 *
 * Resolves Windows + Watchpack filesystem issues:
 * Normalizes Windows NTFS 'EINVAL' on system-protected directories (like 'System Volume Information')
 * so Watchpack's initial directory scanner completes gracefully without logging error spam or breaking scans.
 */

const Module = require('node:module')

const origRequire = Module.prototype.require
Module.prototype.require = function (id) {
  const result = origRequire.apply(this, arguments)

  if (
    typeof id === 'string' &&
    id.includes('watchpack') &&
    typeof result === 'function' &&
    result.prototype &&
    result.prototype.watch
  ) {
    if (!result.__zyvavu_dw_patched) {
      result.__zyvavu_dw_patched = true
      try {
        const dummy = new result()
        const dw = dummy.watcherManager.getDirectoryWatcher(process.cwd())
        const dwProto = Object.getPrototypeOf(dw)
        dummy.close()

        const origOnScanError = dwProto.onScanError
        dwProto.onScanError = function (err) {
          if (
            err &&
            (err.code === 'EINVAL' ||
              err.code === 'UNKNOWN' ||
              String(err).includes('System Volume Information'))
          ) {
            return this.onScanFinished()
          }
          return origOnScanError.call(this, err)
        }

        const origOnWatcherError = dwProto.onWatcherError
        dwProto.onWatcherError = function (err) {
          if (
            err &&
            (err.code === 'EINVAL' ||
              err.code === 'UNKNOWN' ||
              String(err).includes('System Volume Information'))
          ) {
            return
          }
          return origOnWatcherError.call(this, err)
        }
      } catch (_) {}
    }
  }

  return result
}
