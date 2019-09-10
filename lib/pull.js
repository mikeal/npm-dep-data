const bent = require('bent')
const qs = require('querystring')
const storage = require('storage')
const { maxSatisfying } = require('semver')

const get = bent('https://skimdb.npmjs.com/_changes?', 'json')

const db = new Map()

const unique = a => Array.from(new Set(a))

const set = (name, owners, deps, devdeps, created, last) => {
  db.set(name, [unique(owners), unique(deps), unique(devdeps), created, last])
}

const latest = doc => {
  if (!doc.time) return null
  let version
  if (doc['dist-tags'] && doc['dist-tags'].latest) {
    version = doc['dist-tags'].latest
  } else {
    version = maxSatisfying(Object.keys(doc.versions), '*')
  }
  const release = doc.versions[version]
  if (!release) return null
  release.time = (new Date(doc.time[release.version])).getTime()
  return release
}

const process = async resp => {
  const docs = resp.results.map(r => r.doc)
  for (const doc of docs) {
    const release = latest(doc)
    if (!release) continue

    const owners = doc.maintainers.map(m => m.name).filter(x => x)
    const deps = release.dependencies ? Object.keys(release.dependencies) : []
    const devdeps = release.devDependencies ? Object.keys(release.devDependencies) : []
    let created = doc.time ? doc.time.created : null
    if (created) created = (new Date(created)).getTime()
    set(doc.name, owners, deps, devdeps, created, release.time)
  }
}

const pull = async (since) => {
  const limit = 2
  const resp = await get(qs.stringify({ since, limit, include_docs: true }))
  since = resp.last_seq
  await process(resp)
  await storage.save(db)
}

module.exports = pull
