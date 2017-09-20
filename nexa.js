const addNexaLight = (lights, id, name, sender, unit, remotes = []) => {
    remotes.push(nexaRemoteButton(sender, unit))
    lights[id] = { id, name, sender, unit, proto: 'NEXA', state: false, remotes }
}

const nexaRemoteButton = (sender, unit) => {
    return { proto: 'NEXA', sender, unit }
}

exports.addNexaLight = addNexaLight
exports.nexaRemoteButton = nexaRemoteButton