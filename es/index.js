import { BehaviorSubject, merge, queueScheduler, Subject } from 'rxjs';
import { filter, switchMap, observeOn, subscribeOn } from 'rxjs/operators';
import { select, isCommand, CommandBus } from 'command-bus';
const defualtOptions = () => ({
    busInstance: new CommandBus(),
});
export const createEpicMiddleware = (epic$, opts) => api => {
    const { busInstance } = Object.assign({}, defualtOptions(), opts);
    const actionSource$ = new Subject();
    const stateSource$ = new BehaviorSubject(api.getState());
    const action$ = busInstance;
    const state$ = stateSource$.pipe(observeOn(queueScheduler));
    const store = { getState: api.getState, state$ };
    actionSource$.pipe(observeOn(queueScheduler), subscribeOn(queueScheduler)).subscribe(command => action$.dispatch(command));
    epic$.pipe(switchMap(epic => ensureCommand(epic(action$, store))), observeOn(queueScheduler), subscribeOn(queueScheduler)).subscribe(api.dispatch);
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
const ensureCommand = filter(isCommand);
export const combineEpic = (...epics) => {
    return (action$, store) => {
        const observables = epics.map(ep => ep(action$, store));
        return merge(...observables);
    };
};
export { select };
//# sourceMappingURL=index.js.map