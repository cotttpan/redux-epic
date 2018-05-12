import { Observable, BehaviorSubject, Subject } from 'rxjs'
import { MiddlewareAPI, Dispatch, Middleware, AnyAction } from 'redux'
import { filter, switchMap, tap } from 'rxjs/operators'
import { EventSource, createCommandBus, isCommand } from 'command-bus'

export interface Store<S = any> {
  getState: () => S,
  state$: Observable<S>
}

export interface Epic<S> {
  (ev: EventSource, store: Store<S>): Observable<any>
}

export const createEpicMiddleware = <T>(epic: Epic<T>) => {
  const bus = createCommandBus()
  const epic$ = new Subject<Epic<T>>()
  let state$: BehaviorSubject<T>

  const replaceEpic = (nextEpic: Epic<T>) => {
    epic$.next(nextEpic)
    return nextEpic
  }

  const replaceStateSubject = (api: MiddlewareAPI) => () => {
    state$ && state$.complete()
    state$ = new BehaviorSubject(api.getState())
  }


  const middleware: Middleware = (api: MiddlewareAPI<Dispatch<AnyAction>, T>) => {

    const command$ = epic$.pipe(
      tap(replaceStateSubject(api)),
      switchMap((ep: Epic<T>) => ep(bus, { state$, getState: api.getState })),
      filter(isCommand),
    )

    return (next: Dispatch) => {
      /* boot epic */
      command$.subscribe(command => api.dispatch(command))
      /* initial epic */
      epic$.next(epic)

      return (action: any) => {
        const result = next(action)
        state$.next(api.getState() as any)
        isCommand(result) && bus.dispatch(result)
        return result
      }
    }
  }

  return Object.assign(middleware, { replaceEpic })
}
