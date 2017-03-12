function assert(condition: boolean): void {
    if (!condition) throw new Error("Unexpected error.")
}

interface Allocator<T> {
    allocate(entityID: number): T
    release(entityID: number): void
}

class DumbAllocator<T> implements Allocator<T> {
    constructor(readonly ctor: {new(): T}) {}
    allocate(entityID: number) {
        return new this.ctor
    }
    release(entityID: number) {
        // No-op - just let the object be garbage collected eventually
    }
}

type AllocatorFactory<T> = {
    new(ctor: {new(): T}): Allocator<T>
}

class ComponentType<T> {
    readonly componentName: string
    readonly allocator: Allocator<T>

    constructor(componentName: string, ctor: {new(): T}, allocatorCtor: AllocatorFactory<T> = DumbAllocator) {
        this.componentName = componentName
        this.allocator = new allocatorCtor(ctor)
        ComponentType.nameToReleaseFn[componentName] = (entityID: number) => { this.release(entityID) }
    }

    allocate(entityID: number): T { return this.allocator.allocate(entityID) }
    release(entityID: number): void { this.allocator.release(entityID) }

    static nameToReleaseFn: {[name: string] : ((entityID: number) => void )} = Object.create(null)
    static release(componentName: string, entityID: number) {
        ComponentType.nameToReleaseFn[componentName](entityID)
    }
}

class Entity {
    id: number = null
    public components: {[componentName: string]: {}} = Object.create(null)

    add<T>(componentType: ComponentType<T>): T {
        const component = componentType.allocate(this.id)
        this.components[componentType.componentName]
        return component
    }

    has<T>(componentType: ComponentType<T>): boolean {
        return componentType.componentName in this.components
    }

    hasAll2<T, U>(t: ComponentType<T>, u: ComponentType<U>): boolean {
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
        componentType.release(this.id)
    }

    removeAll() {
        for (const componentName in this.components) {
            const component = this.components[componentName]
            delete this.components[componentName];
            ComponentType.release(componentName, this.id)
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
        const entity = this.freeList.length > 0 ? this.freeList.pop() : new Entity()
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
}

//////////////////////////

class PoolAllocator<T> implements Allocator<T> {
    activeList: T[] = []
    entityIDToActiveListIndex: {[key: number]: number} = Object.create(null)
    freeList: T[] = []

    constructor(readonly ctor: {new(): T}) {}

    allocate(entityID: number): T {
        assert(!(entityID in this.entityIDToActiveListIndex));
        if (this.freeList.length > 0) {
            return this.freeList.pop()
        } else {
            return new this.ctor()
        }
    }

    release(entityID: number): void {
        const index = this.entityIDToActiveListIndex[entityID]
        assert(index != null);
        const t = this.activeList[index]
        if (index !== this.activeList.length - 1) {
            // Move the last element into the position of the released element
            this.activeList[index] = this.activeList[this.activeList.length - 1]
        }
        this.activeList.pop()
        this.freeList.push(t)
    }
}

//////////////////////////

class Vector {
    x: number
    y: number
}

class Color {
    r: number
    g: number
    b: number
}

const Pos = new ComponentType<Vector>("Position", Vector)
const Vel = new ComponentType<Vector>("Velocity", Vector)
const Col = new ComponentType<Color>("Color", Color)

function main() {
    const ecs = new ECS()
    const entity = ecs.createEntity()
    entity.add(Pos)
    entity.get(Vel)

    for (let entity of ecs.entities) {
        if (!entity.hasAll2(Pos, Vel)) {
            continue;
        }
        const pos = entity.get(Pos)
        const vel = entity.get(Vel)
        pos.x += vel.x
        pos.y += vel.y
    }
}