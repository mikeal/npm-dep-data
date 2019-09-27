const { promises, createReadStream } = require('fs')
const { PassThrough } = require('stream')
const { join } = require('path')
const jsonstream = require('jsonstream2')
const brotli = require('brotli-max')
const fs = promises

const compact = async f => {
  const filename = f
  f = createReadStream(f)
  const objs = []
  const reader = f.pipe(jsonstream.parse()).pipe(new PassThrough({ objectMode: true }))
  console.log(filename)
  for await (const json of reader) {
    objs.push(json)
  }
  const o = Object.assign(...objs)
  const b = Buffer.from(JSON.stringify(o))
  await brotli(b, filename + '.br')
  await fs.unlink(filename)
}

const compactAll = async datadir => {
  for (const year of await fs.readdir(datadir)) {
    if (isNaN(parseInt(year))) continue
    for (const month of await fs.readdir(join(datadir, year))) {
      const compacts = []
      for (const day of await fs.readdir(join(datadir, year, month))) {
        if (!day.endsWith('.json')) continue
        const l = compact(join(datadir, year, month, day))
        compacts.push(l)
      }
      await Promise.all(compacts)
    }
  }
}

module.exports = compactAll
compactAll(process.cwd())
