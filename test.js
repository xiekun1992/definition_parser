const assert = require('assert')
const fs = require('fs')
const _ = require('lodash')
const path = require('path')
const { resolveDefinition } = require('./allparams')

describe('allparams', () => {
    it('given a material.def.json without params should calculate all the affects', () => {
        const definition = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'material0.pla.0614-1.def.json')))
        const definitionCopy = _.cloneDeep(definition)
        // definitionCopy.overrides.material_print_temperature.default_value = 10
        // definitionCopy.overrides.retraction_enable.children.retraction_speed.default_value = 20
        definitionCopy.overrides.cool_fan_speed.children.cool_fan_speed_max.default_value = 430
        let st = Date.now()
        resolveDefinition(definitionCopy)
        console.log((Date.now() - st) / 1000)

        st = Date.now()
        resolveDefinition(definitionCopy)
        console.log((Date.now() - st) / 1000)
        // console.log(definitionCopy)
        assert.deepEqual(definition, definitionCopy)
    })
})