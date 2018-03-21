# rx-to-iterall [![Build Status](https://travis-ci.org/tjmehta/rx-to-iterall.svg?branch=master)](https://travis-ci.org/tjmehta/rx-to-iterall)

[![Greenkeeper badge](https://badges.greenkeeper.io/tjmehta/rx-to-iterall.svg)](https://greenkeeper.io/)
Convert rxjs Observables into iterall AsyncIterators

# Installation

```bash
npm i --save rx-to-iterall
```

# Usage
Convert an rxjs Observable into an iterall AsyncIterator
```js
const forAwaitEach = require('iterall').forAwaitEach
const Observable = require('rxjs').Observable
const rxjsToIterall = require('rx-to-iterall')

const observable = Observable.from([1, 2, 3])
const asyncIterator = rxjsToIterall(observable)

const results = []
await forAwaitEach(asyncIterator, (data) => {
  results.push(data)
})

console.log(results) // [1, 2, 3] (observable values)
```

Extend ObservableAsyncIterator with custom behavior
```js
const ObservableAsyncIterator = require('rx-to-iterall')

class FooAsyncIterator extends ObservableAsyncIterator {
  // ...
}
```

# License

MIT
