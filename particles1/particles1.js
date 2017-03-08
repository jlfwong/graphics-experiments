var Vec2 = (function () {
    function Vec2(x, y) {
        this.x = x;
        this.y = y;
    }
    Vec2.prototype.clone = function () { return new Vec2(this.x, this.y); };
    Vec2.prototype.plus = function (other) { return new Vec2(this.x + other.x, this.y + other.y); };
    Vec2.prototype.minus = function (other) { return new Vec2(this.x - other.x, this.y - other.y); };
    Vec2.prototype.scaledBy = function (scalar) { return new Vec2(this.x * scalar, this.y * scalar); };
    Vec2.prototype.length2 = function () { return this.x * this.x + this.y * this.y; };
    Vec2.prototype.length = function () { return Math.sqrt(this.x * this.x + this.y * this.y); };
    Vec2.prototype.add = function (other) { this.x += other.x; this.y += other.y; };
    Vec2.prototype.subtract = function (other) { this.x -= other.x; this.y -= other.y; };
    Vec2.prototype.scale = function (scalar) { this.x *= scalar; this.y *= scalar; };
    Vec2.prototype.clear = function () { this.x = 0; this.y = 0; };
    return Vec2;
}());
var Particle = (function () {
    function Particle(p, v, m) {
        this.p = p;
        this.v = v;
        this.m = m;
        this.f = new Vec2(0, 0);
    }
    return Particle;
}());
var ParticleSimulation = (function () {
    function ParticleSimulation(particles, forces) {
        this.particles = particles;
        this.forces = forces;
    }
    ParticleSimulation.prototype.step = function (deltaT) {
        var _this = this;
        for (var _i = 0, _a = this.particles; _i < _a.length; _i++) {
            var particle = _a[_i];
            particle.f.clear();
        }
        this.forces.forEach(function (force) { return force(_this.particles); });
        for (var _b = 0, _c = this.particles; _b < _c.length; _b++) {
            var particle = _c[_b];
            particle.p.add(particle.v.scaledBy(deltaT));
            particle.v.add(particle.f.scaledBy(deltaT / particle.m));
        }
    };
    return ParticleSimulation;
}());
function main() {
    function attraction(particles) {
        var n = particles.length;
        var G = 100.0;
        for (var i = 0; i < n; i++) {
            for (var j = i + 1; j < n; j++) {
                var pi = particles[i];
                var pj = particles[j];
                // Vector from i to j
                var i2j = pj.p.minus(pi.p);
                var r2 = i2j.length2();
                var f = (G * pi.m * pj.m) / r2;
                i2j.scale(f);
                pi.f.add(i2j);
                pj.f.subtract(i2j);
            }
        }
    }
    function drag(particles) {
        var dragCoeff = 0.1; // N/(m/s)
        for (var _i = 0, particles_1 = particles; _i < particles_1.length; _i++) {
            var particle = particles_1[_i];
            var drag_1 = particle.v.clone();
            drag_1.scale(dragCoeff);
            particle.f.subtract(drag_1);
        }
    }
    var particles = [];
    var width = 1000;
    var height = 1000;
    var n = 1000;
    for (var i = 0; i < n; i++) {
        var p = new Vec2(Math.random() * width, Math.random() * height);
        var v = new Vec2(0, 0);
        var m = 1.0;
        particles.push(new Particle(p, v, m));
    }
    var simulation = new ParticleSimulation(particles, [attraction, drag]);
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    function draw(particles) {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "white";
        for (var i = 0, ii = particles.length; i < ii; i++) {
            var particle = particles[i];
            ctx.fillRect(particle.p.x, particle.p.y, 1, 1);
        }
    }
    function tick() {
        var deltaT = 1 / 60.0;
        simulation.step(deltaT);
        draw(particles);
        requestAnimationFrame(tick);
    }
    tick();
}
document.addEventListener('DOMContentLoaded', main);
