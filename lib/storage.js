const fs = require('fs')
const path = require('path')
const brotli = require('brotli-max')

exports.load = async f => {

}

const encode = arr => {
  let l = ''
  while (arr.length) {
    const next = arr.shift()
    if (typeof next === 'string' || typeof next === 'number' || next === null) {
      l += next
    } else if (Array.isArray(next)) {
      l += next.join('|')
    }
    if (arr.length) l += ','
    else l += '\n'
  }
  return l
}

const decode = line => {
  let s = line.split(',')
  s = s.map(x => {
    if (x === 'null') return null
    return x
  })
  let [name, owners, deps, devdeps, created, last] = s
  if (owners) owners = owners.split('|')
  if (deps) deps = deps.split('|')
  if (devdeps) devdeps = devdeps.split('|')
  if (created) created = parseInt(created)
  if (last) last = parseInt(last)
  return [name, owners, deps, devdeps, created, last]
}

exports.save = async (map, basedir) => {
  const filename = Date.now() + '.csv'
  const stream = fs.createWriteStream(path.join(basedir, filename))
  stream.write('NAME,OWNERS,DEPS,DEVDEPS,CREATED,LAST\n')
  for (const [key, value] of map.entries()) {
    console.log(decode(encode([key, ...value])))
  }
}
