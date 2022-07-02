'use strict'

const a = {
    b: 1
}
const fn = new Function(`
with(a) {
    console.log(b)
}
`)
console.log(fn)
fn()