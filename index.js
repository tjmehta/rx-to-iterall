const ExposedPromise = require('exposed-promise')
const $$asyncIterator = require('iterall').$$asyncIterator

function ObservableAsyncIterator (observable) {
  // make this constructor also work as a factory method
  if (!(this instanceof ObservableAsyncIterator)) {
    return new ObservableAsyncIterator(observable)
  }
  // args
  this._observable = observable
  // state
  this._listening = true
  this._pullQueue = []
  this._pushQueue = []
  // subscribe
  this._subscriber = observable.subscribe(
    this._handleNext.bind(this),
    this._handleError.bind(this),
    this._handleComplete.bind(this)
  )
}

ObservableAsyncIterator.prototype._cleanup = function () {
  this._listening = false
  this._pullQueue = []
  this._pushQueue = []
}

ObservableAsyncIterator.prototype._handleNext = function (value) {
  if (!this._listening) return
  // console.log('NEXT', this._pullQueue.length, this._pushQueue.length)
  const result = {value: value, done: false}
  if (this._pullQueue.length) {
    this._pullQueue.shift().resolve(result)
    return
  }
  this._pushQueue.push(() => Promise.resolve(result))
}

ObservableAsyncIterator.prototype._handleError = function (err) {
  if (!this._listening) return
  if (this._pullQueue.length) {
    while (this._pullQueue.length) {
      this._pullQueue.shift().reject(err)
    }
    this._cleanup()
    return
  }
  this._pushQueue.push(() => Promise.reject(err))
}

ObservableAsyncIterator.prototype._handleComplete = function () {
  if (!this._listening) return
  // console.log('COMPLETE', this._pullQueue.length, this._pushQueue.length)
  const result = {value: undefined, done: true}
  if (this._pullQueue.length) {
    while (this._pullQueue.length) {
      this._pullQueue.shift().resolve(result)
    }
    this._cleanup()
    return
  }
  this._pushQueue.push(() => Promise.resolve(result))
}

ObservableAsyncIterator.prototype[$$asyncIterator] = function () {
  return this
}

ObservableAsyncIterator.prototype.next = function () {
  const self = this
  if (!this._listening) return Promise.resolve({ value: undefined, done: true })
  if (this._pushQueue.length) {
    return this._pushQueue.shift()()
      .catch(function (err) {
        self._cleanup()
        throw err
      })
      .then(function (result) {
        if (result.done) self._cleanup()
        return result
      })
  }
  const promise = new ExposedPromise()
  this._pullQueue.push(promise)
  return promise
}

ObservableAsyncIterator.prototype.return = function () {
  if (!this._listening) return Promise.resolve({ value: undefined, done: true })
  this._handleComplete()
  this._subscriber.unsubscribe()
}

module.exports = ObservableAsyncIterator
