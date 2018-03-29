import { MiddlewareAPI, Dispatch, Middleware } from 'redux'
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

  const middleware: Middleware = <S = T>(api: MiddlewareAPI<S>) => {
    const command$ = epic$.pipe(
      tap(() => {
        state$ && state$.complete()
        state$ = new BehaviorSubject(api.getState() as any)
        return state$
      }),
      switchMap((ep: Epic<T>) => ep(dispatcher, state$)),
      filter(isCommand),
    )

    return (next: Dispatch<S>) => {
      /* boot epic */
      command$.subscribe(api.dispatch)
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
