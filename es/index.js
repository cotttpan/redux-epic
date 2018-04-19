import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Subject } from 'rxjs/Subject';
import { filter, switchMap, tap } from 'rxjs/operators';
import { Dispatcher, isCommand } from 'command-bus';
const defaultEpicOptions = {
    wildcard: true,
};
export const createEpicMiddleware = (epic, opts = defaultEpicOptions) => {
    const dispatcher = new Dispatcher(opts);
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
    const bootEpic = (ep) => ep(dispatcher, state$);
    const middleware = (api) => {
        const command$ = epic$.pipe(tap(replaceStateSubject(api)), switchMap(bootEpic), filter(isCommand));
        return (next) => {
            /* boot epic */
            command$.subscribe(command => api.dispatch(command));
            /* initial epic */
            epic$.next(epic);
            return (action) => {
                const result = next(action);
                state$.next(api.getState());
                isCommand(result) && dispatcher.dispatch(result);
                return result;
            };
        };
    };
    return Object.assign(middleware, { replaceEpic });
};
//# sourceMappingURL=index.js.map