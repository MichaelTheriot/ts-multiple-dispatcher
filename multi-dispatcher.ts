type TypeGuard<T> = (value: any) => value is T;
type TypeGuardArray<T extends any[]> = {
    [K in keyof T]: TypeGuard<T[K]>;
};

type Callable = (...args: any[]) => any;
type Constructable = new (...args: any[]) => any;

type FunctionParameters<T extends Function> = T extends Callable
    ? Parameters<T>
    : T extends Constructable
        ? ConstructorParameters<T>
        : never;

const testSignature = (args: unknown[], guards: TypeGuard<unknown>[], fn: Function) => {
    // test signature when there are matching number of arguments
    if (args.length === guards.length) {
        return args.every((arg, i) => guards[i](arg));
    }

    // test signature when there are variadic arguments, using last guard for all rest parameters
    if (args.length >= guards.length - 1 && guards.length === fn.length + 1) {
        // check explicit parameters
        for (let i = 0; i < fn.length; i++) {
            if (!guards[i](args[i])) {
                return false;
            }
        }

        // check rest parameters
        for (let i = fn.length; i < args.length; i++) {
            if (!guards[fn.length](args[i])) {
                return false;
            }
        }

        return true;
    }

    // arguments do not match the signature for this method
    return false;
};

export class DispatchResolver<T extends Function> {
    #defaultFn: T;
    #dispatches: [TypeGuard<unknown>[], T][] = [];

    constructor(defaultFn: T) {
        this.#defaultFn = defaultFn;
    }

    register(fn: T, ...guards: TypeGuardArray<FunctionParameters<T>>) {
        this.#dispatches.push([guards, fn]);
    }

    resolve(...args: any[]) {
        for (const [guards, fn] of this.#dispatches) {
            if (testSignature(args, guards, fn)) {
                return fn;
            }
        }

        return this.#defaultFn;
    }
}

export class FunctionDispatcher<T extends Callable> extends DispatchResolver<T> {
    dispatch(...args: any[]): ReturnType<T> {
        return (this.resolve(...args))(...args);
    }
}

export class ConstructorDispatcher<T extends Constructable> extends DispatchResolver<T> {
    construct(...args: any[]): InstanceType<T> {
        return new (this.resolve(...args))(...args);
    }
}
