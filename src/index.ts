import { Observable, BehaviorSubject, Subject, Subscription } from 'rxjs'
import { filter, map } from 'rxjs/operators'
import { MiddlewareAPI, Dispatch, Middleware } from 'redux'
import { HashMap, mapValues } from '@cotto/utils.ts'
import { CommandSource, createCommandBus, isCommand, CommandBus } from 'command-bus'

export interface Store<S = any> {
  getState: () => S,
  state$: Observable<S>
}

export interface Epic<S> {
  (ev: CommandSource, store: Store<S>): Observable<any>
}

export type EpicMap<S> = HashMap<Epic<S>>

export interface EpicMiddlewareOptions {
  busInstance?: CommandBus
  showCompletedLogs?: boolean
}

const defualtOptions = (): EpicMiddlewareOptions => ({
  busInstance: createCommandBus(),
  showCompletedLogs: false,
})

//
// ─── REGISTRY ───────────────────────────────────────────────────────────────────
//
export function createRegistry() {
  const registry = new Map<string, Subscription>()
  return (subscriptions: HashMap<Subscription>) => {
    for (const [k, s] of registry.entries()) {
      s.unsubscribe()
      registry.delete(k)
    }
    mapValues(subscriptions, (s, key: string) => registry.set(key, s))
    return subscriptions
  }
}
//
// ─── MIDDLEWARE FACTORY ─────────────────────────────────────────────────────────────────
//
export function createEpicMiddleware<T>(initialEpics: EpicMap<T>, opts = defualtOptions()) {
  const bus = opts.busInstance || createCommandBus()
  let state$: BehaviorSubject<T>
  const epics$ = new Subject<EpicMap<T>>()
  const putSubscriptions = createRegistry()

  const middleware: Middleware = (api: MiddlewareAPI) => (next: Dispatch) => {
    state$ = new BehaviorSubject<T>(api.getState())
    epics$.pipe(map(switchNextEpic)).subscribe()
    epics$.next(initialEpics)
    return callNext

    function bootEpic(epic: Epic<T>, key: string) {
      return epic(bus, { getState: api.getState, state$ })
        .pipe(filter(isCommand))
        .subscribe({
          next: api.dispatch,
          error: err => console.error(`[redux-epic]: error at epics.${key}`, err), // tslint:disable-line
          complete: () => opts.showCompletedLogs && console.info(`[redux-epic]: epics.${key} is completed`), // tslint:disable-line
        },
      )
    }

    function switchNextEpic(epics: EpicMap<T>) {
      return putSubscriptions(mapValues(epics, bootEpic))
    }

    function callNext(action: any) {
      const result = next(action)
      state$.next(api.getState())
      return isCommand(result) ? bus.dispatch(result) : result
    }
  }

  const replaceEpics = (epics: EpicMap<T>) => {
    epics$.next(epics)
    return epics
  }

  return Object.assign(middleware, { replaceEpics })
}
