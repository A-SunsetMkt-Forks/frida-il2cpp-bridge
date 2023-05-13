namespace Il2Cpp {
    export abstract class AbstractTracer {
        /** @internal */
        readonly events = { depth: 0, buffer: [] as string[], history: new Set() };

        /** @internal */
        readonly targets: Il2Cpp.Method[] = [];

        /** @internal */
        #assemblies?: Il2Cpp.Assembly[];

        /** @internal */
        #classes?: Il2Cpp.Class[];

        /** @internal */
        #methods?: Il2Cpp.Method[];

        /** @internal */
        #assemblyFilter?: (assembly: Il2Cpp.Assembly) => boolean;

        /** @internal */
        #classFilter?: (klass: Il2Cpp.Class) => boolean;

        /** @internal */
        #methodFilter?: (method: Il2Cpp.Method) => boolean;

        /** @internal */
        #parameterFilter?: (parameter: Il2Cpp.Parameter) => boolean;

        /** Sets the application domain as the place where to find the target methods. */
        domain(): Il2Cpp.AbstractTracer.FilterAssemblies {
            return this;
        }

        /** Sets the passed `assemblies` as the place where to find the target methods. */
        assemblies(...assemblies: Il2Cpp.Assembly[]): Il2Cpp.AbstractTracer.FilterClasses {
            this.#assemblies = assemblies;
            return this;
        }

        /** Sets the passed `classes` as the place where to find the target methods. */
        classes(...classes: Il2Cpp.Class[]): Il2Cpp.AbstractTracer.FilterMethods {
            this.#classes = classes;
            return this;
        }

        /** Sets the passed `methods` as the target methods. */
        methods(...methods: Il2Cpp.Method[]): Il2Cpp.AbstractTracer.FilterParameters {
            this.#methods = methods;
            return this;
        }

        /** Filters the assemblies where to find the target methods. */
        filterAssemblies(filter: (assembly: Il2Cpp.Assembly) => boolean): Il2Cpp.AbstractTracer.FilterClasses {
            this.#assemblyFilter = filter;
            return this;
        }

        /** Filters the classes where to find the target methods. */
        filterClasses(filter: (klass: Il2Cpp.Class) => boolean): Il2Cpp.AbstractTracer.FilterMethods {
            this.#classFilter = filter;
            return this;
        }

        /** Filters the target methods. */
        filterMethods(filter: (method: Il2Cpp.Method) => boolean): Il2Cpp.AbstractTracer.FilterParameters {
            this.#methodFilter = filter;
            return this;
        }

        /** Filters the target methods. */
        filterParameters(filter: (parameter: Il2Cpp.Parameter) => boolean): Pick<Il2Cpp.AbstractTracer, "and"> {
            this.#parameterFilter = filter;
            return this;
        }

        /** Commits the current changes by finding the target methods. */
        and(): Il2Cpp.AbstractTracer.ChooseTargets & Pick<Il2Cpp.AbstractTracer, "attach"> {
            const filterMethod = (method: Il2Cpp.Method): void => {
                if (this.#parameterFilter == undefined) {
                    this.targets.push(method);
                    return;
                }

                for (const parameter of method.parameters) {
                    if (this.#parameterFilter(parameter)) {
                        this.targets.push(method);
                        break;
                    }
                }
            };

            const filterMethods = (values: Iterable<Il2Cpp.Method>): void => {
                for (const method of values) {
                    filterMethod(method);
                }
            };

            const filterClass = (klass: Il2Cpp.Class): void => {
                if (this.#methodFilter == undefined) {
                    filterMethods(klass.methods);
                    return;
                }

                for (const method of klass.methods) {
                    if (this.#methodFilter(method)) {
                        filterMethod(method);
                    }
                }
            };

            const filterClasses = (values: Iterable<Il2Cpp.Class>): void => {
                for (const klass of values) {
                    filterClass(klass);
                }
            };

            const filterAssembly = (assembly: Il2Cpp.Assembly): void => {
                if (this.#classFilter == undefined) {
                    filterClasses(assembly.image.classes);
                    return;
                }

                for (const klass of assembly.image.classes) {
                    if (this.#classFilter(klass)) {
                        filterClass(klass);
                    }
                }
            };

            const filterAssemblies = (assemblies: Iterable<Il2Cpp.Assembly>): void => {
                for (const assembly of assemblies) {
                    filterAssembly(assembly);
                }
            };

            const filterDomain = (domain: Il2Cpp.Domain): void => {
                if (this.#assemblyFilter == undefined) {
                    filterAssemblies(domain.assemblies);
                    return;
                }

                for (const assembly of domain.assemblies) {
                    if (this.#assemblyFilter(assembly)) {
                        filterAssembly(assembly);
                    }
                }
            };

            this.#methods
                ? filterMethods(this.#methods)
                : this.#classes
                ? filterClasses(this.#classes)
                : this.#assemblies
                ? filterAssemblies(this.#assemblies)
                : filterDomain(Il2Cpp.domain);

            this.#assemblies = undefined;
            this.#classes = undefined;
            this.#methods = undefined;
            this.#assemblyFilter = undefined;
            this.#classFilter = undefined;
            this.#methodFilter = undefined;
            this.#parameterFilter = undefined;

            return this;
        }

        /** Starts tracing. */
        abstract attach(): void;

        /** @internal */
        maybeFlush(useHistory: boolean = false) {
            if (this.events.depth == 0) {
                const message = `\n${this.events.buffer.join("\n")}\n`;

                if (useHistory) {
                    const hash = this.cyrb53(message);
                    if (!this.events.history.has(hash)) {
                        this.events.history.add(hash);
                        inform(message);
                    }
                } else {
                    inform(message);
                }

                this.events.buffer.length = 0;
            }
        }

        /** @internal https://stackoverflow.com/a/52171480/16885569 */
        cyrb53(str: string): number {
            let h1 = 0xdeadbeef;
            let h2 = 0x41c6ce57;

            for (let i = 0, ch; i < str.length; i++) {
                ch = str.charCodeAt(i);
                h1 = Math.imul(h1 ^ ch, 2654435761);
                h2 = Math.imul(h2 ^ ch, 1597334677);
            }

            h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
            h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);

            h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
            h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

            return 4294967296 * (2097151 & h2) + (h1 >>> 0);
        }
    }

    export declare namespace AbstractTracer {
        export type ChooseTargets = Pick<Il2Cpp.AbstractTracer, "domain" | "assemblies" | "classes" | "methods">;

        export type FilterAssemblies = FilterClasses & Pick<Il2Cpp.AbstractTracer, "filterAssemblies">;

        export type FilterClasses = FilterMethods & Pick<Il2Cpp.AbstractTracer, "filterClasses">;

        export type FilterMethods = FilterParameters & Pick<Il2Cpp.AbstractTracer, "filterMethods">;

        export type FilterParameters = Pick<Il2Cpp.AbstractTracer, "and"> & Pick<Il2Cpp.AbstractTracer, "filterParameters">;
    }
}
