import { Observable } from 'rxjs';
import { Dispatch, Middleware, AnyAction } from 'redux';
import { EventSource } from 'command-bus';
export interface Epic<S> {
    (ev: EventSource, state$: Observable<S>): Observable<any>;
}
export declare const createEpicMiddleware: <T>(epic: Epic<T>) => Middleware<{}, any, Dispatch<AnyAction>> & {
    replaceEpic: (nextEpic: Epic<T>) => Epic<T>;
};
