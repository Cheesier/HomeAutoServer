const createNexaLight = (id, name, sender, unit, remotes = []) => {
    remotes.push(nexaRemoteButton(sender, unit))
    return { id, name, sender, unit, proto: 'NEXA', state: false, remotes }
}

const nexaRemoteButton = (sender, unit) => {
    return { proto: 'NEXA', sender, unit }
}

exports.createNexaLight = createNexaLight
exports.nexaRemoteButton = nexaRemoteButton