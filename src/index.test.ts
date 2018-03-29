import { Observable } from 'rxjs/Observable'
import { merge } from 'rxjs/observable/merge'
import { map, mapTo, tap, withLatestFrom } from 'rxjs/operators'
import { create, select, EventSource } from 'command-bus'
import { createStore, MiddlewareAPI, applyMiddleware } from 'redux'
import { createEpicMiddleware } from './index'
import { values } from '@cotto/utils.ts'

interface Log {
  state: any
  action: any
}

const createHistoryMiddleware = (container: Set<Log>) => {
  return (store: MiddlewareAPI<any>) => (next: any) => (action: any) => {
    const result = next(action)
    container.add({ action, state: store.getState() })
    return result
  }
}

const ACTIONS = {
  INCREMENT: create<number>('INCREMENT'),
  RE_INCREMENT: create<number>('RE_INCREMENT'),
  DECREMENT: create<number>('DECREMENT'),
}

type S = { count: number }

const init = () => ({ count: 0 })

const reducer = (state = init(), action: any) => {
  switch (action.type) {
    case ACTIONS.INCREMENT.type:
    case ACTIONS.RE_INCREMENT.type:
      return { ...state, count: state.count + action.payload }
    case ACTIONS.DECREMENT.type:
      return { ...state, count: state.count - action.payload }
    default:
      return state
  }
}

const stateLogEpic = (container: Set<Log>) => (ev: EventSource, state$: Observable<S>) => {
  return select(ev, values(ACTIONS)).pipe(
    withLatestFrom(state$, (action, state) => ({ action, state })),
    tap(container.add.bind(container)),
    mapTo(null),
  )
}

const reIncrementEpic = (amount: number) => (ev: EventSource) => {
  return select(ev, ACTIONS.INCREMENT).pipe(
    mapTo(ACTIONS.RE_INCREMENT(amount)),
  )
}

describe('epicMiddleware', () => {
  test('emit next action', () => {
    const history = new Set()
    const epicMiddleware = createEpicMiddleware(reIncrementEpic(1))
    const historyMiddleware = createHistoryMiddleware(history)
    const store = createStore(reducer, applyMiddleware(epicMiddleware, historyMiddleware))

    store.dispatch(ACTIONS.INCREMENT(1))
    store.dispatch(ACTIONS.DECREMENT(1))

    expect(Array.from(history)).toEqual([
      { action: ACTIONS.INCREMENT(1), state: { count: 1 } },
      { action: ACTIONS.RE_INCREMENT(1), state: { count: 2 } },
      { action: ACTIONS.DECREMENT(1), state: { count: 1 } },
    ])
  })

  test('state$ in epic', () => {
    const history = new Set()
    const epicMiddleware = createEpicMiddleware(stateLogEpic(history))
    const store = createStore(reducer, applyMiddleware(epicMiddleware))

    store.dispatch(ACTIONS.INCREMENT(1))
    store.dispatch(ACTIONS.DECREMENT(1))

    expect(Array.from(history)).toEqual([
      { action: ACTIONS.INCREMENT(1), state: { count: 1 } },
      { action: ACTIONS.DECREMENT(1), state: { count: 0 } },
    ])
  })
})

test('replaceEpic', () => {
  const history = new Set()

  const firstEpic = reIncrementEpic(1)
  const secondEpic = reIncrementEpic(10)
  const epicMiddleware = createEpicMiddleware(firstEpic)
  const historyMiddleware = createHistoryMiddleware(history)
  const store = createStore(reducer, applyMiddleware(epicMiddleware, historyMiddleware))

  store.dispatch(ACTIONS.INCREMENT(1))

  expect(Array.from(history)).toEqual([
    { action: ACTIONS.INCREMENT(1), state: { count: 1 } },
    { action: ACTIONS.RE_INCREMENT(1), state: { count: 2 } },
  ])

  /* clear history */
  history.clear()
  /* replace */
  epicMiddleware.replaceEpic(secondEpic)
  store.dispatch(ACTIONS.INCREMENT(1))
  expect(Array.from(history)).toEqual([
    { action: ACTIONS.INCREMENT(1), state: { count: 3 } },
    { action: ACTIONS.RE_INCREMENT(10), state: { count: 13 } },
  ])
})
