const { addNexaLight, nexaRemoteButton } = require('./nexa')
const cron = require('node-cron')

let lights = {}
//let tasks = {}

addNexaLight(lights, 1337, 'Tv', 1000, 0, [
    nexaRemoteButton(2471582, 0),
    nexaRemoteButton(2259722, 0)
])
addNexaLight(lights, 1338, 'Fönster', 1000, 1,  [
    nexaRemoteButton(2471582, 1),
    nexaRemoteButton(2259722, 1),
    nexaRemoteButton(23047482, 10) // Wall switch, right button
])
addNexaLight(lights, 1339, 'Säng', 1000, 2, [
    nexaRemoteButton(2471582, 2),
    nexaRemoteButton(2259722, 2)
])
addNexaLight(lights, 1340, 'Kontor', 1000, 3, [])
addNexaLight(lights, 1341, 'Kökslampa', 1000, 4, [
    nexaRemoteButton(23047482, 11) // Wall switch, left button
])

exports.lights = lights
//exports.tasks = tasks