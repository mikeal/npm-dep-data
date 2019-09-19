const fs = require('fs').promises
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

const load = async (f, compression=true) => {
  if (!await exists(f)) return {}
  let buffer = await fs.readFile(f)
  if (compression) buffer = await decompress(buffer)
  return JSON.parse(buffer.toString())
}

const save = async (source, dest, compression=true) => {
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

class Storage {
  constructor (basedir, compression=true) {
    this.dbs = {}
    this.basedir = basedir
    this.compression = compression
  }
  path (str) {
    let [year, month, day] = str.split('-')
    let p = path.join(this.basedir, year, month, day + '.json')
    if (this.compression) p += '.br'
    return p
  }
  set (release) {
    const d = day(release.created)
    if (!this.dbs[d]) this.dbs[d] = {}
    let db = this.dbs[d]
    db[release.name + '|' + release.version] = release
  }
  async save () {
    const saves = []
    for (let [d, value] of Object.entries(this.dbs)) {
      saves.push(load(this.path(d), this.compression).then(db => {
        return save(Object.assign(db, value), this.path(d), this.compression)
      }))
    }
    await Promise.all(saves)
  }
}

module.exports = (...args) => new Storage(...args)
module.exports.load = load
module.exports.save = save

