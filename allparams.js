const _ = require('lodash')

const asistantMap = new Map()
let asistantMapInitialized = false

function constructContext(obj, context) {
    for (const key in obj) {
        const value = obj[key];
        context[key] = value.default_value;
    }
}

function flatMap(obj, asistantMap) {
    for (const key of Object.keys(obj)) {
        const cloneValue = _.cloneDeep(obj[key])
        asistantMap.set(key, cloneValue);
    }
}

function resolveDefinition(definition, params = []) {
    if (!asistantMapInitialized) {
        flatMap(definition.settings, asistantMap);
        asistantMapInitialized = true;
    }
    // console.log(asistantMap)
    const modifiedParams = params;

    const context = {
        sum: _.sum,
        map: function (fn, arr) {
            return _.map(arr, fn);
        },
        math: {
            radians: function (degree) {
                return degree / 180 * Math.PI;
            }
        },
        resolveOrValue: input => context[input],
        extruderValue: (ignore, input) => context[input],
        extruderValues: input => [context[input]],
        defaultExtruderPosition: () => 0
    };
    console.log(modifiedParams)
    constructContext(definition.settings, context);
    // calc value & default_value
    for (const [key, value] of asistantMap) {
        try {
            let defaultValue;

            const calcValue = value.value && eval(`(function calcValue() {
                with (context) {
                    return ${value.value};
                }
            })()`);
            const calcMinValue = value.minimum_value && eval(`(function calcMinMax() {
                with (context) {
                    return ${value.minimum_value};
                }
            })()`);
            const calcMaxValue = value.maximum_value && eval(`(function calcMinMax() {
                with (context) {
                    return ${value.maximum_value};
                }
            })()`);
            const calcEnabled = value.enabled && eval(`(function calcEnable() {
                with (context) {
                    return ${value.enabled};
                }
            })()`);
            if (typeof calcValue !== 'undefined') {
                defaultValue = calcValue;
            }
            if (typeof calcEnabled !== 'undefined') {
                definition.settings[key].enabled = calcEnabled;
            }

            const modifiedParamItem = modifiedParams.find(item => item[0] === key);
            if (modifiedParamItem) {
                defaultValue = modifiedParamItem[1];
                context[key] = defaultValue;
                definition.settings[key].default_value = defaultValue;
                // console.log(calcMinValue, calcMaxValue, calcValue)
            }

            if (typeof calcMaxValue !== 'undefined' && defaultValue > calcMaxValue) {
                defaultValue = calcMaxValue;
                context[key] = defaultValue;
                definition.settings[key].default_value = defaultValue;
            }
            if (typeof calcMinValue !== 'undefined' && defaultValue < calcMinValue) {
                defaultValue = calcMinValue;
                context[key] = defaultValue;
                definition.settings[key].default_value = defaultValue;
            }
            if (value.type === 'float' || value.type === 'int') {
                if (Math.abs(calcValue - defaultValue) > 1e-6) {
                    definition.settings[key].mismatch = true;
                } else {
                    definition.settings[key].mismatch = false;
                }
            } else {
                if (calcValue !== defaultValue) {
                    definition.settings[key].mismatch = true;
                } else {
                    definition.settings[key].mismatch = false;
                }
            }
        } catch (e) {
            console.error(e, value.enabled);
        }
    }
}

module.exports = {
    resolveDefinition
}
