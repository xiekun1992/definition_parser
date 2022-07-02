const fs = require('fs')
const https = require('https')
const { exit } = require('process')
const content = JSON.parse(fs.readFileSync('./quality.settings.json'))
const startKey = fs.readFileSync('./start.txt').toString()
console.log('startKey', startKey)
exit(0)

function py2js(pystr) {
    const options = {
        hostname: 'api.extendsclass.com',
        port: 443,
        path: '/convert/python/es6',
        method: 'POST'
    };
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            // console.log('statusCode:', res.statusCode);
            // console.log('headers:', res.headers);
            let body = Buffer.alloc(0)
            res.on('data', (d) => {
                body = Buffer.concat([body, d])
            });
            res.once('end', () => {
                resolve(body.toString())
            })
        });
        
        req.on('error', (e) => {
            console.error(e);
            reject(e)
        });
        req.write(pystr.toString())
        req.end();
    })
}
async function parseAttr(obj, key) {
    if (obj[key]) {
        // console.log(value)
        const result = await py2js(obj[key])
        console.log('response', result)
        const jsexp = JSON.parse(result).stdout.replace(';\\n', '')
        console.log('before', obj[key], '--after', jsexp)
        obj[key] = jsexp
        fs.writeFileSync('./quality.settings.json', JSON.stringify(content, null, 4))
    }
}
(async function() {
    let start = false
    for (const [key, value] of Object.entries(content.settings)) {
        // if (value.enabled) {
        //     // console.log(value)
        //     const result = await py2js(value.enabled)
        //     const jsexp = JSON.parse(result).stdout.replace('\\n', '')
        //     value.enabled = jsexp
        //     break
        // }
        if (key === startKey || !startKey) {
            fs.writeFileSync('./start.txt', startKey)
            start = true
        }
        if (start) {
            await parseAttr(value, 'enabled')
            await parseAttr(value, 'value')
            await parseAttr(value, 'maximum_value')
            await parseAttr(value, 'minimum_value')
        }
        // value.value
        // value.maximum_value
        // value.minimum_value
    }
    console.log('final', content.settings)
    fs.writeFileSync('./quality.settings.json', JSON.stringify(content, null, 4))
})()