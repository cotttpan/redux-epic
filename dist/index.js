"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const command_bus_1 = require("command-bus");
const defualtOptions = () => ({
    busInstance: new command_bus_1.CommandBus(),
});
exports.createEpicMiddleware = (epic$, opts) => api => {
    const { busInstance } = Object.assign({}, defualtOptions(), opts);
    const actionSource$ = new rxjs_1.Subject();
    const stateSource$ = new rxjs_1.BehaviorSubject(api.getState());
    const action$ = busInstance;
    const state$ = stateSource$.pipe(operators_1.observeOn(rxjs_1.queueScheduler));
    const store = { getState: api.getState, state$ };
    actionSource$.pipe(operators_1.observeOn(rxjs_1.queueScheduler), operators_1.subscribeOn(rxjs_1.queueScheduler)).subscribe(command => action$.dispatch(command));
    epic$.pipe(operators_1.switchMap(epic => ensureCommand(epic(action$, store))), operators_1.observeOn(rxjs_1.queueScheduler), operators_1.subscribeOn(rxjs_1.queueScheduler)).subscribe(api.dispatch);
    return next => action => {
        const result = next(action);
        stateSource$.next(api.getState());
        actionSource$.next(result);
        return result;
    };
};
//
// ─── UTILS ──────────────────────────────────────────────────────────────────────
//
const ensureCommand = operators_1.filter(command_bus_1.isCommand);
exports.combineEpic = (...epics) => {
    return (action$, store) => {
        const observables = epics.map(ep => ep(action$, store));
        return rxjs_1.merge(...observables);
    };
};
//# sourceMappingURL=index.js.map