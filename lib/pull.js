const bent = require('bent')
const qs = require('querystring')
const storage = require('./storage')
const path = require('path')
const { maxSatisfying } = require('semver')

const get = bent('https://skimdb.npmjs.com/_changes?', 'json')

const db = new Map()

const unique = a => Array.from(new Set(a))

const releases = doc => {
  if (!doc.versions) return []
  return Array.from(Object.entries(doc.versions)).map(entry => {
    entry[1].version = entry[0]
    return entry[1]
  })
}

const process = function * (resp) {
  const docs = resp.results.map(r => r.doc)
  for (const doc of docs) {
    for (const release of releases(doc)) {
      const deps = release.dependencies ? Object.keys(release.dependencies) : []
      const devdeps = release.devDependencies ? Object.keys(release.devDependencies) : []
      let created = doc.time ? doc.time[release.version] : null
      if (created) created = new Date(created)
      else if (release.ctime) created = new Date(release.ctime)
      else {
        continue
      }
      let maintainers = release.maintainers || []
      if (!Array.isArray(maintainers)) maintainers = [maintainers]
      yield {
        name: doc.name,
        deps: deps,
        devdeps: devdeps,
        created: created,
        version: release.version,
        owners: maintainers.map(m => m.name).filter(x => x)
      }
    }
  }
}

const pull = async (basedir, since, compression=true, limit=50) => {
  const resp = await get(qs.stringify({ since, limit, include_docs: true }))
  const store = storage(basedir, compression)
  since = resp.last_seq
  for (let release of process(resp)) {
    store.set(release)
  }
  await store.save()
  return { since, done: resp.results.length !== limit }
}

module.exports = pull
