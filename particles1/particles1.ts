class Vec2 {
    x: number
    y: number

    constructor(x: number, y: number) {
        this.x = x
        this.y = y
    }

    plus(other: Vec2): Vec2 { return new Vec2(this.x + other.x, this.y + other.y) }
    minus(other: Vec2): Vec2 { return new Vec2(this.x - other.x, this.y - other.y) }
    length2(): number { return this.x * this.x + this.y * this.y }
    length(): number { return Math.sqrt(this.x * this.x + this.y * this.y) }

    add(other: Vec2) { this.x += other.x; this.y += other.y }
    subtract(other: Vec2) { this.x -= other.x; this.y -= other.y }
    scale(scalar: number) { this.x *= scalar; this.y *= scalar }
    clear() { this.x = 0; this.y = 0}
}

class Particle {
    m: number // mass
    p: Vec2   // position
    v: Vec2   // velocity
    f: Vec2   // force accumulator

    constructor(p: Vec2, v: Vec2, m: number) {
        this.p = p
        this.v = v
        this.m = m
        this.f = new Vec2(0, 0)
    }
}

type ForceAccumulator = (particles: Particle[]) => void

class ParticleSimulation {
    particles: Particle[]
    forces: ForceAccumulator[]

    private s: Float32Array
    private sPrime: Float32Array

    constructor(particles: Particle[], forces: ForceAccumulator[]) {
        this.particles = particles
        this.forces = forces

        // TODO(jlfwong): This doesn't handle the particles length changing
        this.s = new Float32Array(particles.length * 4)
        this.sPrime = new Float32Array(particles.length * 4)
    }

    private clearForces() {
        for (let particle of this.particles) {
            particle.f.clear()
        }
    }

    private calculateForces() {
        this.forces.forEach(force => force(this.particles))
    }

    private calculateDerivatives() {
        this.clearForces()
        this.calculateForces()
    }

    private writeToStateArray() {
        const s = this.s
        let index = 0
        for (let particle of this.particles) {
            s[index++] = particle.p.x
            s[index++] = particle.p.y
            s[index++] = particle.v.x
            s[index++] = particle.v.y
        }
    }

    private readFromStateArray() {
        const s = this.s
        let index = 0
        for (let particle of this.particles) {
            particle.p.x = s[index++]
            particle.p.y = s[index++]
            particle.v.x = s[index++]
            particle.v.y = s[index++]
        }
    }

    private writeToDerivativeArray() {
        const sPrime = this.sPrime
        let index = 0
        for (let particle of this.particles) {
            sPrime[index++] = particle.v.x
            sPrime[index++] = particle.v.y
            sPrime[index++] = particle.f.x / particle.m
            sPrime[index++] = particle.f.y / particle.m
        }
    }

    private eulerStep(deltaT: number) {
        const s = this.s
        const sPrime = this.sPrime
        for (let i = 0, ii = s.length; i < ii; i++) {
            s[i] += sPrime[i] * deltaT
        }
    }

    step(deltaT: number) {
        const s = this.s
        const sPrime = this.sPrime

        const n = this.particles.length

        this.calculateDerivatives()
        this.writeToStateArray()
        this.writeToDerivativeArray()
        this.eulerStep(deltaT)
        this.readFromStateArray()
    }
}

function main() {
    function attraction(particles: Particle[]) {
        let n = particles.length
        const G = 10.0
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const pi = particles[i]
                const pj = particles[j]

                // Vector from i to j
                const i2j = pj.p.minus(pi.p)

                const r2 = i2j.length2()
                const f = (G * pi.m * pj.m) / r2

                i2j.scale(f)

                pi.f.add(i2j)
                pj.f.subtract(i2j)
            }
        }
    }

    const particles: Particle[] = []

    const width = 400
    const height = 400
    const n = 2000

    for (let i = 0; i < n; i++) {
        const p = new Vec2(Math.random() * width, Math.random() * height)
        const v = new Vec2(0, 0)
        const m = 1.0
        particles.push(new Particle(p, v, m))
    }

    const simulation = new ParticleSimulation(particles, [attraction])

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

    function draw(particles: Particle[]) {
        ctx.clearRect(0, 0, width, height)
        ctx.fillStyle = "black";
        for (let i = 0, ii = particles.length; i < ii; i++) {
            const particle = particles[i]
            ctx.fillRect(particle.p.x, particle.p.y, 1, 1)
        }
    }

    function tick() {
        const deltaT = 1/60.0
        simulation.step(deltaT)
        draw(particles)
        requestAnimationFrame(tick)
    }
    tick()
}

document.addEventListener('DOMContentLoaded', main)