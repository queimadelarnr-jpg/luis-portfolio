/* Integer cube state, independent of rendering and portfolio navigation. */
(function (root) {
    "use strict";
    const faces = {
        R: { axis: 0, layer: 1, sign: -1, color: "#e73d35", name: "Right \u00B7 red" },
        L: { axis: 0, layer: -1, sign: 1, color: "#ff922e", name: "Left \u00B7 orange" },
        U: { axis: 1, layer: 1, sign: -1, color: "#f5f3eb", name: "Up \u00B7 white" },
        D: { axis: 1, layer: -1, sign: 1, color: "#ffd83d", name: "Down \u00B7 yellow" },
        F: { axis: 2, layer: 1, sign: -1, color: "#20ad71", name: "Front \u00B7 green" },
        B: { axis: 2, layer: -1, sign: 1, color: "#3285eb", name: "Back \u00B7 blue" }
    };
    function rotate(v, axis, sign) {
        const [x, y, z] = v;
        return axis === 0 ? [x, -sign * z, sign * y] : axis === 1 ? [sign * z, y, -sign * x] : [-sign * y, sign * x, z];
    }
    class Cube {
        constructor() { this.reset(); }
        reset() {
            this.pieces = [];
            for (let x = -1; x <= 1; x++)
                for (let y = -1; y <= 1; y++)
                    for (let z = -1; z <= 1; z++) {
                        const pos = [x, y, z], stickers = [];
                        for (const [face, spec] of Object.entries(faces))
                            if (pos[spec.axis] === spec.layer) {
                                const normal = [0, 0, 0];
                                normal[spec.axis] = spec.layer;
                                stickers.push({ face, normal });
                            }
                        this.pieces.push({ pos, stickers });
                    }
        }
        turn(face, inverse = false) {
            const spec = faces[face];
            if (!spec)
                throw new Error("Unknown face");
            this.turnLayer(spec.axis, spec.layer, spec.sign * (inverse ? -1 : 1));
        }
        turnLayer(axis, layer, sign) {
            for (const piece of this.pieces)
                if (piece.pos[axis] === layer) {
                    piece.pos = rotate(piece.pos, axis, sign);
                    for (const sticker of piece.stickers)
                        sticker.normal = rotate(sticker.normal, axis, sign);
                }
        }
        solved() {
            const colors = new Map();
            return this.pieces.every(p => p.stickers.every(s => {
                const key = s.normal.join(",");
                if (!colors.has(key))
                    colors.set(key, s.face);
                return colors.get(key) === s.face;
            }));
        }
    }
    class Session {
        constructor() { this.cube = new Cube(); this.scramble = []; this.reset(); }
        shuffle(random = Math.random) {
            const keys = Object.keys(faces);
            this.scramble = [];
            let lastAxis = -1;
            for (let i = 0; i < 22; i++) {
                const options = keys.filter(k => faces[k].axis !== lastAxis);
                const face = options[Math.floor(random() * options.length)];
                this.scramble.push({ face, inverse: random() < .5 });
                lastAxis = faces[face].axis;
            }
            this.reset();
        }
        reset() { this.cube.reset(); for (const m of this.scramble)
            this.cube.turn(m.face, m.inverse); this.startedAt = null; this.finishedAt = null; this.moves = 0; }
        start(now) { if (this.finishedAt !== null)
            return false; if (this.startedAt === null)
            this.startedAt = now; return true; }
        commit(face, inverse, now) { this.cube.turn(face, inverse); this.moves++; if (this.cube.solved())
            this.finishedAt = now; }
        commitLayer(axis, layer, sign, now) { this.cube.turnLayer(axis, layer, sign); this.moves++; if (this.cube.solved())
            this.finishedAt = now; }
        elapsed(now) { return this.startedAt === null ? 0 : Math.max(0, (this.finishedAt ?? now) - this.startedAt); }
    }
    const api = { faces, Cube, Session };
    if (typeof module === "object" && module.exports)
        module.exports = api;
    else
        root.PortfolioCubeGameModel = api;
})(typeof window !== "undefined" ? window : globalThis);
