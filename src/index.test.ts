import { Observable, BehaviorSubject } from 'rxjs'
import { mapTo, tap, withLatestFrom } from 'rxjs/operators'
import { create, Command } from 'command-bus'
import { createStore, applyMiddleware } from 'redux'
import { createEpicMiddleware, Store, Epic, combineEpic, select } from './index'

interface Counter {
  count: number
}

interface Log {
  action: any
  state: Counter
}

interface State extends Counter {
  history: Log[]
}

const actions = {
  increment: create<number>('increment'),
  decrement: create<number>('decrement'),
  reIncrement: create<number>('reIncremnet'),
}

const reducer = (state: State = { count: 0, history: [] }, action: any): State => {
  if (action.type === actions.increment.type || action.type === actions.reIncrement.type) {
    const count = state.count + action.payload
    const log = { state: { count }, action }
    const history = [...state.history, log]
    return { ...state, count, history }
  }
  if (action.type === actions.decrement.type) {
    const count = state.count - action.payload
    const log = { state: { count }, action }
    const history = [...state.history, log]
    return { ...state, count, history }
  }
  return state
}

const reIncrementEpic = (amount: number) => (action$: Observable<Command>) => {
  return select(action$, actions.increment).pipe(
    mapTo(actions.reIncrement(amount)),
  )
}

test('action -> action', () => {
  expect.assertions(1)

  const epic$ = new BehaviorSubject<Epic<State>>(reIncrementEpic(1))
  const epicMiddleware = createEpicMiddleware(epic$)
  const middlewares = applyMiddleware(epicMiddleware)
  const store = createStore(reducer, middlewares)

  store.dispatch(actions.increment(1))
  store.dispatch(actions.decrement(1))

  const { history } = store.getState()
  expect(history).toEqual([
    { action: actions.increment(1), state: { count: 1 } },
    { action: actions.reIncrement(1), state: { count: 2 } },
    { action: actions.decrement(1), state: { count: 1 } },
  ])
})

test('state$ in epic', () => {
  expect.assertions(4)

  const testStateEpic = (action$: Observable<Command>, s: Store<State>) => {
    return action$.pipe(
      withLatestFrom(s.state$),
      tap(([action, state]) => {
        switch (action.type) {
          case actions.increment.type:
            expect(state.count).toBe(1)
            break
          case actions.reIncrement.type:
            expect(state.count).toBe(2)
            break
          case actions.decrement.type:
            expect(state.count).toBe(1)
            break
          default:
            break
        }
      }),
      mapTo(null),
    )
  }

  const rootEpic = combineEpic(reIncrementEpic(1), testStateEpic)
  const epic$ = new BehaviorSubject(rootEpic)
  const epicMiddleware = createEpicMiddleware(epic$)
  const middlewares = applyMiddleware(epicMiddleware)
  const store = createStore(reducer, middlewares)

  store.dispatch(actions.increment(1))
  store.dispatch(actions.decrement(1))

  const { history } = store.getState()

  expect(history).toEqual([
    { action: actions.increment(1), state: { count: 1 } },
    { action: actions.reIncrement(1), state: { count: 2 } },
    { action: actions.decrement(1), state: { count: 1 } },
  ])
})

test('epic replacement', () => {
  const epic$ = new BehaviorSubject(reIncrementEpic(1))
  const epicMiddleware = createEpicMiddleware(epic$)
  const middlewares = applyMiddleware(epicMiddleware)
  const store = createStore(reducer, middlewares)

  store.dispatch(actions.increment(1))
  /* replace */
  epic$.next(reIncrementEpic(10))
  store.dispatch(actions.increment(1))

  const { history } = store.getState()
  expect(history).toEqual([
    { action: actions.increment(1), state: { count: 1 } },
    { action: actions.reIncrement(1), state: { count: 2 } },
    { action: actions.increment(1), state: { count: 3 } },
    { action: actions.reIncrement(10), state: { count: 13 } },
  ])
})
