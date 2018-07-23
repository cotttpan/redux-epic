import { Observable, BehaviorSubject, merge, queueScheduler, Subject } from 'rxjs'
import { filter, switchMap, observeOn, subscribeOn } from 'rxjs/operators'
import { Middleware } from 'redux'
import { select, isCommand, CommandBus, Command } from 'command-bus'
import { NonNullableHashMap } from 'utils'

export interface Store<S = any> {
  getState: () => S,
  state$: Observable<S>
}

export interface Epic<S> {
  (action$: Observable<Command>, store: Store<S>): Observable<any>
}

export interface EpicMiddlewareOptions {
  busInstance?: CommandBus
}

const defualtOptions = (): NonNullableHashMap<EpicMiddlewareOptions> => ({
  busInstance: new CommandBus(),
})

export const createEpicMiddleware = <T>(
  epic$: Observable<Epic<T>>,
  opts?: EpicMiddlewareOptions,
): Middleware<T> => api => {
  const { busInstance } = { ...defualtOptions(), ...opts }
  const actionQueue$ = new Subject<any>()
  const state$ = new BehaviorSubject(api.getState())
  const action$ = busInstance
  const store = { getState: api.getState, state$ }

  actionQueue$.pipe(
    observeOn(queueScheduler),
    subscribeOn(queueScheduler),
  ).subscribe(command => action$.dispatch(command))

  epic$.pipe(
    switchMap(epic => ensureCommand(epic(action$, store))),
    observeOn(queueScheduler),
    subscribeOn(queueScheduler),
  ).subscribe(api.dispatch)

  return next => action => {
    const result = next(action)
    state$.next(api.getState())
    actionQueue$.next(result)
    return result
  }
}

//
// ─── UTILS ──────────────────────────────────────────────────────────────────────
//
const ensureCommand = filter(isCommand)

export const combineEpic = <T>(...epics: Epic<T>[]) => {
  return (action$: Observable<Command>, store: Store<T>) => {
    const observables = epics.map(ep => ep(action$, store))
    return merge(...observables)
  }
}

export { select }
