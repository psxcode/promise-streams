import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pullConsumer, pullProducer } from 'promised-streams-test/src'
import { pullMerge } from '../src'
import { makeNumbers } from './make-numbers'
import { makeStrings } from './make-strings'

const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink') as (arg: IteratorResult<number>) => void
let logIndex = 0
const producerLog = () => debug(`ai:producer${logIndex++}`)

describe('[ pullMerge ]', () => {
  it('should work', async () => {
    const data0 = makeNumbers(3)
    const data1 = makeStrings(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r0 = pullProducer({ log: producerLog() })(data0)
    const r1 = pullProducer({ log: producerLog() })(data1)
    const t = pullMerge(r0, r1)

    await w(t)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: '0', done: false }],
      [{ value: 1, done: false }],
      [{ value: '1', done: false }],
      [{ value: 2, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with single producer', async () => {
    const data0 = makeNumbers(3)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullProducer({ log: producerLog() })(data0)
    const t = pullMerge

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with no producers', async () => {
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullMerge

    await w(t())

    expect(spy.calls).deep.eq([
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle consumer delay', async () => {
    const data0 = makeNumbers(2)
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, delay: 30 })(spy)
    const r0 = pullProducer({ log: producerLog() })(data0)
    const r1 = pullProducer({ log: producerLog() })(data1)
    const t = pullMerge

    await w(t(r0, r1))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should propagate producer error to consumer', async () => {
    const data0 = makeNumbers(2)
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r0 = pullProducer({ log: producerLog(), dataResolveDelay: 5 })(data0)
    const r1 = pullProducer({ log: producerLog(), errorAtStep: 0, dataPrepareDelay: 8 })(data1)
    const t = pullMerge

    try {
      await w(t(r0, r1))
      expect.fail('should not get here')
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 0, done: false }],
      ])
    }
  })

  it('should propagate producer error to consumer and continue', async () => {
    const data0 = makeNumbers(2)
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r0 = pullProducer({ log: producerLog() })(data0)
    const r1 = pullProducer({ log: producerLog(), errorAtStep: 0 })(data1)
    const t = pullMerge

    await w(t(r0, r1))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer crash', async () => {
    const data0 = makeNumbers(2)
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r0 = pullProducer({ log: producerLog() })(data0)
    const r1 = pullProducer({ log: producerLog(), crashAtStep: 0 })(data1)
    const t = pullMerge

    try {
      await w(t(r0, r1))
      expect.fail('should not get here')
    } catch {
      expect(spy.calls).deep.eq([
      ])
    }
  })
})
