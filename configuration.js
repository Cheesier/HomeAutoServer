const nconf = require('nconf')

nconf.use('file', { file: './config.json' })
nconf.load()

exports.lights = nconf.get('lights')

exports.comport = nconf.get('ComPort')
exports.port = nconf.get('WebPort')

function load() {
  nconf.load()
}

function addLight(light) {
  nconf.set(`lights:${light.id}`, light)
  console.log(`Saved light '${light.name}'`)
  return save()
}

function removeLight(id) {
  nconf.set(`lights:${id}`, undefined)
  console.log(`Removed light ${id}`)
  return save()
}

function save() {
  nconf.save( err => {
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
exports.save = save