const { addNexaLight, nexaRemoteButton } = require('./nexa')
const cron = require('node-cron')

let lights = {}
//let tasks = {}

addNexaLight(lights, 'Tv', 1337, [
    nexaRemoteButton(2471582, 0),
    nexaRemoteButton(2259722, 0)
])
addNexaLight(lights, 'Fönster', 1338, [
    nexaRemoteButton(2471582, 1),
    nexaRemoteButton(2259722, 1),
    nexaRemoteButton(23047482, 10) // Wall switch, right button
])
addNexaLight(lights, 'Säng', 1339, [
    nexaRemoteButton(2471582, 2),
    nexaRemoteButton(2259722, 2)
])
addNexaLight(lights, 'Kontor', 1340, [])

exports.lights = lights
//exports.tasks = tasks