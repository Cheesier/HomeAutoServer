const addNexaLight = (lights, name, id, remotes = []) => {
    lights[id] = { name, id, proto: 'NEXA', state: false, remotes }
}

const nexaRemoteButton = (remoteId, button) => {
    return { proto: 'NEXA', remoteId, button }
}

exports.addNexaLight = addNexaLight
exports.nexaRemoteButton = nexaRemoteButton