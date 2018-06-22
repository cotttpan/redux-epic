import { Observable } from 'rxjs';
import { Dispatch, Middleware, AnyAction } from 'redux';
import { CommandSource, CommandBus } from 'command-bus';
export interface Store<S = any> {
    getState: () => S;
    state$: Observable<S>;
}
export interface Epic<S> {
    (ev: CommandSource, store: Store<S>): Observable<any>;
}
export interface EpicMiddlewareOptions {
    busInstance?: CommandBus;
}
export declare const createEpicMiddleware: <T>(epic: Epic<T>, options?: EpicMiddlewareOptions) => Middleware<{}, any, Dispatch<AnyAction>> & {
    replaceEpic: (nextEpic: Epic<T>) => Epic<T>;
};
