type TypeGuard<T> = (value: any) => value is T;
type TypeGuardArray<T extends any[]> = {
    [K in keyof T]: TypeGuard<T[K]>;
};

const testSignature = (args: unknown[], guards: TypeGuard<unknown>[], fn: Function) => {
    // test signature when there are matching number of arguments
    if (args.length === guards.length) {
        return args.every((arg, i) => guards[i](arg));
    }

    // test signature when there are variadic arguments, using last guard for all rest parameters
    if (args.length >= guards.length - 1 && guards.length === fn.length + 1) {
        // check explict parameters
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

class MultipleDispatcher<T extends (...args: any[]) => any> {
    #defaultFn: T;
    #dispatches: [TypeGuard<unknown>[], T][] = [];

    constructor(defaultFn: T) {
        this.#defaultFn = defaultFn;
    }

    register(fn: T, ...guards: TypeGuardArray<Parameters<T>>) {
        this.#dispatches.push([guards, fn]);
    }

    dispatch(...args: Parameters<T>): ReturnType<T> {
        for (const [guards, fn] of this.#dispatches) {
            if (testSignature(args, guards, fn)) {
                return fn(...args);
            }
        }

        return this.#defaultFn(...args);
    }
}

export default MultipleDispatcher;
