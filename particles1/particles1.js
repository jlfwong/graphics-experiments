var Vec2 = (function () {
    function Vec2(x, y) {
        this.x = x;
        this.y = y;
    }
    Vec2.prototype.plus = function (other) { return new Vec2(this.x + other.x, this.y + other.y); };
    Vec2.prototype.minus = function (other) { return new Vec2(this.x - other.x, this.y - other.y); };
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
        // TODO(jlfwong): This doesn't handle the particles length changing
        this.s = new Float32Array(particles.length * 4);
        this.sPrime = new Float32Array(particles.length * 4);
    }
    ParticleSimulation.prototype.clearForces = function () {
        for (var _i = 0, _a = this.particles; _i < _a.length; _i++) {
            var particle = _a[_i];
            particle.f.clear();
        }
    };
    ParticleSimulation.prototype.calculateForces = function () {
        var _this = this;
        this.forces.forEach(function (force) { return force(_this.particles); });
    };
    ParticleSimulation.prototype.calculateDerivatives = function () {
        this.clearForces();
        this.calculateForces();
    };
    ParticleSimulation.prototype.writeToStateArray = function () {
        var s = this.s;
        var index = 0;
        for (var _i = 0, _a = this.particles; _i < _a.length; _i++) {
            var particle = _a[_i];
            s[index++] = particle.p.x;
            s[index++] = particle.p.y;
            s[index++] = particle.v.x;
            s[index++] = particle.v.y;
        }
    };
    ParticleSimulation.prototype.readFromStateArray = function () {
        var s = this.s;
        var index = 0;
        for (var _i = 0, _a = this.particles; _i < _a.length; _i++) {
            var particle = _a[_i];
            particle.p.x = s[index++];
            particle.p.y = s[index++];
            particle.v.x = s[index++];
            particle.v.y = s[index++];
        }
    };
    ParticleSimulation.prototype.writeToDerivativeArray = function () {
        var sPrime = this.sPrime;
        var index = 0;
        for (var _i = 0, _a = this.particles; _i < _a.length; _i++) {
            var particle = _a[_i];
            sPrime[index++] = particle.v.x;
            sPrime[index++] = particle.v.y;
            sPrime[index++] = particle.f.x / particle.m;
            sPrime[index++] = particle.f.y / particle.m;
        }
    };
    ParticleSimulation.prototype.eulerStep = function (deltaT) {
        var s = this.s;
        var sPrime = this.sPrime;
        for (var i = 0, ii = s.length; i < ii; i++) {
            s[i] += sPrime[i] * deltaT;
        }
    };
    ParticleSimulation.prototype.step = function (deltaT) {
        var s = this.s;
        var sPrime = this.sPrime;
        var n = this.particles.length;
        this.calculateDerivatives();
        this.writeToStateArray();
        this.writeToDerivativeArray();
        this.eulerStep(deltaT);
        this.readFromStateArray();
    };
    return ParticleSimulation;
}());
function main() {
    function attraction(particles) {
        var n = particles.length;
        var G = 10.0;
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
    var particles = [];
    var width = 400;
    var height = 400;
    var n = 2000;
    for (var i = 0; i < n; i++) {
        var p = new Vec2(Math.random() * width, Math.random() * height);
        var v = new Vec2(0, 0);
        var m = 1.0;
        particles.push(new Particle(p, v, m));
    }
    var simulation = new ParticleSimulation(particles, [attraction]);
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    function draw(particles) {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "black";
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
