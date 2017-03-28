function assert(condition: boolean): void {
    if (!condition) throw new Error("Unexpected error.")
}

interface IAllocator<T> {
    allocate(): T
    release(t: T): void
}

class DefaultAllocator<T> implements IAllocator<T> {
    constructor(readonly ctor: {new(): T}) {}
    allocate() {
        return new this.ctor
    }
    release(t: T) {
        // No-op - just let the object be garbage collected eventually
    }
}

class PoolAllocator<T> implements IAllocator<T> {
    private freeList: T[] = []
    constructor(readonly ctor: {new(): T}) {}

    allocate(): T {
        return this.freeList.pop() || new this.ctor()
    }

    release(t: T): void {
        this.freeList.push(t)
    }
}

class ComponentType<T> {
    constructor(readonly componentName: string, readonly allocator: IAllocator<T>) {
        ComponentType.nameToReleaseFn[componentName] = (t: T) => { this.release(t) }
    }

    allocate(): T { return this.allocator.allocate() }
    release(t: T): void { this.allocator.release(t) }

    static nameToReleaseFn: {[name: string] : ((t: {}) => void )} = Object.create(null)
    static release(componentName: string, t: any) {
        ComponentType.nameToReleaseFn[componentName](t)
    }
}

class Entity {
    id: number = -1
    context: Context
    public components: {[componentName: string]: {}} = Object.create(null)

    add<T>(componentType: ComponentType<T>): T {
        const component = componentType.allocate()
        this.components[componentType.componentName] = component
        this.context.handleComponentAdded(this, component)
        return component
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
        componentType.release(component)
        this.context.handleComponentRemoved(this, component)
    }

    removeAll() {
        for (const componentName in this.components) {
            const component = this.components[componentName]
            delete this.components[componentName];
            this.context.handleComponentRemoved(this, component)
            ComponentType.release(componentName, component)
        }
    }
}

interface IContextObserver {
    handleComponentAdded<T>(entity: Entity, component: T): void
    handleComponentRemoved<T>(entity: Entity, component: T): void
}

type EntityMatcher = (entity: Entity) => boolean

class EntityList {
    entities: Entity[] = []
    entityIDToIndex: {[key: number]: number} = Object.create(null)
    nEntities: number = 0

    protected addEntity(entity: Entity) {
        assert(typeof this.entityIDToIndex[entity.id] === 'undefined')
        this.entityIDToIndex[entity.id] = this.entities.length
        this.entities.push(entity)
        this.nEntities++
    }

    protected containsEntity(entity: Entity): boolean {
        return typeof this.entityIDToIndex[entity.id] !== 'undefined'
    }

    protected removeEntity(entity: Entity) {
        // console.log('hi');
        const entities = this.entities
        const entityIDToIndex = this.entityIDToIndex
        const index = entityIDToIndex[entity.id]
        delete entityIDToIndex[entity.id]
        this.nEntities--
        if (index !== this.nEntities) {
            const lastEntity = entities[this.nEntities]
            // Move the last element into the position of the released element
            entityIDToIndex[lastEntity.id] = index
            entities[index] = lastEntity
        }
        entities.pop()
    }
}

class Group extends EntityList {
    constructor(readonly context: Context, readonly matcher: EntityMatcher) {
        super()
        this.context.addObserver(this)
        for (const entity of this.context.entities) {
            if (matcher(entity)) {
                this.addEntity(entity)
            }
        }
    }

    handleComponentAdded<T>(entity: Entity, component: T) {
        if (!this.containsEntity(entity) && this.matcher(entity)) {
            this.addEntity(entity)
        }
    }

    handleComponentRemoved<T>(entity: Entity, component: T) {
        if (this.containsEntity(entity) && !this.matcher(entity)) {
            this.removeEntity(entity)
        }
    }
}

class Group1<T> extends Group {
    private tName: string

    constructor(context: Context, t: ComponentType<T>) {
        super(context, entity => typeof entity.components[t.componentName] !== 'undefined')
        this.tName = t.componentName
    }

    each(cb: (t: T, entity: Entity) => void) : void {
        for (let entity of this.entities) {
            cb(entity.components[this.tName] as T,
               entity)
        }
    }
}

class Group2<T, U> extends Group {
    private tName: string
    private uName: string

    constructor(context: Context, t: ComponentType<T>, u: ComponentType<U>) {
        super(context, entity => typeof entity.components[t.componentName] !== 'undefined' &&
                                 typeof entity.components[u.componentName] !== 'undefined')
        this.tName = t.componentName
        this.uName = u.componentName
    }

    each(cb: (t: T, u: U, entity: Entity) => void) {
        for (let entity of this.entities) {
            cb(entity.components[this.tName] as T,
               entity.components[this.uName] as U,
               entity)
        }
    }
}

class Group3<T, U, V> extends Group {
    private tName: string
    private uName: string
    private vName: string

    constructor(context: Context, t: ComponentType<T>, u: ComponentType<U>, v: ComponentType<V>) {
        super(context, entity => typeof entity.components[t.componentName] !== 'undefined' &&
                                 typeof entity.components[u.componentName] !== 'undefined' &&
                                 typeof entity.components[v.componentName] !== 'undefined')
        this.tName = t.componentName
        this.uName = u.componentName
        this.vName = v.componentName
    }

    each(cb: (t: T, u: U, v: V, entity: Entity) => void) {
        for (let entity of this.entities) {
            cb(entity.components[this.tName] as T,
               entity.components[this.uName] as U,
               entity.components[this.vName] as V,
               entity)
        }
    }
}


class Context extends EntityList {
    private maxID: number = 1
    private entityAllocator = new PoolAllocator(Entity)
    private observers: IContextObserver[] = []

    createEntity(): Entity {
        const entity = this.entityAllocator.allocate()
        entity.context = this
        entity.id = this.maxID++
        this.addEntity(entity)
        return entity
    }

    destroyEntity(entity: Entity) {
        entity.removeAll()
        this.removeEntity(entity)
        entity.id = -1
        this.entityAllocator.release(entity)
    }

    handleComponentAdded<T>(entity: Entity, component: T) {
        for (const observer of this.observers) {
            observer.handleComponentAdded(entity, component)
        }
    }

    handleComponentRemoved<T>(entity: Entity, component: T) {
        for (const observer of this.observers) {
            observer.handleComponentRemoved(entity, component)
        }
    }

    createGroupWith<T>(t: ComponentType<T>): Group1<T>
    createGroupWith<T, U>(t: ComponentType<T>, u: ComponentType<U>): Group2<T, U>
    createGroupWith<T, U, V>(t: ComponentType<T>, u: ComponentType<U>, v: ComponentType<V>): Group3<T, U, V>
    createGroupWith<T, U, V>(t: ComponentType<T>, u?: ComponentType<U>, v?: ComponentType<V>): Group {
        if (u && v) {
            return new Group3(this, t, u, v)
        } else if (u) {
            return new Group2(this, t, u)
        } else {
            return new Group1(this, t)
        }
    }

    addObserver(observer: IContextObserver) {
        this.observers.push(observer)
    }

    removeObserver(observer: IContextObserver) {
        const index = this.observers.indexOf(observer)
        assert(index !== -1)
        // TODO(jlfwong): If we can assume order doesn't matter, this can be made
        // O(1) by doing a swap and pop()
        this.observers.splice(index, 1)
    }
}