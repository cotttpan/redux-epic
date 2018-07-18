import { Observable, BehaviorSubject, merge, queueScheduler, Subject } from 'rxjs'
import { filter, switchMap, observeOn, subscribeOn } from 'rxjs/operators'
import { Middleware } from 'redux'
import { isCommand, CommandBus, Command } from 'command-bus'

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

export type DefaultOpts<T = EpicMiddlewareOptions> = {
  [P in keyof T]-?: T[P]
}

const defualtOptions = (): DefaultOpts => ({
  busInstance: new CommandBus(),
})

export const createEpicMiddleware = <T>(
  epic$: Observable<Epic<T>>,
  opts?: EpicMiddlewareOptions,
): Middleware<T> => api => {
  const { busInstance } = { ...defualtOptions(), ...opts }
  const action$ = new Subject<any>()
  const state$ = new BehaviorSubject(api.getState())
  const store = {
    getState: api.getState,
    state$: state$.pipe(observeOn(queueScheduler)),
  }

  action$.pipe(
    observeOn(queueScheduler),
    subscribeOn(queueScheduler),
  ).subscribe(command => busInstance.dispatch(command))

  epic$.pipe(
    switchMap(epic => ensureCommand(epic(busInstance, store))),
    observeOn(queueScheduler),
    subscribeOn(queueScheduler),
  ).subscribe(api.dispatch)

  return next => action => {
    const result = next(action)
    state$.next(api.getState())
    action$.next(result)
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
