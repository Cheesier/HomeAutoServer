const createAnslutaLight = name => {
  return { name, proto: 'ANSLUTA', dimmer: true, state: false }
}

exports.createAnslutaLight = createAnslutaLight
