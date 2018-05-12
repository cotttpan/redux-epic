import { BehaviorSubject, Subject } from 'rxjs';
import { filter, switchMap, tap } from 'rxjs/operators';
import { createCommandBus, isCommand } from 'command-bus';
export const createEpicMiddleware = (epic) => {
    const bus = createCommandBus();
    const epic$ = new Subject();
    let state$;
    const replaceEpic = (nextEpic) => {
        epic$.next(nextEpic);
        return nextEpic;
    };
    const replaceStateSubject = (api) => () => {
        state$ && state$.complete();
        state$ = new BehaviorSubject(api.getState());
    };
    const middleware = (api) => {
        const command$ = epic$.pipe(tap(replaceStateSubject(api)), switchMap((ep) => ep(bus, { state$, getState: api.getState })), filter(isCommand));
        return (next) => {
            /* boot epic */
            command$.subscribe(command => api.dispatch(command));
            /* initial epic */
            epic$.next(epic);
            return (action) => {
                const result = next(action);
                state$.next(api.getState());
                isCommand(result) && bus.dispatch(result);
                return result;
            };
        };
    };
    return Object.assign(middleware, { replaceEpic });
};
//# sourceMappingURL=index.js.map