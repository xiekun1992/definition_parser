const assert = require('assert')
const fs = require('fs')
const _ = require('lodash')
const path = require('path')
const { resolveDefinition, sortParams } = require('./allparams')

describe('allparams', () => {
    let definition = {}

    beforeEach(() => {
        definition = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'quality.settings.json')))
    })

    it('given a material.def.json without params should calculate all the affects', () => {
        const definitionCopy = _.cloneDeep(definition)
        // definitionCopy.overrides.material_print_temperature.default_value = 10
        // definitionCopy.overrides.retraction_enable.children.retraction_speed.default_value = 20
        // definitionCopy.overrides.cool_fan_speed.children.cool_fan_speed_max.default_value = 430
        let st = Date.now()
        resolveDefinition(definitionCopy)
        console.log((Date.now() - st) / 1000)

        assert.deepEqual(definition, definitionCopy)
    })

    it.only('given a material.def.json with input params should calculate by params', () => {
        const definitionCopy = _.cloneDeep(definition)
        
        let st = Date.now()
        resolveDefinition(definitionCopy, [
            ['color', '#ff0000'],
            ['material_initial_print_temperature', -310],
            ['wall_0_material_flow', 20],
            ['cool_fan_speed_max', 430]
        ])
        console.log((Date.now() - st) / 1000)

        assert.deepEqual(definition, definitionCopy)
    })
})