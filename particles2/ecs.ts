function assert(condition: boolean): void {
    if (!condition) throw new Error("Unexpected error.")
}

interface Allocator<T> {
    allocate(): T
    release(t: T): void
}

class DefaultAllocator<T> implements Allocator<T> {
    constructor(readonly ctor: {new(): T}) {}
    allocate() {
        return new this.ctor
    }
    release(t: T) {
        // No-op - just let the object be garbage collected eventually
    }
}

class PoolAllocator<T> implements Allocator<T> {
    private freeList: T[] = []
    constructor(readonly ctor: {new(): T}) {}

    allocate(): T {
        return this.freeList.pop() || new this.ctor()
    }

    release(t: T): void {
        this.freeList.push(t)
    }
}

type AllocatorFactory<T> = {
    new(ctor: {new(): T}): Allocator<T>
}

class ComponentType<T> {
    constructor(readonly componentName: string, readonly allocator: Allocator<T>) {
        ComponentType.nameToReleaseFn[componentName] = (entityID: number, t: T) => { this.release(entityID, t) }
    }

    allocate(entityID: number): T { return this.allocator.allocate() }
    release(entityID: number, t: T): void { this.allocator.release(t) }

    static nameToReleaseFn: {[name: string] : ((entityID: number, t: any) => void )} = Object.create(null)
    static release(componentName: string, entityID: number, t: any) {
        ComponentType.nameToReleaseFn[componentName](entityID, t)
    }
}

class Entity {
    id: number = -1
    public components: {[componentName: string]: {}} = Object.create(null)

    add<T>(componentType: ComponentType<T>): T {
        const component = componentType.allocate(this.id)
        this.components[componentType.componentName]
        return component
    }

    has<T>(componentType: ComponentType<T>): boolean {
        return componentType.componentName in this.components
    }

    hasBoth<T, U>(t: ComponentType<T>, u: ComponentType<U>): boolean {
        return this.has(t) && this.has(u)
    }

    hasAll3<T, U, V>(t: ComponentType<T>, u: ComponentType<U>, v: ComponentType<V>) {
        return this.has(t) && this.has(u) && this.has(v)
    }

    get<T>(componentType: ComponentType<T>): T {
        const {componentName} = componentType
        const component = this.components[componentName] as T
        assert(component != null)
        return component
    }

    remove<T>(componentType: ComponentType<T>) {
        const componentName = componentType.componentName
        const component = this.components[componentName] as T
        assert(component != null)
        delete this.components[componentName]
        componentType.release(this.id, component)
    }

    removeAll() {
        for (const componentName in this.components) {
            const component = this.components[componentName]
            delete this.components[componentName];
            ComponentType.release(componentName, this.id, component)
        }
    }
}

class ECS {
    entities: Entity[]

    private maxID: number
    private entityIDToIndex: {[key: number]: number}
    private freeList: Entity[]

    constructor() {
        this.entities = []
        this.maxID = 0
        this.entityIDToIndex = Object.create(null)
    }

    createEntity(): Entity {
        const entity = this.freeList.pop() || new Entity()
        entity.id = this.maxID++
        this.entityIDToIndex[entity.id] = this.entities.length
        this.entities.push(entity)
        return entity
    }

    destroyEntity(entity: Entity) {
        entity.removeAll()
        const index = this.entityIDToIndex[entity.id]
        if (index !== this.entities.length - 1) {
            // Move the last element into the position of the released element
            this.entities[index] = this.entities[this.entities.length - 1]
        }
        this.entities.pop()
        this.freeList.push(entity)
    }

    eachWith<T>(ct: ComponentType<T>, cb: (t: T, e: Entity) => void) {
        for (let entity of this.entities) {
            if (ct.componentName in entity.components) {
                cb(entity.get(ct), entity)
            }
        }
    }

    eachWith2<T, U>(ct1: ComponentType<T>, ct2: ComponentType<U>, cb: (t: T, u: U, e: Entity) => void) {
        for (let entity of this.entities) {
            if (ct1.componentName in entity.components &&
                ct2.componentName in entity.components
            ) {
                cb(entity.get(ct1), entity.get(ct2), entity)
            }
        }
    }

    eachWith3<T, U, V>(ct1: ComponentType<T>, ct2: ComponentType<U>, ct3: ComponentType<V>, cb: (t: T, u: U, v: V, e: Entity) => void) {
        for (let entity of this.entities) {
            if (ct1.componentName in entity.components &&
                ct2.componentName in entity.components &&
                ct3.componentName in entity.components
            ) {
                cb(entity.get(ct1), entity.get(ct2), entity.get(ct3), entity)
            }
        }
    }
}