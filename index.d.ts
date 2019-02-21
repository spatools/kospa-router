import * as ko from "knockout";
import * as composer from "@kospa/base/composer";
import * as activator from "@kospa/base/activator";
export interface Options {
    mode?: string;
    root?: string;
    onError?: (err: any) => any;
}
export interface Route {
    matcher?: RegExp | null;
    handlers: RouteHandler[];
}
export interface Routes {
    [key: string]: Route;
    none: Route;
}
export declare type RouteHandler = (...args: any[]) => any;
export declare class BaseRouter {
    private static skip;
    private _current?;
    private timeout?;
    private _onError?;
    private rootRegExp?;
    private routes;
    mode: string;
    root: string;
    constructor(options?: Options);
    use(...handlers: RouteHandler[]): BaseRouter;
    use(path: string | RegExp, ...handlers: RouteHandler[]): BaseRouter;
    unuse(...handlers: RouteHandler[]): BaseRouter;
    unuse(path: string | RegExp, ...handlers: RouteHandler[]): BaseRouter;
    add(path: string | RegExp, ...handlers: RouteHandler[]): BaseRouter;
    remove(path: string | RegExp, ...handlers: RouteHandler[]): BaseRouter;
    none(...handlers: RouteHandler[]): BaseRouter;
    start(): BaseRouter;
    stop(): BaseRouter;
    clear(): BaseRouter;
    navigate(): BaseRouter;
    navigate(path: string): BaseRouter;
    replace(): BaseRouter;
    replace(path: string): BaseRouter;
    replace(path: string, skipHandling: boolean): BaseRouter;
    handle(fragment?: string | null): Promise<BaseRouter>;
    getFragment(): string | null;
    protected onError(err: any): any;
}
export interface ViewModelRoute extends composer.CompositionOptions {
    path: string | RegExp;
    href?: ko.MaybeSubscribable<string | null | undefined>;
    title?: ko.MaybeSubscribable<string | null | undefined>;
    visible?: ko.MaybeSubscribable<boolean | null | undefined>;
    handler?: RouteHandler;
}
export declare class Router extends BaseRouter {
    private routeHandlers;
    currentRoute: ko.Observable<ViewModelRoute | null>;
    currentViewModel: activator.ActivateObservable<activator.ViewModel | null>;
    isNavigating: ko.Observable<boolean>;
    navigation: ko.PureComputed<ViewModelRoute[]>;
    constructor(options?: Options);
    route(config: ViewModelRoute): Router;
    deroute(config: ViewModelRoute): Router;
    notFound(config: ViewModelRoute): Router;
    child(path: string, childRouter?: Router): Router;
    clear(): Router;
    handle(fragment?: string): Promise<Router>;
}
declare const rootRouter: Router;
export default rootRouter;
