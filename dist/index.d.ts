import { Observable } from 'rxjs';
import { Middleware } from 'redux';
import { select, CommandBus, Command } from 'command-bus';
export interface Store<S = any> {
    getState: () => S;
    state$: Observable<S>;
}
export interface Epic<S> {
    (action$: Observable<Command>, store: Store<S>): Observable<any>;
}
export interface EpicMiddlewareOptions {
    busInstance?: CommandBus;
}
export declare type DefaultOpts<T = EpicMiddlewareOptions> = {
    [P in keyof T]-?: T[P];
};
export declare const createEpicMiddleware: <T>(epic$: Observable<Epic<T>>, opts?: EpicMiddlewareOptions | undefined) => Middleware<T, any, import("redux").Dispatch<import("redux").AnyAction>>;
export declare const combineEpic: <T>(...epics: Epic<T>[]) => (action$: Observable<Command<any, import("f/dist/types").HashMap<any>>>, store: Store<T>) => Observable<any>;
export { select };
