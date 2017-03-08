class Vec2 {
    x: number
    y: number

    constructor(x: number, y: number) {
        this.x = x
        this.y = y
    }

    clone(): Vec2 { return new Vec2(this.x, this.y) }

    plus(other: Vec2): Vec2 { return new Vec2(this.x + other.x, this.y + other.y) }
    minus(other: Vec2): Vec2 { return new Vec2(this.x - other.x, this.y - other.y) }
    scaledBy(scalar: number): Vec2 { return new Vec2(this.x * scalar, this.y * scalar) }
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

type Force = (particles: Particle[]) => void

class ParticleSimulation {
    particles: Particle[]
    forces: Force[]

    constructor(particles: Particle[], forces: Force[]) {
        this.particles = particles
        this.forces = forces
    }

    step(deltaT: number) {
        for (let particle of this.particles) {
            particle.f.clear()
        }
        this.forces.forEach(force => force(this.particles))

        for (let particle of this.particles) {
            particle.p.add(particle.v.scaledBy(deltaT))
            particle.v.add(particle.f.scaledBy(deltaT / particle.m))
        }
    }
}

function main() {
    function attraction(particles: Particle[]) {
        let n = particles.length
        const G = 100.0
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

    function drag(particles: Particle[]) {
        const dragCoeff = 0.1 // N/(m/s)
        for (let particle of particles) {
            const drag = particle.v.clone()
            drag.scale(dragCoeff)
            particle.f.subtract(drag)
        }
    }

    const particles: Particle[] = []

    const width = 1000
    const height = 1000
    const n = 1000

    for (let i = 0; i < n; i++) {
        const p = new Vec2(Math.random() * width, Math.random() * height)
        const v = new Vec2(0, 0)
        const m = 1.0
        particles.push(new Particle(p, v, m))
    }

    const simulation = new ParticleSimulation(particles, [attraction, drag])

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

    function draw(particles: Particle[]) {
        ctx.clearRect(0, 0, width, height)
        ctx.fillStyle = "black"
        ctx.fillRect(0, 0, width, height)
        ctx.fillStyle = "white"
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