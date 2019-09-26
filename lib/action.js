const pull = require('./pull')
const storage = require('./storage')
const fs = require('fs').promises
const path = require('path')
const { execSync } = require('child_process')

const cwd = process.cwd()

const run = async () => {
  let since = parseInt(await fs.readFile(path.join(cwd, '.since')))
  console.log({since})
  const store = storage(cwd)
  let resp
  const _run = async () => {
    resp = await pull(store, since, 50)
    since = resp.since
    console.log(resp)
  }
  await _run()
  while (!resp.done) {
    await _run()
  }
  await store.save()
  await fs.writeFile(path.join(cwd, '.since'), since.toString())
  execSync('git add .since')
  execSync('git add 20*')
  execSync('git add -A')
}

module.exports = run
