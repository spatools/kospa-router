var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "knockout", "@kospa/base/composer", "@kospa/base/system", "@kospa/base/activator"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ko = require("knockout");
    var composer = require("@kospa/base/composer");
    var system = require("@kospa/base/system");
    var activator = require("@kospa/base/activator");
    //#region BaseRouter Class
    var hasHistory = !!history.pushState, push = Array.prototype.push, slice = Array.prototype.slice;
    var BaseRouter = /** @class */ (function () {
        function BaseRouter(options) {
            this.routes = {
                none: { matcher: null, handlers: [baseNotFound] }
            };
            this.mode = hasHistory ? "history" : "hash";
            this.root = "";
            if (options) {
                if (options.mode) {
                    this.mode = options.mode === "history" && hasHistory ? "history" : "hash";
                }
                var root = normalizeRoute(options.root);
                if (root) {
                    this.root = root + "/";
                    this.rootRegExp = new RegExp("^" + this.root + "?");
                }
                if (options.onError) {
                    this._onError = options.onError;
                }
            }
        }
        BaseRouter.prototype.use = function () {
            var config = createRouteConfig(arguments), routeId = config.matcher.toString(), route = this.routes[routeId];
            if (route) {
                push.apply(route.handlers, config.handlers);
            }
            else {
                this.routes[routeId] = config;
            }
            return this;
        };
        BaseRouter.prototype.unuse = function () {
            var config = createRouteConfig(arguments), routeId = config.matcher.toString(), route = this.routes[routeId];
            if (route) {
                var handler = void 0, index = void 0;
                while (handler = config.handlers.pop()) {
                    index = route.handlers.indexOf(handler);
                    if (index !== -1) {
                        route.handlers.splice(index, 1);
                    }
                }
                if (route.handlers.length === 0) {
                    delete this.routes[routeId];
                }
            }
            return this;
        };
        BaseRouter.prototype.add = function (path) {
            var handlers = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                handlers[_i - 1] = arguments[_i];
            }
            var routeRegExp = typeof path === "string" ? createRouteRegExp(path) : path;
            return this.use.apply(this, [routeRegExp].concat(handlers));
        };
        BaseRouter.prototype.remove = function (path) {
            var handlers = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                handlers[_i - 1] = arguments[_i];
            }
            var routeRegExp = typeof path === "string" ? createRouteRegExp(path) : path;
            return this.unuse.apply(this, [routeRegExp].concat(handlers));
        };
        BaseRouter.prototype.none = function () {
            var handlers = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                handlers[_i] = arguments[_i];
            }
            var route = this.routes.none;
            if (route.handlers[0] === baseNotFound) {
                route.handlers = handlers;
            }
            else {
                push.apply(route.handlers, handlers);
            }
            return this;
        };
        BaseRouter.prototype.start = function () {
            var current = null, self = this;
            this.stop();
            delay();
            function delay() {
                self.timeout = setTimeout(handle, 50);
            }
            function handle() {
                if (BaseRouter.skip) {
                    BaseRouter.skip = false;
                    current = self._current;
                    return delay();
                }
                var f = self.getFragment();
                if (current !== f) {
                    current = f;
                    self.handle(f).then(delay, delay);
                }
                else {
                    delay();
                }
            }
            return this;
        };
        BaseRouter.prototype.stop = function () {
            clearInterval(this.timeout);
            return this;
        };
        BaseRouter.prototype.clear = function () {
            this.stop();
            this.routes = {
                none: { matcher: null, handlers: [baseNotFound] }
            };
            this.mode = "hash";
            this.root = "";
            return this;
        };
        BaseRouter.prototype.navigate = function (path) {
            path = this.root + normalizeRoute(path);
            BaseRouter.skip = false;
            if (hasHistory) {
                history.pushState(null, null, this.mode === "history" ? path : "#" + path);
            }
            else {
                location.hash = "#" + path;
            }
            return this;
        };
        BaseRouter.prototype.replace = function (path, skipHandling) {
            path = this.root + normalizeRoute(path);
            BaseRouter.skip = skipHandling || false;
            if (hasHistory) {
                history.replaceState(null, null, this.mode === "history" ? path : "#" + path);
            }
            else {
                location.hash = "#" + path;
            }
            return this;
        };
        BaseRouter.prototype.handle = function (fragment) {
            var _this = this;
            if (fragment === void 0) { fragment = this.getFragment(); }
            if (fragment === null) {
                return Promise.resolve(this);
            }
            var handlers = [];
            Object.keys(this.routes).forEach(function (routeId) {
                var route = _this.routes[routeId];
                if (!route.matcher)
                    return;
                var match = fragment.match(route.matcher);
                if (match) {
                    handlers.push(executeHandlers.bind(_this, _this.routes[routeId].handlers, slice.call(match, 1)));
                }
            });
            if (handlers.length === 0) {
                handlers = this.routes.none.handlers;
            }
            return executeHandlers(handlers)
                .catch(this.onError.bind(this))
                .then(function () {
                _this._current = fragment;
                return _this;
            });
        };
        BaseRouter.prototype.getFragment = function () {
            var fragment = this.mode === "history" ? location.pathname : location.hash;
            fragment = normalizeRoute(fragment);
            if (this.root === "") {
                return fragment;
            }
            if (this.rootRegExp && this.rootRegExp.test(fragment)) {
                return fragment.replace(this.rootRegExp, "");
            }
            return null;
        };
        BaseRouter.prototype.onError = function (err) {
            console.log("err", err);
            var onErr = this._onError || baseOnError;
            return onErr.call(this, err);
        };
        BaseRouter.skip = false;
        return BaseRouter;
    }());
    exports.BaseRouter = BaseRouter;
    //#region Private Methods
    function createRouteConfig(args) {
        var i = 0, arg = args[0], routeRegExp;
        if (typeof arg === "function") {
            routeRegExp = /(.*)/;
        }
        else {
            routeRegExp = typeof arg === "string" ? createRouteRegExp(arg + "(*)") : arg;
            i = 1;
        }
        return {
            matcher: routeRegExp,
            handlers: slice.call(args, i)
        };
    }
    function normalizeRoute(path) {
        return String(path || "")
            .replace(/^#/, "")
            .replace(/\/$/, "")
            .replace(/^\//, "");
    }
    function createRouteRegExp(route) {
        route = normalizeRoute(route)
            .replace(/\*/g, function () { return ".*"; })
            .replace(/\?/g, function () { return "\\?"; })
            .replace(/\(([^\)]+)\)/g, function (_, t1) {
            t1 = t1.replace(/:[a-zA-Z0-9]+/g, function () { return "([^\\/\\(\\)\\?]+?)"; });
            return "(?:" + t1 + ")?";
        })
            .replace(/:[a-zA-Z0-9]+/g, function () { return "([^\\/\\(\\)\\?]+?)"; });
        return new RegExp("^" + route + "$");
    }
    function executeHandlers(handlers, args) {
        if (args === void 0) { args = []; }
        var p = Promise.resolve(), i = 0, len = handlers.length;
        for (; i < len; i++) {
            p = p.then(executeHandler.bind(null, handlers[i], args));
        }
        return p;
    }
    function executeHandler(handler, args) {
        return handler.apply(null, args);
    }
    function baseNotFound() {
        throw new Error("Not Found");
    }
    function baseOnError(err) {
        system.error("router>", err);
        if (this._current) {
            this.replace(this._current, true);
        }
        throw err;
    }
    var Router = /** @class */ (function (_super) {
        __extends(Router, _super);
        function Router(options) {
            var _this = _super.call(this, options) || this;
            _this.routeHandlers = {};
            _this.currentRoute = ko.observable();
            _this.currentViewModel = activator.createActivateObservable();
            _this.isNavigating = ko.observable(false);
            _this.navigation = ko.pureComputed(function () {
                return Object.keys(_this.routeHandlers)
                    .map(function (key) { return _this.routeHandlers[key]; })
                    .filter(function (config) { return ko.unwrap(config.visible); });
            });
            return _this;
        }
        Router.prototype.route = function (config) {
            var handlerId = config.path.toString(), handler = createRouteHandler(this, config);
            config.handler = handler;
            if (!config.href && typeof config.path === "string") {
                config.href = (this.mode === "hash" ? "#" : "") + this.root + config.path;
            }
            this.routeHandlers[handlerId] = config;
            this.add(config.path, handler);
            return this;
        };
        Router.prototype.deroute = function (config) {
            var handlerId = config.path.toString(), innerConfig = this.routeHandlers[handlerId];
            if (innerConfig && config.handler) {
                this.remove(innerConfig.path, config.handler);
                delete this.routeHandlers[handlerId];
            }
            return this;
        };
        Router.prototype.notFound = function (config) {
            this.none(createRouteHandler(this, config));
            return this;
        };
        Router.prototype.child = function (path, childRouter) {
            if (!childRouter) {
                childRouter = new Router({ mode: this.mode, root: path, onError: this.onError.bind(this) });
            }
            this.use(new RegExp("^" + path + "(?:/(.*))?$"), childRouter.handle.bind(childRouter));
            return childRouter;
        };
        Router.prototype.clear = function () {
            _super.prototype.clear.call(this);
            this.routeHandlers = {};
            this.currentRoute(null);
            this.currentViewModel(null);
            return this;
        };
        Router.prototype.handle = function (fragment) {
            var _this = this;
            if (fragment === null) {
                return Promise.resolve(this);
            }
            this.isNavigating(true);
            return _super.prototype.handle.call(this, fragment).then(function () {
                _this.isNavigating(false);
                return _this;
            }, function (err) {
                _this.isNavigating(false);
                throw err;
            });
        };
        return Router;
    }(BaseRouter));
    exports.Router = Router;
    var rootRouter = new Router();
    exports.default = rootRouter;
    function createRouteHandler(self, route) {
        return function () {
            var oldRoute = self.currentRoute();
            self.currentRoute(route);
            self.currentViewModel.args = slice.call(arguments);
            self.currentViewModel(route.viewmodel);
            return self.currentViewModel.then(function (vm) {
                var title = vm && vm.title ? ko.unwrap(vm.title) : ko.unwrap(route.title);
                if (title) {
                    document.title = title;
                }
            }, function (err) {
                self.currentRoute(oldRoute);
                throw err;
            });
        };
    }
    //#endregion
    //#region Router Handlers
    ko.bindingHandlers["router"] = {
        init: function (element, valueAccessor) {
            var val = valueAccessor(), router;
            if (val instanceof Router) {
                router = val;
            }
            else {
                val = typeof val === "object" ? val.router : val;
                router = val || rootRouter;
            }
            ko.computed({
                disposeWhenNodeIsRemoved: element,
                read: function () {
                    var config = router.currentRoute.peek(), vm = router.currentViewModel();
                    if (!config || !vm) {
                        return;
                    }
                    composer.compose(element, system.extend({}, config, { viewmodel: vm }))
                        .catch(system.error);
                }
            });
            return { controlsDescendantBindings: true };
        }
    };
    ko.virtualElements.allowedBindings["router"] = true;
    ko.components.register("kospa-router", { template: "<!--ko router: $data--><!--/ko-->" });
});
//#endregion
