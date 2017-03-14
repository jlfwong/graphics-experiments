namespace Simulation {
    /**
     * Allocators
     */
    const vecAllocator = {
        allocate(): Vec2 { return Vec2.allocateFromPool() },
        release(v: Vec2): void { v.returnToPool() }
    }

    /**
     * Movement
     */
    const Position = new ComponentType("Position", vecAllocator)
    const Velocity = new ComponentType("Velocity", vecAllocator)

    function move(ecs: ECS, dt: number) {
        const dp = Vec2.allocateFromPool()
        ecs.eachWith2(Position, Velocity, (p, v) => {
            // dp = v dt
            dp.copyFrom(v)
            dp.scale(dt)
            p.add(dp)
        })
        dp.returnToPool()
    }

    /**
     * Acceleration
     */
    class RigidBodyInfo {
        force: Vec2 = new Vec2()
        mass: number = 0.0
    }
    const RigidBody = new ComponentType("RigidBody", new PoolAllocator(RigidBodyInfo))

    function accelerate(ecs: ECS, dt: number) {
        const dv = Vec2.allocateFromPool()
        ecs.eachWith2(Velocity, RigidBody, (v, body) => {
            // dv = a dt = F/m dt
            dv.copyFrom(body.force)
            dv.scale(dt / body.mass)
            v.add(dv)
        })
        dv.returnToPool()
    }

    /**
     * Gravity
     */
    function applyGravity(ecs: ECS) {
        const df = Vec2.allocateFromPool()
        ecs.eachWith(RigidBody, (body) => {
            // df = -9.8 * m [down]
            df.set(0, -9.8)
            df.scale(body.mass)
            body.force.add(df)
        })
        df.returnToPool()
    }

    /**
     * Destroy old entities
     */
    class AgeInfo {
        lifespan: number = 0.0
        age: number = 0.0
    }
    const Age = new ComponentType("Temporary", new PoolAllocator(AgeInfo))

    function ageEntities(ecs: ECS, dt: number) {
        ecs.eachWith(Age, (age, entity) => {
            age.age += dt
            if (age.age > age.lifespan) {
                ecs.destroyEntity(entity)
            }
        })
    }

    /**
     * Render particles
     */
    class ParticleAppearanceInfo {
        radius: number
        color: string
    }
    const ParticleAppearance = new ComponentType("ParticleAppearance", new PoolAllocator(ParticleAppearanceInfo))

    function renderParticles(ecs: ECS, ctx: CanvasRenderingContext2D) {
        ecs.eachWith2(Position, ParticleAppearance, (p, appearance) => {
            ctx.fillStyle = appearance.color
            ctx.fillRect(p.x, p.y, 1, 1)
        })
    }

    function main() {
        const ecs = new ECS()
        const entity = ecs.createEntity()
        entity.add(Position)
        entity.get(Velocity)

        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")!
        const width = 800
        const height = 800
        canvas.width = width
        canvas.height = height

        function tick() {
            const dt = 1/60.0
            ageEntities(ecs, dt)
            applyGravity(ecs)
            accelerate(ecs, dt)
            move(ecs, dt)

            renderParticles(ecs, ctx)
        }
    }
}