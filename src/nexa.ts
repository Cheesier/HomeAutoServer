export const createNexaLight = (
  name,
  sender,
  unit,
  dimmer = false,
  remotes = []
) => {
  remotes.push(nexaRemoteButton(sender, unit))
  return { name, sender, unit, proto: 'NEXA', dimmer, state: false, remotes }
}

export const nexaRemoteButton = (sender, unit) => {
  return { proto: 'NEXA', sender, unit }
}
