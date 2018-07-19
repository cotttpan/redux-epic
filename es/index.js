import { BehaviorSubject, merge, queueScheduler, Subject } from 'rxjs';
import { filter, switchMap, observeOn, subscribeOn } from 'rxjs/operators';
import { select, isCommand, CommandBus } from 'command-bus';
const defualtOptions = () => ({
    busInstance: new CommandBus(),
});
export const createEpicMiddleware = (epic$, opts) => api => {
    const { busInstance } = Object.assign({}, defualtOptions(), opts);
    const actionQueue$ = new Subject();
    const state$ = new BehaviorSubject(api.getState());
    const action$ = busInstance;
    const store = { getState: api.getState, state$ };
    actionQueue$.pipe(observeOn(queueScheduler), subscribeOn(queueScheduler)).subscribe(command => action$.dispatch(command));
    epic$.pipe(switchMap(epic => ensureCommand(epic(action$, store))), observeOn(queueScheduler), subscribeOn(queueScheduler)).subscribe(api.dispatch);
    return next => action => {
        const result = next(action);
        state$.next(api.getState());
        actionQueue$.next(result);
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