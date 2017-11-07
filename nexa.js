const createNexaLight = (id, name, sender, unit, remotes = [], dimmer = false) => {
    remotes.push(nexaRemoteButton(sender, unit))
    return { id, name, sender, unit, proto: 'NEXA', dimmer, state: false, remotes }
}

const nexaRemoteButton = (sender, unit) => {
    return { proto: 'NEXA', sender, unit }
}

exports.createNexaLight = createNexaLight
exports.nexaRemoteButton = nexaRemoteButton