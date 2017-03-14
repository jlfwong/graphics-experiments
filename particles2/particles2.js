function assert(condition) {
    if (!condition)
        throw new Error("Unexpected error.");
}
var DefaultComponentAllocator = (function () {
    function DefaultComponentAllocator(ctor) {
        this.ctor = ctor;
    }
    DefaultComponentAllocator.prototype.allocate = function (entityID) {
        return new this.ctor;
    };
    DefaultComponentAllocator.prototype.release = function (entityID, t) {
        // No-op - just let the object be garbage collected eventually
    };
    return DefaultComponentAllocator;
}());
var ComponentType = (function () {
    function ComponentType(componentName, ctor, allocatorCtor) {
        if (allocatorCtor === void 0) { allocatorCtor = DefaultComponentAllocator; }
        var _this = this;
        this.componentName = componentName;
        this.allocator = new allocatorCtor(ctor);
        ComponentType.nameToReleaseFn[componentName] = function (entityID, t) { _this.release(entityID, t); };
    }
    ComponentType.prototype.allocate = function (entityID) { return this.allocator.allocate(entityID); };
    ComponentType.prototype.release = function (entityID, t) { this.allocator.release(entityID, t); };
    ComponentType.release = function (componentName, entityID, t) {
        ComponentType.nameToReleaseFn[componentName](entityID, t);
    };
    return ComponentType;
}());
ComponentType.nameToReleaseFn = Object.create(null);
var Entity = (function () {
    function Entity() {
        this.id = -1;
        this.components = Object.create(null);
    }
    Entity.prototype.add = function (componentType) {
        var component = componentType.allocate(this.id);
        this.components[componentType.componentName];
        return component;
    };
    Entity.prototype.has = function (componentType) {
        return componentType.componentName in this.components;
    };
    Entity.prototype.hasBoth = function (t, u) {
        return this.has(t) && this.has(u);
    };
    Entity.prototype.hasAll3 = function (t, u, v) {
        return this.has(t) && this.has(u) && this.has(v);
    };
    Entity.prototype.get = function (componentType) {
        var componentName = componentType.componentName;
        var component = this.components[componentName];
        assert(component != null);
        return component;
    };
    Entity.prototype.remove = function (componentType) {
        var componentName = componentType.componentName;
        var component = this.components[componentName];
        assert(component != null);
        delete this.components[componentName];
        componentType.release(this.id, component);
    };
    Entity.prototype.removeAll = function () {
        for (var componentName in this.components) {
            var component = this.components[componentName];
            delete this.components[componentName];
            ComponentType.release(componentName, this.id, component);
        }
    };
    return Entity;
}());
var ECS = (function () {
    function ECS() {
        this.entities = [];
        this.maxID = 0;
        this.entityIDToIndex = Object.create(null);
    }
    ECS.prototype.createEntity = function () {
        var entity = this.freeList.pop() || new Entity();
        entity.id = this.maxID++;
        this.entityIDToIndex[entity.id] = this.entities.length;
        this.entities.push(entity);
        return entity;
    };
    ECS.prototype.destroyEntity = function (entity) {
        entity.removeAll();
        var index = this.entityIDToIndex[entity.id];
        if (index !== this.entities.length - 1) {
            // Move the last element into the position of the released element
            this.entities[index] = this.entities[this.entities.length - 1];
        }
        this.entities.pop();
        this.freeList.push(entity);
    };
    return ECS;
}());
//////////////////////////
var PoolComponentAllocator = (function () {
    function PoolComponentAllocator(ctor) {
        this.ctor = ctor;
        this.activeList = [];
        this.entityIDToActiveListIndex = Object.create(null);
        this.freeList = [];
    }
    PoolComponentAllocator.prototype.allocate = function (entityID) {
        assert(!(entityID in this.entityIDToActiveListIndex));
        return this.freeList.pop() || new this.ctor();
    };
    PoolComponentAllocator.prototype.release = function (entityID, t) {
        var index = this.entityIDToActiveListIndex[entityID];
        assert(index != null);
        var component = this.activeList[index];
        assert(component === t);
        if (index !== this.activeList.length - 1) {
            // Move the last element into the position of the released element
            this.activeList[index] = this.activeList[this.activeList.length - 1];
        }
        this.activeList.pop();
        this.freeList.push(component);
    };
    return PoolComponentAllocator;
}());
//////////////////////////
var Vector = (function () {
    function Vector() {
    }
    return Vector;
}());
var Color = (function () {
    function Color() {
    }
    return Color;
}());
var Pos = new ComponentType("Position", Vector);
var Vel = new ComponentType("Velocity", Vector);
var Col = new ComponentType("Color", Color);
function main() {
    var ecs = new ECS();
    var entity = ecs.createEntity();
    entity.add(Pos);
    entity.get(Vel);
    for (var _i = 0, _a = ecs.entities; _i < _a.length; _i++) {
        var entity_1 = _a[_i];
        if (!entity_1.hasBoth(Pos, Vel)) {
            continue;
        }
        var pos = entity_1.get(Pos);
        var vel = entity_1.get(Vel);
        pos.x += vel.x;
        pos.y += vel.y;
    }
}
