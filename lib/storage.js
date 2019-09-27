const fs = require('fs').promises
const { execSync } = require('child_process')
const path = require('path')
const brotli = require('brotli-max')
const zlib = require('zlib')
const mkdirp = require('mkdirp-promise')
const { promisify } = require('util')
const decompress = promisify(zlib.brotliDecompress)

const exists = async f => {
  try {
    await fs.stat(f)
  } catch (e) {
    if (e.code !== 'ENOENT') throw e
    return false
  }
  return true
}

const load = async (f, compression = true) => {
  if (!await exists(f)) return {}
  const _f = f.replace(process.cwd() + '/', '')
  console.log(`git lfs pull --include "${_f}"`)
  execSync(`git lfs pull --include "${_f}"`)
  let buffer = await fs.readFile(f)
  if (compression) buffer = await decompress(buffer)
  return JSON.parse(buffer.toString())
}

const save = async (source, dest, compression = true) => {
  source = Buffer.from(JSON.stringify(source))
  await mkdirp(path.dirname(dest))
  if (compression) return brotli(source, dest)
  else return fs.writeFile(dest, source)
}

const day = ts => {
  const year = ts.getUTCFullYear()
  const month = (ts.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = ts.getUTCDate().toString().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

const oneday = 1000 * 60 * 60 * 24

class Storage {
  constructor (basedir, compression = true, cutoff = Date.now() - (oneday * 3)) {
    execSync('git lfs install')
    this.dbs = {}
    this.basedir = basedir
    this.compression = compression
    this.cutoff = cutoff
  }

  path (str) {
    const [year, month, day] = str.split('-')
    let p = path.join(this.basedir, year, month, day + '.json')
    if (this.compression) p += '.br'
    return p
  }

  set (release) {
    const c = (new Date(release.created)).getTime()
    if (c < this.cutoff) return
    const d = day(release.created)
    if (!this.dbs[d]) this.dbs[d] = {}
    const db = this.dbs[d]
    db[release.name + '|' + release.version] = release
  }

  async save () {
    const saves = []
    for (const [d, value] of Object.entries(this.dbs)) {
      saves.push(load(this.path(d), this.compression).then(db => {
        return save(Object.assign(db, value), this.path(d), this.compression)
      }))
    }
    await Promise.all(saves)
  }

  async append () {
    // this method appends a new json object to an existin uncompressed json file.
    // this is useful when processing through the backlog but needs to be compacted
    // before load will work.
    const saves = []
    for (const [d, value] of Object.entries(this.dbs)) {
      const p = this.path(d)
      saves.push(fs.appendFile(p, Buffer.from('\n' + JSON.stringify(value))))
    }
    await Promise.all(saves)
  }
}

module.exports = (...args) => new Storage(...args)
module.exports.load = load
module.exports.save = save
