const _ = require('lodash')

const asistantMapType = []
let id = 0;

function constructContext(obj, context) {
    for (const key in obj) {
        const value = obj[key];
        if (typeof value.affect !== 'undefined') {
            // console.log(key)
            context[key] = value.default_value;
        }
        if (value.children) {
            constructContext(value.children, context)
        }
    }
}

function flatMap(obj, asistantMap, parentObj, parentKey) {
    for (const key in obj) {
        const value = obj[key];
        if (typeof value.affect !== 'undefined') {
            // console.log(key)
            asistantMap.set(key, {
                id: id++,
                parent: parentKey,
                path: parentKey ? `${parentKey}.children.${key}` : `${key}`,
                affect: _.cloneDeep(value.affect)
            })
        }
        if (value.children) {
            flatMap(value.children, asistantMap, value, asistantMap.get(key).path)
        }
    }
}

function resolveDefinition(definition, definitionType, params = []) {
    // 判断父节点，更新deifnition中的值
    let asistantMap;
    if (asistantMapType[definitionType]) {
        asistantMap = asistantMapType[definitionType];
    } else {
        asistantMap = new Map()
        id = 0
        flatMap(definition.overrides, asistantMap)
        asistantMapType[definitionType] = asistantMap;
    }
    // console.log(asistantMap)

    const modifiedParams = []
    params.forEach(param => {
        const [key] = param;
        const id = asistantMap.get(key).id
        modifiedParams[id] = param
    })


    const context = {}
    
    if (modifiedParams.length > 0) {
        // 检测父子关系是否依旧匹配
    } else {
        // console.log(context)
        constructContext(definition.overrides, context)
        resolveAffect(asistantMap, definition, context)

        constructContext(definition.overrides, context)
        resolveDefaultValue(asistantMap, definition, context)

        constructContext(definition.overrides, context)
        resolveMinMax(asistantMap, definition, context)
    }
    // 生成map平展开属性
    // 按序查询params中的父子属性，并调整顺序，优先父属性
    // 按序修改params中的值并计算依赖
    // 目前只存在两种关系：1.单向或单向传递（一对一、一对多） 2.互相（环），判断值相同后即可停止循环计算
}

function resolveAffect(asistantMap, definition, context) {
    for (const [key, value] of asistantMap) {
        // 先计算affect，然后计算default_value的计算值，最后min/max
        if (value.affect) {
            for (const keyName in value.affect) {
                const calcValue = eval(`
                (function calcAffects() {
                    with(context) {
                        return (${value.affect[keyName]})
                    }
                })()
                `);
                // console.log(asistantMap.get(keyName).path, calcValue)
                if (typeof calcValue !== 'undefined') {
                    // console.log
                    (eval(`
                        (definition.overrides.${asistantMap.get(keyName).path}.default_value = ${calcValue})
                    `));
                }
            }
        }
    }
}

function resolveDefaultValue(asistantMap, definition, context) {
    for (const [key, value] of Object.entries(context)) {
        if (typeof value === 'string') {
            let calcValue
            try {
                calcValue = eval(`
                    (function calcAffects() {
                        with(context) {
                            return (${value})
                        }
                    })()
                `);
            } catch (e) {
                // console.log(e)
            }
            // console.log(value, calcValue, context)
            // console.log(asistantMap.get(keyName).path, calcValue)
            if (typeof calcValue !== 'undefined') {
                // console.log
                (eval(`
                    (definition.overrides.${asistantMap.get(key).path}.default_value = ${calcValue})
                `));
            }
        }
    }
}

function resolveMinMax(asistantMap, definition, context) {
    console.log(context)
    for (const [key, value] of asistantMap) {
        try {
            const calcMinValue = eval(`
            (function calcAffects() {
                with(context) {
                    return eval(definition.overrides.${asistantMap.get(key).path}.minimum_value)
                }
            })()
            `);
            const calcMaxValue = eval(`
            (function calcAffects() {
                with(context) {
                    return eval(definition.overrides.${asistantMap.get(key).path}.maximum_value)
                }
            })()
            `);
            console.log(calcMinValue, calcMaxValue)
            if (typeof calcMinValue !== 'undefined' && typeof calcMaxValue !== 'undefined') {
                let calcDefaultValue = context[key];
                if (calcDefaultValue < calcMinValue) {
                    // console.log('<-', key, calcDefaultValue, calcMinValue)
                    calcDefaultValue = calcMinValue
                }
                if (calcDefaultValue > calcMaxValue) {
                    // console.log('->', key, calcDefaultValue, calcMaxValue)
                    calcDefaultValue = calcMaxValue
                }
                (eval(`
                    (definition.overrides.${asistantMap.get(key).path}.default_value = ${calcDefaultValue})
                `));
            }
        } catch (e) {
            console.log(e.message)
        }
    }
}

module.exports = {
    resolveDefinition
}