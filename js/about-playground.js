/* =========================================
   ABOUT — portrait drag and anchored letters
========================================= */
(() => {
    const page = document.querySelector(".about-playground");
    if (!page) return;

    const scene = page.querySelector(".about-scene");
    const portrait = page.querySelector(".about-portrait");
    const clearButton = page.querySelector(".about-clear-text");
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const letters = [];
    const photo = { x: 0, y: 0, tilt: 0, targetTilt: 0 };
    let placed = false;
    let drag = null;
    let frame = 0;
    let previousTime = 0;

    // Keep a normal paragraph for screen readers. The visual copy is split
    // into words so line breaks never cut a word into individual letters.
    page.querySelectorAll(".about-paragraph").forEach(paragraph => {
        const text = paragraph.textContent.trim();
        const readable = document.createElement("span");
        readable.className = "about-readable";
        readable.textContent = text;
        const visual = document.createElement("span");
        visual.setAttribute("aria-hidden", "true");

        text.split(/(\s+)/).forEach(word => {
            if (/^\s+$/.test(word)) {
                visual.appendChild(document.createTextNode(word));
                return;
            }
            const wordElement = document.createElement("span");
            wordElement.className = "about-word";
            Array.from(word).forEach(character => {
                const element = document.createElement("span");
                element.className = "about-letter";
                element.textContent = character;
                wordElement.appendChild(element);
                letters.push({ element, homeX: 0, homeY: 0, x: 0, y: 0, vx: 0, vy: 0 });
            });
            visual.appendChild(wordElement);
        });
        paragraph.replaceChildren(readable, visual);
    });

    function clamp(value, low, high) {
        return Math.max(low, Math.min(value, Math.max(low, high)));
    }

    function keepPhotoInside() {
        photo.x = clamp(photo.x, 12, scene.clientWidth - portrait.offsetWidth - 12);
        photo.y = clamp(photo.y, 12, scene.scrollHeight - portrait.offsetHeight - 12);
    }

    function wake() {
        if (!frame) frame = requestAnimationFrame(animate);
    }

    // Measure the original letter positions only after layout changes.
    // Transforms move their appearance without disturbing paragraph layout.
    function measure() {
        if (!page.classList.contains("page-visible") || !scene.clientWidth) return;
        const bounds = scene.getBoundingClientRect();
        letters.forEach(letter => {
            const box = letter.element.getBoundingClientRect();
            letter.homeX = box.left - bounds.left + box.width / 2 - letter.x;
            letter.homeY = box.top - bounds.top + box.height / 2 - letter.y;
        });
        if (!placed) {
            const firstParagraph = page.querySelector(".about-paragraph").getBoundingClientRect();
            photo.x = scene.clientWidth - portrait.offsetWidth - 30;
            photo.y = firstParagraph.top - bounds.top - 16;
            placed = true;
        }
        keepPhotoInside();
        wake();
    }

    // Each letter has its own spring. A small, bounded displacement keeps
    // the paragraph readable while the portrait nudges nearby characters.
    function displacement(letter) {
        if (reducedMotion.matches) return { x: 0, y: 0 };
        const width = portrait.offsetWidth;
        const height = portrait.offsetHeight;
        const dx = letter.homeX - (photo.x + width / 2);
        const dy = letter.homeY - (photo.y + height / 2);
        const outsideX = Math.max(0, Math.abs(dx) - width / 2);
        const outsideY = Math.max(0, Math.abs(dy) - height / 2);
        const distance = Math.hypot(outsideX, outsideY);
        if (distance >= 44) return { x: 0, y: 0 };
        const strength = 30 * (1 - distance / 44);
        if (width / 2 - Math.abs(dx) < height / 2 - Math.abs(dy)) {
            return { x: (dx < 0 ? -1 : 1) * strength, y: 0 };
        }
        return { x: 0, y: (dy < 0 ? -1 : 1) * strength };
    }

    function animate(time) {
        frame = 0;
        if (!page.classList.contains("page-visible")) {
            previousTime = 0;
            return;
        }
        const step = previousTime ? Math.min((time - previousTime) / 16.67, 2) : 1;
        previousTime = time;
        photo.tilt += (photo.targetTilt - photo.tilt) * 0.15;
        portrait.style.transform = `translate(${photo.x}px, ${photo.y}px) rotate(${photo.tilt}deg)`;
        let moving = Math.abs(photo.targetTilt - photo.tilt) > 0.02;

        letters.forEach(letter => {
            const target = displacement(letter);
            const damping = Math.pow(0.76, step);
            letter.vx = (letter.vx + (target.x - letter.x) * 0.12 * step) * damping;
            letter.vy = (letter.vy + (target.y - letter.y) * 0.12 * step) * damping;
            letter.x += letter.vx * step;
            letter.y += letter.vy * step;
            const unsettled = Math.abs(target.x - letter.x) + Math.abs(target.y - letter.y) + Math.abs(letter.vx) + Math.abs(letter.vy) > 0.05;
            if (reducedMotion.matches || !unsettled) {
                letter.x = target.x;
                letter.y = target.y;
                letter.vx = letter.vy = 0;
            }
            letter.element.style.transform = `translate(${letter.x}px, ${letter.y}px)`;
            moving ||= unsettled && !reducedMotion.matches;
        });
        if (moving) wake();
        else previousTime = 0;
    }

    portrait.addEventListener("pointerdown", event => {
        if (drag || (event.pointerType === "mouse" && event.button !== 0)) return;
        measure();
        drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: photo.x, startY: photo.y };
        portrait.setPointerCapture(event.pointerId);
        event.preventDefault();
        portrait.focus({ preventScroll: true });
    });

    portrait.addEventListener("pointermove", event => {
        if (drag && drag.id === event.pointerId) {
            photo.x = drag.startX + event.clientX - drag.x;
            photo.y = drag.startY + event.clientY - drag.y;
            photo.targetTilt = reducedMotion.matches ? 0 : clamp((event.clientX - drag.x) / 35, -5, 5);
            keepPhotoInside();
            wake();
        } else if (!drag && event.pointerType === "mouse") {
            const box = portrait.getBoundingClientRect();
            photo.targetTilt = reducedMotion.matches ? 0 : ((event.clientX - box.left) / box.width - 0.5) * 6;
            wake();
        }
    });

    function release(event) {
        if (!drag || event.pointerId !== drag.id) return;
        drag = null;
        photo.targetTilt = 0;
        if (portrait.hasPointerCapture(event.pointerId)) portrait.releasePointerCapture(event.pointerId);
        wake();
    }
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(type => portrait.addEventListener(type, release));
    portrait.addEventListener("pointerleave", () => {
        if (!drag) { photo.targetTilt = 0; wake(); }
    });

    // Keyboard users can move the portrait too, or park it below the copy.
    function clearText() {
        measure();
        photo.x = scene.clientWidth - portrait.offsetWidth - 24;
        photo.y = clearButton.offsetTop + clearButton.offsetHeight + 20;
        keepPhotoInside();
        photo.targetTilt = 0;
        wake();
    }
    clearButton.addEventListener("click", clearText);
    portrait.addEventListener("keydown", event => {
        const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        const direction = directions[event.key];
        if (!direction) return;
        event.preventDefault();
        photo.x += direction[0] * (event.shiftKey ? 40 : 16);
        photo.y += direction[1] * (event.shiftKey ? 40 : 16);
        keepPhotoInside();
        wake();
    });
    portrait.addEventListener("click", event => { if (event.detail === 0) clearText(); });
    new ResizeObserver(measure).observe(scene);
    new MutationObserver(measure).observe(page, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("about-open", measure);
    reducedMotion.addEventListener("change", () => { photo.targetTilt = 0; wake(); });
    document.fonts.ready.then(measure);
    portrait.querySelector("img").addEventListener("load", measure);
})();
