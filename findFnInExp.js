const fs = require('fs')
const content = JSON.parse(fs.readFileSync('./quality.settings.json'))
const fnSet = new Set()
const typeSet = new Set()

function checkAttr(obj, key) {
    const regexp = /(\S+)\(/ig
    let result = regexp.exec(obj[key])
    while (result) {
        console.log(result[0], regexp.lastIndex)
        fnSet.add(result[0])
        result = regexp.exec(obj[key])
    }
}

for (const [key, value] of Object.entries(content.settings)) {
    typeSet.add(value.type)
    checkAttr(value, 'enabled')
    checkAttr(value, 'value')
    checkAttr(value, 'maximum_value')
    checkAttr(value, 'minimum_value')
}

console.log(fnSet.values())
console.log(typeSet.values())
// resolveOrValue
// extruderValue -
// math.radians
// defaultExtruderPosition - 
// sum
// extruderValues
// map(abs, -