/* In-page controls only. The portfolio owns the sole cube, scene and renderer. */
(() => {
    let panel = null;
    const send = (type, detail = {}) => window.dispatchEvent(new CustomEvent("portfolio-game-command", { detail: { type, ...detail } }));
    function build() {
        panel = document.createElement("section");
        panel.className = "cube-game-panel";
        panel.hidden = true;
        panel.setAttribute("aria-label", "Cube puzzle controls");
        panel.innerHTML = `<div class="game-bar"><button type="button" data-game="back">← BACK TO WORK</button><strong>SOLVE THE CUBE</strong><span class="game-stats">TIME <output class="game-time">00:00.0</output> · MOVES <output class="game-moves">0</output></span></div><p class="game-status" role="status" aria-live="polite">Your first turn starts the timer.</p><div class="game-turns" aria-label="Turn a layer"></div><div class="game-footer"><p>Mouse: drag to look, click a face to turn. Mobile: hold briefly, then drag to look around. Swipe a row to turn it.<br>Keys: Q left · W up · E right · A front · S down · D back. Shift reverses.</p><div><button type="button" data-game="shuffle">NEW SCRAMBLE</button><button type="button" data-game="reset">RESTART</button><button type="button" data-game="view">RESET VIEW</button></div></div>`;
        for (const [key, face] of Object.entries({ Q: "L", W: "U", E: "R", A: "F", S: "D", D: "B" })) {
            const spec = window.PortfolioCubeGameModel.faces[face];
            const row = document.createElement("div");
            row.className = "game-face-control";
            const label = document.createElement("span");
            label.textContent = spec.name;
            label.style.setProperty("--face-color", spec.color);
            row.appendChild(label);
            for (const inverse of [false, true]) {
                const b = document.createElement("button");
                b.type = "button";
                b.textContent = key + (inverse ? " \u21B6" : " \u21B7");
                b.className = "game-turn";
                b.setAttribute("aria-label", `${spec.name} ${inverse ? "anticlockwise" : "clockwise"}`);
                b.onclick = () => send("turn", { face, inverse });
                row.appendChild(b);
            }
            panel.querySelector(".game-turns").appendChild(row);
        }
        panel.querySelectorAll("[data-game]").forEach(b => b.onclick = () => send(b.dataset.game));
        document.querySelector("#home .cube-home").appendChild(panel);
    }
    window.PortfolioCubeGame = {
        open() { if (!panel)
            build(); send("enter"); },
        show() { panel.hidden = false; document.querySelector("#home .cube-home").classList.add("game-playing"); },
        hide() { if (panel)
            panel.hidden = true; document.querySelector("#home .cube-home").classList.remove("game-playing"); },
        update({ elapsed, moves, busy, solved }) {
            if (!panel)
                return;
            const tenths = Math.floor(elapsed / 100);
            const clock = `${String(Math.floor(tenths / 600)).padStart(2, "0")}:${String(Math.floor(tenths / 10) % 60).padStart(2, "0")}.${tenths % 10}`;
            panel.querySelector(".game-time").textContent = clock;
            panel.querySelector(".game-moves").textContent = moves;
            const message = solved ? `Solved in ${clock} with ${moves} moves!` : moves || elapsed ? "Match all six faces." : "Your first turn starts the timer.";
            const status = panel.querySelector(".game-status");
            if (status.textContent !== message)
                status.textContent = message;
            panel.classList.toggle("game-solved", solved);
            panel.querySelectorAll(".game-turn").forEach(b => b.disabled = busy || solved);
        }
    };
})();
