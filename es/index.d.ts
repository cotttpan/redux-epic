import { Observable, Subscription } from 'rxjs';
import { Dispatch, Middleware } from 'redux';
import { HashMap } from '@cotto/utils.ts';
import { CommandSource, CommandBus } from 'command-bus';
export interface Store<S = any> {
    getState: () => S;
    state$: Observable<S>;
}
export interface Epic<S> {
    (ev: CommandSource, store: Store<S>): Observable<any>;
}
export declare type EpicMap<S> = HashMap<Epic<S>>;
export interface EpicMiddlewareOptions {
    busInstance?: CommandBus;
    showCompletedLogs?: boolean;
}
export declare function createRegistry(): (subscriptions: HashMap<Subscription>) => HashMap<Subscription>;
export declare function createEpicMiddleware<T>(initialEpics: EpicMap<T>, opts?: EpicMiddlewareOptions): Middleware<{}, any, Dispatch<import("redux").AnyAction>> & {
    replaceEpics: (epics: HashMap<Epic<T>>) => HashMap<Epic<T>>;
};
