import * as nconf from 'nconf'
import { Light, Task } from './types'

nconf.use('file', { file: './config.json' })
nconf.load()

export const lights: Map<string, Light> = JSON.parse(
  JSON.stringify(nconf.get('lights'))
)
export const tasks: Map<string, Task> = JSON.parse(
  JSON.stringify(nconf.get('tasks'))
)

export const comport: number = nconf.get('ComPort')
export const port: number = nconf.get('WebPort')

let nextAvailableId: number = nconf.get('nextAvailableId') || 1

function load() {
  nconf.load()
}

export function addLight(light: Light) {
  const id = nextAvailableId++
  const resultLight = { ...light, id }
  nconf.set(`lights:${id}`, resultLight)
  console.log(`Saved light '${light.name}'`)
  save()
  return resultLight
}

export function updateLight(light: Light) {
  const saneLight = { ...light, state: false }
  return addLight(saneLight)
}

export function removeLight(id: number) {
  nconf.set(`lights:${id}`, undefined)
  console.log(`Removed light ${id}`)
  return save()
}

// id: {
//   cron: "cron string",
//   lights: [{ id: 1337, value: true}, { id: 1338, value: 14}]
// }
// value is one of number, "ON", "OFF", "TOGGLE"

export function addTask(task) {
  const id = nextAvailableId++
  const resultLight = { ...task, id }
  nconf.set(`tasks:${id}`, { ...task, id })
  console.log(`Saved task: ${task.cron}`)
  save()
  return resultLight
}

export function removeTask(id) {
  nconf.set(`tasks:${id}`, undefined)
  console.log(`removed task id: ${id}`)
  return save()
}

export function updateTask(task) {
  return addTask(task)
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
