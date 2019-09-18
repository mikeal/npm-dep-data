const pull = require('./pull')
const fs = require('fs').promises
const path = require('path')

const cwd = process.cwd()

const run = async () => {
  let since = parseInt(await fs.readFile(path.join(cwd, '.since')))
  console.log({since})
  let resp
  const _run = async () => {
    resp = await pull(cwd, since)
    since = resp.since
    await fs.writeFile(path.join(cwd, '.since'), since.toString())
    console.log(resp)
  }
  await _run()
  while (!resp.done) {
    await _run()
  }
}

module.exports = run
run()

