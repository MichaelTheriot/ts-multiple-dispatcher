export type TypeGuard<T> = (value: any) => value is T;
export type TypeGuardArray<T extends any[]> = {
    [K in keyof T]: TypeGuard<T[K]>;
};

export type Callable<
  Args extends any[] = any[],
  T extends (...args: Args) => any = any
> = (...args: Args) => ReturnType<T>;

export type Constructable<
  Args extends any[] = any[],
  T extends abstract new (...args: Args) => any = any
> = abstract new (...args: Args) => InstanceType<T>;

export type FunctionParameters<T extends Function> = T extends Callable
    ? Parameters<T>
    : T extends Constructable
        ? ConstructorParameters<T>
        : never;

type DistributeTuple<T extends readonly any[]> =
    T extends [infer A, ...infer B]
        ? A extends A
            ? [A, ...DistributeTuple<B>]
            : never
        : [];
        
type Overload<T> =
    T extends Callable
        ? Exclude<DistributeTuple<Parameters<T>> extends infer U
            ? U extends any[]
                ? Callable<U, T>
                : never
            : never, T>
        : T extends Constructable
            ? Exclude<ConstructorParameters<T> extends infer U
                ? U extends any[]
                    ? Constructable<U, T>
                    : never
                : never, T>
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
    #dispatches: [TypeGuard<unknown>[], Overload<T>][] = [];

    constructor(defaultFn: T) {
        this.#defaultFn = defaultFn;
    }

    register<U extends Overload<T>>(fn: U, ...guards: TypeGuardArray<FunctionParameters<U>>) {
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

export class ConstructorDispatcher<T extends new (...args: any[]) => any> extends DispatchResolver<T> {
    construct(...args: any[]): InstanceType<T> {
        return new (this.resolve(...args))(...args);
    }
}
