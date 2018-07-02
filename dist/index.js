"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const utils_ts_1 = require("@cotto/utils.ts");
const command_bus_1 = require("command-bus");
const defualtOptions = () => ({
    busInstance: command_bus_1.createCommandBus(),
    showCompletedLogs: false,
});
//
// ─── REGISTRY ───────────────────────────────────────────────────────────────────
//
function createRegistry() {
    const registry = new Map();
    return (subscriptions) => {
        for (const [k, s] of registry.entries()) {
            s.unsubscribe();
            registry.delete(k);
        }
        utils_ts_1.mapValues(subscriptions, (s, key) => registry.set(key, s));
        return subscriptions;
    };
}
exports.createRegistry = createRegistry;
//
// ─── MIDDLEWARE FACTORY ─────────────────────────────────────────────────────────────────
//
function createEpicMiddleware(initialEpics, opts = defualtOptions()) {
    const bus = opts.busInstance || command_bus_1.createCommandBus();
    let state$;
    const epics$ = new rxjs_1.Subject();
    const putSubscriptions = createRegistry();
    const middleware = (api) => (next) => {
        state$ = new rxjs_1.BehaviorSubject(api.getState());
        epics$.pipe(operators_1.map(switchNextEpic)).subscribe();
        epics$.next(initialEpics);
        return callNext;
        function bootEpic(epic, key) {
            return epic(bus, { getState: api.getState, state$ })
                .pipe(operators_1.filter(command_bus_1.isCommand))
                .subscribe({
                next: api.dispatch,
                error: err => console.error(`[redux-epic]: error at epics.${key}`, err),
                complete: () => opts.showCompletedLogs && console.info(`[redux-epic]: epics.${key} is completed`),
            });
        }
        function switchNextEpic(epics) {
            return putSubscriptions(utils_ts_1.mapValues(epics, bootEpic));
        }
        function callNext(action) {
            const result = next(action);
            state$.next(api.getState());
            return command_bus_1.isCommand(result) ? bus.dispatch(result) : result;
        }
    };
    const replaceEpics = (epics) => {
        epics$.next(epics);
        return epics;
    };
    return Object.assign(middleware, { replaceEpics });
}
exports.createEpicMiddleware = createEpicMiddleware;
//# sourceMappingURL=index.js.map