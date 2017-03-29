class Vec2 {
    x: number
    y: number

    constructor(x: number = 0, y: number = 0) {
        this.x = x
        this.y = y
    }

    clone(): Vec2 { return new Vec2(this.x, this.y) }

    // Non-mutating operations
    plus(other: Vec2): Vec2 { return new Vec2(this.x + other.x, this.y + other.y) }
    minus(other: Vec2): Vec2 { return new Vec2(this.x - other.x, this.y - other.y) }
    dot(other: Vec2): number { return this.x * other.x + this.y * other.y }
    scaledBy(scalar: number): Vec2 { return new Vec2(this.x * scalar, this.y * scalar) }
    length2(): number { return this.x * this.x + this.y * this.y }
    length(): number { return Math.sqrt(this.x * this.x + this.y * this.y) }

    // Mutation operations
    add(other: Vec2) { this.x += other.x; this.y += other.y }
    subtract(other: Vec2) { this.x -= other.x; this.y -= other.y }
    scale(scalar: number) { this.x *= scalar; this.y *= scalar }
    set(x: number, y: number) { this.x = x; this.y = y }
    copyFrom(other: Vec2) { this.x = other.x; this.y = other.y }
    clear() { this.x = 0; this.y = 0}

    // Memory pooling
    static freeList: Vec2[] = []
    static allocateFromPool(): Vec2 { return Vec2.freeList.pop() || new Vec2() }
    returnToPool() { Vec2.freeList.push(this) }
}
