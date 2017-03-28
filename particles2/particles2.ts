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

    function moveSystem(context: Context) {
        const group = context.createGroupWith(Position, Velocity)
        const dp = new Vec2
        return function move(dt: number) {
            group.each((p, v) => {
                // dp = v dt
                dp.copyFrom(v)
                dp.scale(dt)
                p.add(dp)
            })
        }
    }

    /**
     * Acceleration
     */
    class RigidBodyInfo {
        force: Vec2 = new Vec2()
        mass: number = 1.0
        clear() { this.force.clear(); this.mass = 1.0 }
    }
    const RigidBody = new ComponentType("RigidBody", new PoolAllocator(RigidBodyInfo))

    function accelerationSystem(context: Context) {
        const group = context.createGroupWith(Velocity, RigidBody)
        const dv = new Vec2
        return function accelerate(dt: number) {
            group.each((v, body) => {
                // dv = a dt = F/m dt
                dv.copyFrom(body.force)
                dv.scale(dt / body.mass)
                v.add(dv)
                body.force.clear()
            })
        }
    }

    /**
     * Gravity
     */
    function gravitySystem(context: Context) {
        const group = context.createGroupWith(RigidBody)
        const df = new Vec2
        return function applyGravity() {
            group.each((body, entity) => {
                df.set(0, -9.8)
                df.scale(body.mass)
                body.force.add(df)
                // df = -9.8 * m [down]
            })
        }
    }

    /**
     * Destroy old entities
     */
    class AgeInfo {
        lifespan: number = 0.0
        age: number = 0.0
        set(lifespan: number, age: number) { this.lifespan = lifespan; this.age = age }
    }
    const Temporary = new ComponentType("Temporary", new PoolAllocator(AgeInfo))

    function recycleParticlesSystem(context: Context, width: number, height: number) {
        const toRecycle: Entity[] = []
        const group = context.createGroupWith(Temporary)
        return function recycleParticlesSystem(dt: number) {
            group.each((temporary, entity) => {
                temporary.age += dt
                if (temporary.age > temporary.lifespan) {
                    resetParticle(entity, width, height)
                }
            })
        }
    }

    /**
     * Render particles
     */
    class ParticleAppearanceInfo {
        radius: number
        color: string
        set(radius: number, color: string) { this.radius = radius; this.color = color }
    }
    const ParticleAppearance = new ComponentType("ParticleAppearance", new PoolAllocator(ParticleAppearanceInfo))

    function particleRenderSystem(context: Context, ctx: CanvasRenderingContext2D) {
        const group = context.createGroupWith(Position, ParticleAppearance)
        return function renderParticles() {
            group.each((p, appearance) => {
                ctx.fillStyle = appearance.color
                ctx.fillRect(p.x, -p.y, 1, 1)
            })
        }
    }

    function resetParticle(entity: Entity, width: number, height: number): void {
        entity.get(Temporary).set(Math.random() * 3.0, 0.0)
        entity.get(Position).set(Math.random() * width, 10)
        entity.get(Velocity).set(0, -100)
        entity.get(RigidBody).clear()
        entity.get(ParticleAppearance).set(1, "black")
    }

    /**
     * Generate new particle
     */
    function createParticle(context: Context, width: number, height: number): void {
        const entity = context.createEntity()
        entity.add(Temporary).set(Math.random() * 3.0, 0.0)
        entity.add(Position).set(Math.random() * width, 10)
        entity.add(Velocity).set(0, -100)
        entity.add(RigidBody).clear()
        entity.add(ParticleAppearance).set(1, "black")
    }

    function startTick(cb: () => void) {
        // Chrome seems to leak memory from requestAnimationFrame loops.
        // https://bugs.chromium.org/p/chromium/issues/detail?id=120186
        (function tick() {
            cb()
            requestAnimationFrame(tick)
        })()
    }

    export function main() {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")!
        document.body.appendChild(canvas)
        const width = 800
        const height = 800
        canvas.width = width
        canvas.height = height

        const simContext = new Context()

        // Set up systems
        const recycleParticles = recycleParticlesSystem(simContext, width, height)
        const applyGravity = gravitySystem(simContext)
        const accelerate = accelerationSystem(simContext)
        const move = moveSystem(simContext)
        const renderParticles = particleRenderSystem(simContext, ctx)

        for (let i = 0; i < 20000; i++) {
            createParticle(simContext, width, height)
        }
        function tick() {
            const dt = 1/60.0

            recycleParticles(dt)
            applyGravity()
            accelerate(dt)
            move(dt)

            ctx.clearRect(0, 0, width, height)
            renderParticles()
        }
        startTick(tick)
    }
}