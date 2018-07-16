import { BehaviorSubject, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { mapValues } from '@cotto/utils.ts';
import { isCommand, CommandBus } from 'command-bus';
const defualtOptions = () => ({
    busInstance: new CommandBus(),
    showCompletedLogs: false,
});
//
// ─── REGISTRY ───────────────────────────────────────────────────────────────────
//
export function createRegistry() {
    const registry = new Map();
    return (subscriptions) => {
        for (const [k, s] of registry.entries()) {
            s.unsubscribe();
            registry.delete(k);
        }
        mapValues(subscriptions, (s, key) => registry.set(key, s));
        return subscriptions;
    };
}
//
// ─── MIDDLEWARE FACTORY ─────────────────────────────────────────────────────────────────
//
export function createEpicMiddleware(initialEpics, opts = defualtOptions()) {
    const bus = opts.busInstance || new CommandBus();
    let state$;
    const epics$ = new Subject();
    const putSubscriptions = createRegistry();
    const middleware = (api) => (next) => {
        state$ = new BehaviorSubject(api.getState());
        epics$.pipe(map(switchNextEpic)).subscribe();
        epics$.next(initialEpics);
        return callNext;
        function bootEpic(epic, key) {
            return epic(bus, { getState: api.getState, state$ })
                .pipe(filter(isCommand))
                .subscribe({
                next: api.dispatch,
                error: err => console.error(`[redux-epic]: error at epics.${key}`, err),
                complete: () => opts.showCompletedLogs && console.info(`[redux-epic]: epics.${key} is completed`),
            });
        }
        function switchNextEpic(epics) {
            return putSubscriptions(mapValues(epics, bootEpic));
        }
        function callNext(action) {
            const result = next(action);
            state$.next(api.getState());
            return isCommand(result) ? bus.dispatch(result) : result;
        }
    };
    const replaceEpics = (epics) => {
        epics$.next(epics);
        return epics;
    };
    return Object.assign(middleware, { replaceEpics });
}
//# sourceMappingURL=index.js.map