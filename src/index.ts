import { MiddlewareAPI, Dispatch, Middleware, AnyAction } from 'redux'
import { Observable } from 'rxjs/Observable'
import { BehaviorSubject } from 'rxjs/BehaviorSubject'
import { Subject } from 'rxjs/Subject'
import { filter, switchMap, tap } from 'rxjs/operators'
import { EventSource, Dispatcher, DispatcherOptions, isCommand } from 'command-bus'

export interface Epic<S> {
  (ev: EventSource, state$: Observable<S>): Observable<any>
}

export interface EpicMiddlewareOptions extends DispatcherOptions {

}

const defaultEpicOptions: EpicMiddlewareOptions = {
  wildcard: true,
}

export const createEpicMiddleware = <T>(epic: Epic<T>, opts = defaultEpicOptions) => {
  const dispatcher = new Dispatcher(opts)
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

  const bootEpic = (ep: Epic<T>) => ep(dispatcher, state$)

  const middleware: Middleware = (api: MiddlewareAPI<Dispatch<AnyAction>, T>) => {
    const command$ = epic$.pipe(
      tap(replaceStateSubject(api)),
      switchMap(bootEpic),
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
        isCommand(result) && dispatcher.dispatch(result)
        return result
      }
    }
  }

  return Object.assign(middleware, { replaceEpic })
}
