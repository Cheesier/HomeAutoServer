const nconf = require('nconf')

nconf.use('file', { file: './config.json' })
nconf.load()

exports.lights = JSON.parse(JSON.stringify(nconf.get('lights')))
exports.tasks = JSON.parse(JSON.stringify(nconf.get('tasks')))

exports.comport = nconf.get('ComPort')
exports.port = nconf.get('WebPort')

let nextAvailableId = nconf.get('nextAvailableId') || 1

function load() {
  nconf.load()
}

function addLight(light) {
  const id = nextAvailableId++
  const resultLight = { ...light, id }
  nconf.set(`lights:${id}`, resultLight)
  console.log(`Saved light '${light.name}'`)
  save()
  return resultLight
}

function updateLight(light) {
  const saneLight = { ...light, state: false }
  return addLight(saneLight)
}

function removeLight(id) {
  nconf.set(`lights:${id}`, undefined)
  console.log(`Removed light ${id}`)
  return save()
}

// id: {
//   cron: "cron string",
//   lights: [{ id: 1337, value: true}, { id: 1338, value: 14}]
// }
// value is one of number, "ON", "OFF", "TOGGLE"

function addTask(task) {
  const id = nextAvailableId++
  const resultLight = { ...task, id }
  nconf.set(`tasks:${id}`, { ...task, id })
  console.log(`Saved task: ${task.cron}`)
  save()
  return resultLight
}

function removeTask(id) {
  nconf.set(`tasks:${id}`, undefined)
  console.log(`removed task id: ${id}`)
  return save()
}

function updateTask(task) {
  return addTask(task.id, task)
}

function save() {
  nconf.set('nextAvailableId', nextAvailableId)
  nconf.save(err => {
    if (err) {
      console.log('config save error:', err.message)
      return false
    }
    console.log('saved config')
    return true
  })
}

exports.load = load
exports.addLight = addLight
exports.removeLight = removeLight
exports.addTask = addTask
exports.removeTask = removeTask
exports.updateTask = updateTask
exports.save = save
