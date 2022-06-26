const _ = require('lodash')

const asistantMapType = []
const asistantArrayType = []
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

function flatMap(obj, asistantMap, asistantArray, parentObj, parentKey) {
    for (const key in obj) {
        const value = obj[key];
        if (typeof value.affect !== 'undefined') {
            // console.log(key)
            asistantArray[id] = {
                id: id,
                parent: parentKey,
                path: parentKey ? `${parentKey}.children.${key}` : `${key}`,
                affect: _.cloneDeep(value.affect)
            }; 
            asistantMap.set(key, asistantArray[id]);
            id++;
        }
        if (value.children) {
            flatMap(value.children, asistantMap, asistantArray, value, asistantMap.get(key).path);
        }
    }
}

function resolveDefinition(definition, definitionType, params = []) {
    // 判断父节点，更新deifnition中的值
    let asistantMap, asistantArray = [];
    if (asistantMapType[definitionType] && asistantArrayType[definitionType]) {
        asistantMap = asistantMapType[definitionType];
        asistantArray = asistantArrayType[definitionType];
    } else {
        asistantMap = new Map()
        id = 0
        flatMap(definition.overrides, asistantMap, asistantArray)
        asistantMapType[definitionType] = asistantMap;
        asistantArrayType[definitionType] = asistantArray;
    }
    // console.log(asistantMap)

    const modifiedParams = [];
    // 按顺序调整待修改的配置值
    params.forEach(param => {
        const [key] = param;
        const id = asistantMap.get(key).id;
        modifiedParams.push([id, ...param]);
    });
    modifiedParams.sort((a, b) => a[0] - b[0]);
    // console.log(modifiedParams)

    const context = {}
    if (modifiedParams.length > 0) {
        // 根据传入值计算依赖值
        constructContext(definition.overrides, context)
        for (let i = 0; i < modifiedParams.length; i++) {
            const [id, pKey, pValue] = modifiedParams[i];
            // console.log(id, pKey, pValue)
            eval(`(
                definition.overrides.${asistantMap.get(pKey).path}.default_value = ${typeof pValue === 'string' ? 'pValue' : pValue}
            )`);
            context[pKey] = pValue;
            resolveAffectByDefinitionItem(asistantMap, definition, context, asistantMap.get(pKey));
        }
        // 规范最大最小值
        for (let i = 0; i < modifiedParams.length; i++) {
            const [id, pKey] = modifiedParams[i];
            resolveMinMaxByDefinitionItem(asistantMap, definition, context, asistantMap.get(pKey), pKey);
        }
        // 检测父子关系是否依旧匹配
        for (const [key, value] of asistantMap) {
            const definitionItem = value;
            for (const keyName in definitionItem.affect) {
                const calcValue = eval(`
                (function calcAffects() {
                    with(context) {
                        return (${definitionItem.affect[keyName]})
                    }
                })()
                `);
                // console.log(asistantMap.get(keyName).path, calcValue)
                switch (typeof calcValue) {
                    case 'number': {
                        // console.log(eval(`(definition.overrides.${asistantMap.get(keyName).path}.default_value)`), calcValue)
                        eval(`(
                            definition.overrides.${asistantMap.get(keyName).path}.mismatch = Math.abs(definition.overrides.${asistantMap.get(keyName).path}.default_value - ${calcValue}) > 1e-6
                        )`);
                        break;
                    }
                    case 'boolean':
                    case 'string': {
                        eval(`(
                            definition.overrides.${asistantMap.get(keyName).path}.mismatch = (definition.overrides.${asistantMap.get(keyName).path}.default_value !== ${calcValue})
                        )`);
                        break;
                    }
                }
            }
        }
    } else {
        // 直接计算当前配置文件的affect和相关计数值
        // console.log(context)
        constructContext(definition.overrides, context)
        resolveAffect(asistantMap, definition, context)

        // constructContext(definition.overrides, context)
        resolveDefaultValue(asistantMap, definition, context)

        // constructContext(definition.overrides, context)
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
        resolveAffectByDefinitionItem(asistantMap, definition, context, value);
    }
}

function resolveAffectByDefinitionItem(asistantMap, definition, context, definitionItem) {
    if (definitionItem.affect) {
        for (const keyName in definitionItem.affect) {
            const calcValue = eval(`
            (function calcAffects() {
                with(context) {
                    return (${definitionItem.affect[keyName]})
                }
            })()
            `);
            // console.log(asistantMap.get(keyName).path, calcValue)
            if (typeof calcValue !== 'undefined') {
                // console.log
                (eval(`(definition.overrides.${asistantMap.get(keyName).path}.default_value = ${calcValue})`));
                context[keyName] = calcValue;
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
                    (function calcDefaultValue() {
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
                (eval(`(definition.overrides.${asistantMap.get(key).path}.default_value = ${calcValue})`));
                context[key] = calcValue;
            }
        }
    }
}

function resolveMinMax(asistantMap, definition, context) {
    // console.log(context)
    for (const [key, value] of asistantMap) {
        resolveMinMaxByDefinitionItem(asistantMap, definition, context, value, key);
    }
}
function resolveMinMaxByDefinitionItem(asistantMap, definition, context, definitionItem, key) {
    try {
        const calcMinValue = eval(`
        (function calcMin() {
            with(context) {
                return eval(definition.overrides.${definitionItem.path}.minimum_value)
            }
        })()
        `);
        const calcMaxValue = eval(`
        (function calcMax() {
            with(context) {
                return eval(definition.overrides.${definitionItem.path}.maximum_value)
            }
        })()
        `);
        // console.log(calcMinValue, calcMaxValue)
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
            (eval(`(definition.overrides.${definitionItem.path}.default_value = ${calcDefaultValue})`));
            context[key] = calcDefaultValue;
        }
    } catch (e) {
        // 参数未找到
        console.log(e.message)
    }
}

module.exports = {
    resolveDefinition
}