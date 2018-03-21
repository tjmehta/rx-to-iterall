/* eslint-env jest */
const streamToObservable = require('stream-to-observable')
const forAwaitEach = require('iterall').forAwaitEach
const Minipass = require('minipass')
const timeout = require('timeout-then')

const rxjsToIterall = require('../index')

describe('rxjsToIterall', () => {
  const ctx = {}

  beforeEach(() => {
    ctx.stream = new Minipass({objectMode: true})
    ctx.observable = streamToObservable(ctx.stream)
    ctx.iterable = rxjsToIterall(ctx.observable)
  })

  it('should receive data', () => {
    // trigger events
    ctx.stream.write({ data: 'one' })
    ctx.stream.end()
    // wait for async iterable
    const onNext = jest.fn()
    return forAwaitEach(ctx.iterable, onNext).then(() => {
      // add an extra delay to make sure next is not called after complete
      return timeout(10).then(() => {
        expect(onNext).toMatchSnapshot()
      })
    })
  })

  it('should receive error', () => {
    // trigger events
    ctx.err = new Error('boom')
    ctx.stream.emit('error', ctx.err)
    // wait for async iterable
    const onNext = jest.fn()
    return forAwaitEach(ctx.iterable, onNext).then(() => {
      throw new Error('this should not happen')
    }).catch((err) => {
      // add an extra delay to make sure next is not called after complete
      return timeout(10).then(() => {
        expect(onNext).toMatchSnapshot()
        expect(ctx.err).toBe(err)
      })
    })
  })

  it('should receive complete', () => {
    // trigger events
    ctx.stream.end()
    // wait for async iterable
    const onNext = jest.fn()
    return forAwaitEach(ctx.iterable, onNext).then(() => {
      // add an extra delay to make sure next is not called after complete
      return timeout(10).then(() => {
        expect(onNext).toMatchSnapshot()
      })
    })
  })

  it('should receive multiple events', () => {
    // trigger events
    ctx.stream.write({ data: 'one' })
    ctx.stream.write({ data: 'two' })
    ctx.stream.end()
    return timeout(0).then(() => {
      ctx.stream.emit('data', { data: 'three' })
    }).then(() => {
      // wait for async iterable
      const onNext = jest.fn()
      return forAwaitEach(ctx.iterable, onNext).then(() => {
        // add an extra delay to make sure next is not called after complete
        return timeout(10).then(() => {
          expect(onNext).toMatchSnapshot()
        })
      })
    })
  })

  it('should receive multiple events and unsubscribe', () => {
    // trigger events
    ctx.stream.write({ data: 'one' })
    ctx.stream.write({ data: 'two' })
    const retPromise = ctx.iterable.return()
    ctx.stream.write({ data: 'three' })
    // wait for async iterable
    const onNext = jest.fn()
    return forAwaitEach(ctx.iterable, onNext).then(() => {
      // add an extra delay to make sure next is not called after complete
      return timeout(10).then(() => {
        expect(onNext).toMatchSnapshot()
        return retPromise.then((doneData) => {
          expect(doneData).toEqual({done: true})
        })
      })
    })
  })

  it('should receive multiple events and error', () => {
    // trigger events
    ctx.stream.write({ data: 'one' })
    ctx.stream.write({ data: 'two' })
    ctx.err = new Error('boom')
    ctx.stream.emit('error', ctx.err)
    ctx.stream.write({ data: 'three' })
    // wait for async iterable
    const onNext = jest.fn()
    return forAwaitEach(ctx.iterable, onNext).then(() => {
      throw new Error('this should not happen')
    }).catch((err) => {
      // add an extra delay to make sure next is not called after complete
      return timeout(10).then(() => {
        expect(onNext).toMatchSnapshot()
        expect(ctx.err).toBe(err)
      })
    })
  })

  describe('async error', () => {
    it('should receive multiple events and error', () => {
      // trigger events
      ctx.stream.write({ data: 'one' })
      ctx.stream.write({ data: 'two' })
      ctx.err = new Error('boom')
      ctx.stream.emit('error', ctx.err)
      return timeout(0).then(() => {
        ctx.stream.emit('data', { data: 'three' })
      }).then(() => {
        // wait for async iterable
        const onNext = jest.fn()
        return forAwaitEach(ctx.iterable, onNext).then(() => {
          throw new Error('this should not happen')
        }).catch((err) => {
          // trigger late events for coverage
          ctx.iterable._handleNext({ data: 'four' })
          ctx.iterable._handleError(ctx.err)
          ctx.iterable._handleComplete()
          // add an extra delay to make sure next is not called after complete
          return timeout(10).then(() => {
            expect(onNext).toMatchSnapshot()
            expect(ctx.err).toBe(err)
          })
        })
      })
    })
  })

  describe('pull first', () => {
    it('should receive data', () => {
      // pull from iterable
      const onNext = jest.fn()
      const iterablePromise = forAwaitEach(ctx.iterable, onNext)
      // trigger events
      ctx.stream.write({ data: 'one' })
      ctx.stream.end()
      // wait for async iterable
      return iterablePromise.then(() => {
        // add an extra delay to make sure next is not called after complete
        return timeout(10).then(() => {
          expect(onNext).toMatchSnapshot()
        })
      })
    })
  })

  describe('finished iterable', () => {
    it('should not call onNext', () => {
      const iterablePromise = forAwaitEach(ctx.iterable, () => {})
      // trigger events
      ctx.stream.end()
      return iterablePromise.then(() => {
        const onNext = jest.fn()
        return forAwaitEach(ctx.iterable, onNext).then(() => {
          // add an extra delay to make sure next is not called after complete
          return timeout(10).then(() => {
            expect(onNext).toMatchSnapshot()
            // for coverage..
            return ctx.iterable.return().then((doneData) => {
              expect(doneData).toEqual({done: true})
            })
          })
        })
      })
    })
  })
})
