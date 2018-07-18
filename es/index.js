import { BehaviorSubject, merge, queueScheduler, Subject } from 'rxjs';
import { filter, switchMap, observeOn, subscribeOn } from 'rxjs/operators';
import { isCommand, CommandBus } from 'command-bus';
const defualtOptions = () => ({
    busInstance: new CommandBus(),
});
export const createEpicMiddleware = (epic$, opts) => api => {
    const { busInstance } = Object.assign({}, defualtOptions(), opts);
    const action$ = new Subject();
    const state$ = new BehaviorSubject(api.getState());
    const store = {
        getState: api.getState,
        state$: state$.pipe(observeOn(queueScheduler)),
    };
    action$.pipe(observeOn(queueScheduler), subscribeOn(queueScheduler)).subscribe(command => busInstance.dispatch(command));
    epic$.pipe(switchMap(epic => ensureCommand(epic(busInstance, store))), observeOn(queueScheduler), subscribeOn(queueScheduler)).subscribe(api.dispatch);
    return next => action => {
        const result = next(action);
        state$.next(api.getState());
        action$.next(result);
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
//# sourceMappingURL=index.js.map