"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BehaviorSubject_1 = require("rxjs/BehaviorSubject");
const Subject_1 = require("rxjs/Subject");
const operators_1 = require("rxjs/operators");
const command_bus_1 = require("command-bus");
const defaultEpicOptions = {
    wildcard: true,
};
exports.createEpicMiddleware = (epic, opts = defaultEpicOptions) => {
    const dispatcher = new command_bus_1.Dispatcher(opts);
    const epic$ = new Subject_1.Subject();
    let state$;
    const replaceEpic = (nextEpic) => {
        epic$.next(nextEpic);
        return nextEpic;
    };
    const replaceStateSubject = (api) => () => {
        state$ && state$.complete();
        state$ = new BehaviorSubject_1.BehaviorSubject(api.getState());
    };
    const bootEpic = (ep) => ep(dispatcher, state$);
    const middleware = (api) => {
        const command$ = epic$.pipe(operators_1.tap(replaceStateSubject(api)), operators_1.switchMap(bootEpic), operators_1.filter(command_bus_1.isCommand));
        return (next) => {
            /* boot epic */
            command$.subscribe(command => api.dispatch(command));
            /* initial epic */
            epic$.next(epic);
            return (action) => {
                const result = next(action);
                state$.next(api.getState());
                command_bus_1.isCommand(result) && dispatcher.dispatch(result);
                return result;
            };
        };
    };
    return Object.assign(middleware, { replaceEpic });
};
//# sourceMappingURL=index.js.map