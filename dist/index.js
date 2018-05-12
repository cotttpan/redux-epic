"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const command_bus_1 = require("command-bus");
exports.createEpicMiddleware = (epic) => {
    const bus = command_bus_1.createCommandBus();
    const epic$ = new rxjs_1.Subject();
    let state$;
    const replaceEpic = (nextEpic) => {
        epic$.next(nextEpic);
        return nextEpic;
    };
    const replaceStateSubject = (api) => () => {
        state$ && state$.complete();
        state$ = new rxjs_1.BehaviorSubject(api.getState());
    };
    const middleware = (api) => {
        const command$ = epic$.pipe(operators_1.tap(replaceStateSubject(api)), operators_1.switchMap((ep) => ep(bus, { state$, getState: api.getState })), operators_1.filter(command_bus_1.isCommand));
        return (next) => {
            /* boot epic */
            command$.subscribe(command => api.dispatch(command));
            /* initial epic */
            epic$.next(epic);
            return (action) => {
                const result = next(action);
                state$.next(api.getState());
                command_bus_1.isCommand(result) && bus.dispatch(result);
                return result;
            };
        };
    };
    return Object.assign(middleware, { replaceEpic });
};
//# sourceMappingURL=index.js.map