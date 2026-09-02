const cursorBall = document.querySelector(".cursor-ball");

/* =========================================
   TOUCH DETECTION
========================================= */

const isTouchDevice = window.matchMedia(
    "(hover: none), (pointer: coarse)"
).matches;

/* =========================================
   CURSOR — position + hover state
========================================= */

if (!isTouchDevice && cursorBall) {
    let mouseX = 0;
    let mouseY = 0;

    let ballX = 0;
    let ballY = 0;

    window.addEventListener("mousemove", event => {
        mouseX = event.clientX;
        mouseY = event.clientY;
    });

    function animateCursor() {
        ballX += (mouseX - ballX) * 0.35;
        ballY += (mouseY - ballY) * 0.35;

        cursorBall.style.transform =
            `translate3d(${ballX}px, ${ballY}px, 0) translate(-50%, -50%)`;

        requestAnimationFrame(animateCursor);
    }

    animateCursor();

    const HOVER_SELECTOR =
        "a, button, input, select, textarea, label, img, h1, " +
        ".available, .menu-item, .marquee-track span";

    document.addEventListener("mouseover", event => {
        const target = event.target.closest(HOVER_SELECTOR);

        if (!target) return;

        cursorBall.classList.add("active");
    });

    document.addEventListener("mouseout", event => {
        const target = event.target.closest(HOVER_SELECTOR);

        if (!target) return;
        if (target.contains(event.relatedTarget)) return;

        cursorBall.classList.remove("active");
    });
} else if (cursorBall) {
    cursorBall.style.display = "none";
}

/* =========================================
   MARQUEE
========================================= */

const marqueeRows = document.querySelectorAll(".marquee-track");
const marqueeSpeed = 0.6;

let scrollDirection = 1;
let lastScrollY = window.scrollY;

const marqueeStates = new Map();

window.addEventListener("scroll", () => {
    const currentScrollY = window.scrollY;

    if (currentScrollY > lastScrollY) {
        scrollDirection = 1;
    } else if (currentScrollY < lastScrollY) {
        scrollDirection = -1;
    }

    lastScrollY = currentScrollY;
}, { passive: true });

function setupMarquee(track) {
    const groups = track.querySelectorAll(".marquee-group");

    const firstGroup = groups[0];
    const secondGroup = groups[1];

    if (!firstGroup || !secondGroup) return;

    const isReverse = track.classList.contains("reverse");

    firstGroup.innerHTML = "";
    secondGroup.innerHTML = "";

    const text = " WEB DESIGNER×";

    while (firstGroup.scrollWidth < window.innerWidth * 1.5) {
        const span = document.createElement("span");

        span.textContent = text;
        firstGroup.appendChild(span);
    }

    firstGroup.querySelectorAll("span").forEach(span => {
        secondGroup.appendChild(span.cloneNode(true));
    });

    const loopWidth = firstGroup.getBoundingClientRect().width;
    const initialX = isReverse ? -loopWidth : 0;

    marqueeStates.set(track, {
        x: initialX,
        loopWidth,
        baseDirection: isReverse ? -1 : 1
    });

    track.style.transform = `translate3d(${initialX}px, 0, 0)`;
}

function setupAllMarquees() {
    marqueeRows.forEach(track => {
        setupMarquee(track);
    });
}

setupAllMarquees();

let resizeTimer;

window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);

    resizeTimer = window.setTimeout(() => {
        setupAllMarquees();
    }, 150);
});

function animateMarquee() {
    marqueeRows.forEach(track => {
        const state = marqueeStates.get(track);

        if (!state || !state.loopWidth) return;

        state.x +=
            marqueeSpeed *
            scrollDirection *
            state.baseDirection;

        if (state.x <= -state.loopWidth) {
            state.x += state.loopWidth;
        }

        if (state.x >= 0) {
            state.x -= state.loopWidth;
        }

        track.style.transform =
            `translate3d(${state.x}px, 0, 0)`;
    });

    requestAnimationFrame(animateMarquee);
}

animateMarquee();

/* =========================================
   HERO — WOVEN PORTRAIT INTERACTION
========================================= */

const heroMarquee = document.querySelector(".marquee-wrap");
const wovenPhoto = document.querySelector(".woven-photo");

const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
);

let heroInteractionLocked = false;
let lastHeroPointerTrigger = 0;

function untangleHero() {
    if (
        !heroMarquee ||
        !wovenPhoto ||
        heroInteractionLocked ||
        reducedMotion.matches
    ) {
        return;
    }

    heroInteractionLocked = true;

    /*
     * Removing the class and forcing a browser reflow
     * ensures that the animation restarts correctly.
     */
    wovenPhoto.classList.remove("is-untangling");
    void wovenPhoto.offsetWidth;
    wovenPhoto.classList.add("is-untangling");

    /*
     * The staggered column animation takes approximately
     * 2.05 seconds to finish.
     */
    window.setTimeout(() => {
        wovenPhoto.classList.remove("is-untangling");

        /*
         * Five-second downtime starts once the animation
         * has completely finished.
         */
        window.setTimeout(() => {
            heroInteractionLocked = false;
        }, 5000);
    }, 2050);
}

if (heroMarquee && wovenPhoto && !isTouchDevice) {
    heroMarquee.addEventListener(
        "pointerenter",
        untangleHero
    );

    /*
     * This makes it possible to trigger the animation again
     * after the cooldown, even when the pointer stayed inside
     * the hero section.
     */
    heroMarquee.addEventListener("pointermove", () => {
        const now = performance.now();

        if (now - lastHeroPointerTrigger < 250) {
            return;
        }

        lastHeroPointerTrigger = now;
        untangleHero();
    });
}

/* =========================================
   MENU — expanding fill and page switch
========================================= */

const menuItems = document.querySelectorAll(
    ".menu-item[data-page]"
);

const menuNav = document.querySelector(".menu");
const menuToggle = document.querySelector(".menu-toggle");
const menuBack = document.querySelector(".menu-back");

function closeMobileMenu() {
    if (!menuNav || !menuToggle) return;

    menuNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");

    document.body.style.overflow = "";
}

menuItems.forEach(item => {
    item.addEventListener("click", event => {
        if (item.classList.contains("active")) return;

        const rect = item.getBoundingClientRect();

        const fx =
            ((event.clientX - rect.left) / rect.width) * 100;

        const fy =
            ((event.clientY - rect.top) / rect.height) * 100;

        item.style.setProperty("--fx", `${fx}%`);
        item.style.setProperty("--fy", `${fy}%`);

        item.classList.add("expanding");

        const fill = item.querySelector(".menu-fill");

        if (!fill) {
            finishPageSwitch();
            return;
        }

        fill.addEventListener(
            "transitionend",
            finishPageSwitch,
            { once: true }
        );

        function finishPageSwitch() {
            menuItems.forEach(otherItem => {
                otherItem.classList.remove(
                    "active",
                    "expanding"
                );

                otherItem.style.removeProperty("--fx");
                otherItem.style.removeProperty("--fy");
            });

            item.classList.add("active");

            switchPage(item.dataset.page);

            if (
                menuNav &&
                menuNav.classList.contains("open")
            ) {
                closeMobileMenu();
            }
        }
    });
});

function switchPage(pageName) {
    const pages = document.querySelectorAll(".page");

    pages.forEach(page => {
        page.classList.toggle(
            "page-visible",
            page.dataset.page === pageName
        );
    });

    if (pageName === "about") {
        window.setTimeout(triggerAboutEntrance, 100);
    }

    if (pageName === "work") {
        closeProjectDetail();
    }
}

/* =========================================
   HEADER NAME — home link and letter reels
========================================= */

const homeTitleLink = document.querySelector(
    ".home-title-link"
);

const nameSlotCanAnimate = window.matchMedia(
    "(min-width: 901px) and (hover: hover) and (pointer: fine)"
);

const nameSlotReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
);

const nameSlotGlyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const nameSlotDurations = [
    42,
    50,
    62,
    78,
    100,
    132,
    175,
    235,
    320
];

let nameSlotLocked = false;
let nameSlotSessionActive = false;
let nameSlotPointerInside = false;
let nameSlotIdleTimer = null;
let nameSlotCooldownTimer = null;
const nameSlotSessionLetters = new Set();
const nameSlotRunningAnimations = new Set();

function measureNameLetters() {
    if (!homeTitleLink) return;

    homeTitleLink
        .querySelectorAll(".name-letter")
        .forEach(letter => {
            letter.style.width = "auto";

            const width = letter
                .querySelector(".name-letter-value")
                ?.getBoundingClientRect().width;

            if (width) {
                letter.style.width = `${width}px`;
            }
        });
}

function setupNameLetters() {
    if (!homeTitleLink) return;

    const name = homeTitleLink.textContent
        .trim()
        .toUpperCase();

    const fragment = document.createDocumentFragment();

    Array.from(name).forEach(character => {
        if (character === " ") {
            const space = document.createElement("span");
            space.className = "name-space";
            space.textContent = "\u00a0";
            space.setAttribute("aria-hidden", "true");
            fragment.append(space);
            return;
        }

        const letter = document.createElement("span");
        const value = document.createElement("span");

        letter.className = "name-letter";
        letter.dataset.original = character;
        letter.setAttribute("aria-hidden", "true");

        value.className = "name-letter-value";
        value.textContent = character;

        letter.append(value);
        fragment.append(letter);
    });

    homeTitleLink.replaceChildren(fragment);
    measureNameLetters();

    document.fonts?.ready.then(measureNameLetters);
}

function randomNameGlyph(currentCharacter) {
    let nextCharacter = currentCharacter;

    while (nextCharacter === currentCharacter) {
        nextCharacter = nameSlotGlyphs[
            Math.floor(Math.random() * nameSlotGlyphs.length)
        ];
    }

    return nextCharacter;
}

function rollNameLetter(letter, fromCharacter, toCharacter, duration) {
    return new Promise(resolve => {
        const reel = document.createElement("span");
        const current = document.createElement("span");
        const next = document.createElement("span");

        reel.className = "name-letter-reel";
        current.textContent = fromCharacter;
        next.textContent = toCharacter;
        reel.append(current, next);
        letter.replaceChildren(reel);

        const animation = reel.animate(
            [
                { transform: "translateY(0)" },
                { transform: "translateY(-50%)" }
            ],
            {
                duration,
                easing: "cubic-bezier(.45, 0, .55, 1)",
                fill: "forwards"
            }
        );

        animation.finished
            .catch(() => {})
            .finally(() => {
                const value = document.createElement("span");
                value.className = "name-letter-value";
                value.textContent = toCharacter;
                letter.replaceChildren(value);
                resolve();
            });
    });
}

async function animateNameLetter(letter) {
    if (
        !nameSlotCanAnimate.matches ||
        nameSlotReducedMotion.matches
    ) {
        return;
    }

    const originalCharacter = letter.dataset.original;
    let currentCharacter = originalCharacter;

    for (let index = 0; index < nameSlotDurations.length; index += 1) {
        const isFinalRoll =
            index === nameSlotDurations.length - 1;

        const nextCharacter = isFinalRoll
            ? originalCharacter
            : randomNameGlyph(currentCharacter);

        await rollNameLetter(
            letter,
            currentCharacter,
            nextCharacter,
            nameSlotDurations[index]
        );

        currentCharacter = nextCharacter;
    }
}

function beginNameSlotSession() {
    if (
        nameSlotLocked ||
        !nameSlotCanAnimate.matches ||
        nameSlotReducedMotion.matches
    ) {
        return false;
    }

    if (!nameSlotSessionActive) {
        nameSlotSessionActive = true;
        nameSlotSessionLetters.clear();
    }

    window.clearTimeout(nameSlotIdleTimer);
    return true;
}

function finishNameSlotSession() {
    if (
        !nameSlotSessionActive ||
        nameSlotRunningAnimations.size > 0
    ) {
        return;
    }

    nameSlotSessionActive = false;
    nameSlotLocked = true;
    nameSlotSessionLetters.clear();

    window.clearTimeout(nameSlotCooldownTimer);
    nameSlotCooldownTimer = window.setTimeout(() => {
        nameSlotLocked = false;
    }, 8000);
}

function scheduleNameSlotSessionEnd() {
    window.clearTimeout(nameSlotIdleTimer);

    const delay = nameSlotPointerInside ? 700 : 0;

    nameSlotIdleTimer = window.setTimeout(() => {
        finishNameSlotSession();
    }, delay);
}

setupNameLetters();

homeTitleLink?.addEventListener("pointerenter", () => {
    nameSlotPointerInside = true;
});

homeTitleLink?.addEventListener("pointerover", event => {
    const letter = event.target.closest(".name-letter");
    if (!letter || !homeTitleLink.contains(letter)) return;
    if (!beginNameSlotSession()) return;
    if (nameSlotSessionLetters.has(letter)) return;

    nameSlotSessionLetters.add(letter);

    const runningAnimation = animateNameLetter(letter);
    nameSlotRunningAnimations.add(runningAnimation);

    runningAnimation.finally(() => {
        nameSlotRunningAnimations.delete(runningAnimation);
        scheduleNameSlotSessionEnd();
    });
});

homeTitleLink?.addEventListener("pointerleave", () => {
    nameSlotPointerInside = false;
    scheduleNameSlotSessionEnd();
});

homeTitleLink?.addEventListener("click", event => {
    event.preventDefault();

    const homeMenuItem = Array
        .from(menuItems)
        .find(item => item.dataset.page === "home");

    menuItems.forEach(item => {
        item.classList.remove("active", "expanding");
        item.style.removeProperty("--fx");
        item.style.removeProperty("--fy");
    });

    homeMenuItem?.classList.add("active");
    switchPage("home");

    if (menuNav?.classList.contains("open")) {
        closeMobileMenu();
    }
});

/* =========================================
   WORK — cards and project details
========================================= */

const workProjects =
    document.querySelector(".work-projects");

const workCards = document.querySelectorAll(
    ".work-card[data-project]"
);

const projectDetails = document.querySelectorAll(
    ".project-detail[data-project]"
);

const projectBackButtons = document.querySelectorAll(
    ".project-back"
);

let workTransitionTimer = null;
const workTransitionDuration = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
).matches ? 0 : 900;

function revealProjectDetail(selectedProject) {
    if (!workProjects) return;

    workProjects.hidden = true;
    workProjects.classList.remove(
        "is-transitioning",
        "exit-left",
        "exit-right"
    );

    workCards.forEach(card => {
        card.disabled = false;
    });

    projectDetails.forEach(detail => {
        detail.classList.remove("is-open");
    });

    selectedProject.classList.add("is-open");

    const workInner =
        selectedProject.closest(".work-inner");

    workInner?.scrollTo({
        top: 0,
        behavior: "auto"
    });

    selectedProject
        .querySelector(".project-back")
        ?.focus();
}

function openProjectDetail(projectName, sourceCard) {
    const selectedProject = Array
        .from(projectDetails)
        .find(detail => {
            return detail.dataset.project === projectName;
        });

    if (!selectedProject || !workProjects) return;

    if (workProjects.classList.contains("is-transitioning")) return;

    const sourceIndex = Array
        .from(workCards)
        .indexOf(sourceCard);

    const exitDirection =
        sourceIndex === 1 ? "exit-right" : "exit-left";

    workProjects.classList.add(
        "is-transitioning",
        exitDirection
    );

    workCards.forEach(card => {
        card.disabled = true;
    });

    window.clearTimeout(workTransitionTimer);
    workTransitionTimer = window.setTimeout(() => {
        revealProjectDetail(selectedProject);
        workTransitionTimer = null;
    }, workTransitionDuration);
}

function closeProjectDetail() {
    if (!workProjects) return;

    window.clearTimeout(workTransitionTimer);
    workTransitionTimer = null;

    workProjects.classList.remove(
        "is-transitioning",
        "exit-left",
        "exit-right"
    );

    workCards.forEach(card => {
        card.disabled = false;
    });

    const openProject = document.querySelector(
        ".project-detail.is-open"
    );

    const projectName = openProject?.dataset.project;

    projectDetails.forEach(detail => {
        detail.classList.remove("is-open");
    });

    workProjects.hidden = false;

    const workInner =
        workProjects.closest(".work-inner");

    workInner?.scrollTo({
        top: 0,
        behavior: "auto"
    });

    if (projectName) {
        document
            .querySelector(
                `.work-card[data-project="${projectName}"]`
            )
            ?.focus();
    }
}

workCards.forEach(card => {
    card.addEventListener("click", () => {
        openProjectDetail(card.dataset.project, card);
    });
});

projectBackButtons.forEach(button => {
    button.addEventListener(
        "click",
        closeProjectDetail
    );
});

document.addEventListener("keydown", event => {
    const openProject = document.querySelector(
        ".project-detail.is-open"
    );

    if (event.key === "Escape" && openProject) {
        closeProjectDetail();
    }
});

/* =========================================
   MOBILE MENU
========================================= */

if (menuToggle && menuNav) {
    menuToggle.addEventListener("click", () => {
        const isOpen =
            menuNav.classList.toggle("open");

        menuToggle.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

        document.body.style.overflow =
            isOpen ? "hidden" : "";
    });
}

if (menuBack) {
    menuBack.addEventListener(
        "click",
        closeMobileMenu
    );
}

/* =========================================
   ABOUT — line entrance and scroll focus
========================================= */

const aboutMe = document.querySelector(".about_me");
const aboutText = document.querySelector(".about-text");

const aboutLines = document.querySelectorAll(
    ".about_me .line"
);

const aboutContentLines = Array
    .from(aboutLines)
    .filter(line => {
        return line.textContent.trim().length > 0;
    });

const aboutMobileLayout = window.matchMedia(
    "(max-width: 900px)"
);

aboutContentLines.forEach((line, index) => {
    line.style.setProperty(
        "--enter-delay",
        `${0.05 + index * 0.07}s`
    );
});

let focusedAboutIndex = 0;
let aboutWheelLocked = false;
let aboutWheelTotal = 0;
let aboutTouchStartY = null;
let aboutTouchFocusY = null;
let aboutScrollTimer = null;
let aboutFocusFrame = null;

function keepAboutLineVisible(line, behavior = "smooth") {
    if (!aboutMe || !line) return;

    const containerRect = aboutMe.getBoundingClientRect();
    const lineRect = line.getBoundingClientRect();
    const edgeSpace = 12;
    const visibleTop = containerRect.top + edgeSpace;
    const visibleBottom = containerRect.bottom - edgeSpace;
    let difference = 0;

    if (lineRect.top < visibleTop) {
        difference = lineRect.top - visibleTop;
    } else if (lineRect.bottom > visibleBottom) {
        difference = lineRect.bottom - visibleBottom;
    }

    if (Math.abs(difference) > 1) {
        aboutMe.scrollTo({
            top: aboutMe.scrollTop + difference,
            behavior
        });
    }
}

function scheduleAboutLineScroll(line) {
    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
            keepAboutLineVisible(line);
        });
    });

    window.clearTimeout(aboutScrollTimer);
    aboutScrollTimer = window.setTimeout(() => {
        keepAboutLineVisible(line);
    }, 720);
}

function setAboutFocus(index, keepVisible = true) {
    const safeIndex = Math.max(0, Math.min(index, aboutContentLines.length - 1));

    if (safeIndex === focusedAboutIndex && aboutContentLines[safeIndex]?.classList.contains("in-focus")) {
        return;
    }

    focusedAboutIndex = safeIndex;

    aboutContentLines.forEach((line, lineIndex) => {
        line.classList.toggle("in-focus", lineIndex === safeIndex);
    });

    if (keepVisible) {
        scheduleAboutLineScroll(aboutContentLines[safeIndex]);
    }
}

function updateMobileAboutFocus() {
    if (
        !aboutMe ||
        !aboutMobileLayout.matches ||
        !aboutContentLines.length
    ) {
        return;
    }

    const maximumScroll = Math.max(
        0,
        aboutMe.scrollHeight - aboutMe.clientHeight
    );

    if (
        aboutTouchFocusY === null &&
        aboutMe.scrollTop <= 1
    ) {
        setAboutFocus(0, false);
        return;
    }

    if (
        aboutTouchFocusY === null &&
        maximumScroll > 0 &&
        aboutMe.scrollTop >= maximumScroll - 1
    ) {
        setAboutFocus(aboutContentLines.length - 1, false);
        return;
    }

    const containerRect = aboutMe.getBoundingClientRect();
    const focusPosition = aboutTouchFocusY ?? (
        containerRect.top + Math.min(
            containerRect.height * 0.3,
            150
        )
    );

    let nextFocusIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    aboutContentLines.forEach((line, lineIndex) => {
        const lineRect = line.getBoundingClientRect();
        let distance = 0;

        if (focusPosition < lineRect.top) {
            distance = lineRect.top - focusPosition;
        } else if (focusPosition > lineRect.bottom) {
            distance = focusPosition - lineRect.bottom;
        }

        if (distance < nearestDistance) {
            nearestDistance = distance;
            nextFocusIndex = lineIndex;
        }
    });

    setAboutFocus(nextFocusIndex, false);
}

function requestMobileAboutFocusUpdate() {
    if (!aboutMobileLayout.matches || aboutFocusFrame !== null) {
        return;
    }

    aboutFocusFrame = window.requestAnimationFrame(() => {
        aboutFocusFrame = null;
        updateMobileAboutFocus();
    });
}

function stepAboutFocus(direction) {
    const nextIndex = Math.max(
        0,
        Math.min(focusedAboutIndex + direction, aboutContentLines.length - 1)
    );

    if (nextIndex !== focusedAboutIndex) {
        setAboutFocus(nextIndex);
    }
}

if (aboutMe) {
    aboutMe.addEventListener("wheel", event => {
        if (aboutMobileLayout.matches) return;

        event.preventDefault();

        if (aboutWheelLocked) return;

        aboutWheelTotal += event.deltaY;

        if (Math.abs(aboutWheelTotal) < 18) return;

        stepAboutFocus(aboutWheelTotal > 0 ? 1 : -1);
        aboutWheelTotal = 0;
        aboutWheelLocked = true;

        window.setTimeout(() => {
            aboutWheelLocked = false;
        }, 520);
    }, { passive: false });

    aboutMe.addEventListener("keydown", event => {
        if (event.key === "ArrowDown" || event.key === "PageDown") {
            event.preventDefault();
            stepAboutFocus(1);
        }

        if (event.key === "ArrowUp" || event.key === "PageUp") {
            event.preventDefault();
            stepAboutFocus(-1);
        }
    });

    aboutMe.addEventListener("touchstart", event => {
        aboutTouchStartY = event.touches[0]?.clientY ?? null;

        if (aboutMobileLayout.matches) {
            aboutTouchFocusY = aboutTouchStartY;
            requestMobileAboutFocusUpdate();
        }
    }, { passive: true });

    aboutMe.addEventListener("touchmove", event => {
        if (!aboutMobileLayout.matches) return;

        aboutTouchFocusY =
            event.touches[0]?.clientY ?? aboutTouchFocusY;

        requestMobileAboutFocusUpdate();
    }, { passive: true });

    aboutMe.addEventListener("touchend", event => {
        if (aboutTouchStartY === null) return;

        const touchEndY = event.changedTouches[0]?.clientY ?? aboutTouchStartY;
        const distance = aboutTouchStartY - touchEndY;
        aboutTouchStartY = null;

        if (aboutMobileLayout.matches) {
            aboutTouchFocusY = touchEndY;
            requestMobileAboutFocusUpdate();
            return;
        }

        if (Math.abs(distance) >= 40) {
            stepAboutFocus(distance > 0 ? 1 : -1);
        }
    }, { passive: true });

    aboutMe.addEventListener(
        "scroll",
        requestMobileAboutFocusUpdate,
        { passive: true }
    );
}

function triggerAboutEntrance() {
    if (!aboutText || !aboutMe || !aboutContentLines.length) return;

    aboutMe.scrollTop = 0;
    aboutTouchFocusY = null;
    focusedAboutIndex = -1;
    setAboutFocus(0);
    aboutWheelTotal = 0;

    aboutText.classList.remove("entered");

    void aboutText.offsetWidth;

    aboutText.classList.add("entered");

}

/* =========================================
   ABOUT — changing eye slices
========================================= */

const aboutEyeSlices = document.querySelectorAll(
    ".about-eye-slice"
);

let aboutEyeSliceIndex = 0;

function cycleAboutEyeSlice() {
    if (aboutEyeSlices.length < 2) return;

    aboutEyeSlices[
        aboutEyeSliceIndex
    ].classList.remove("active");

    aboutEyeSliceIndex =
        (aboutEyeSliceIndex + 1) %
        aboutEyeSlices.length;

    aboutEyeSlices[
        aboutEyeSliceIndex
    ].classList.add("active");
}

if (aboutEyeSlices.length > 1) {
    window.setInterval(
        cycleAboutEyeSlice,
        3000
    );
}

/* =========================================
   CONNECT — desktop title split
========================================= */

const connectTitle = document.querySelector(
    ".connect-title"
);

const connectTitleCanAnimate = window.matchMedia(
    "(min-width: 901px) and (hover: hover) and (pointer: fine)"
);

const connectReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
);

let connectTitleLocked = false;

function createConnectTitleAnimation() {
    if (!connectTitle) return null;

    const titleRect = connectTitle.getBoundingClientRect();
    const viewportMiddle = window.innerWidth / 2;
    const characterData = [];

    Array.from(connectTitle.childNodes).forEach(node => {
        if (node.nodeType !== 3) return;

        Array.from(node.textContent).forEach((character, index) => {
            if (/\s/.test(character)) return;

            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + 1);

            const rect = range.getBoundingClientRect();
            range.detach();

            if (!rect.width || !rect.height) return;

            characterData.push({
                character,
                rect,
                center: rect.left + rect.width / 2
            });
        });
    });

    if (!characterData.length) return null;

    const apostrophes = characterData.filter(item => {
        return item.character === "'" || item.character === "’";
    });

    const leftCharacters = characterData
        .filter(item => {
            return !apostrophes.includes(item) && item.center < viewportMiddle;
        })
        .sort((a, b) => a.center - b.center);

    const rightCharacters = characterData
        .filter(item => {
            return !apostrophes.includes(item) && item.center >= viewportMiddle;
        })
        .sort((a, b) => b.center - a.center);

    leftCharacters.forEach((item, index) => {
        item.order = index;
        item.direction = -1;
    });

    rightCharacters.forEach((item, index) => {
        item.order = index;
        item.direction = 1;
    });

    const inwardOrder = Math.max(
        leftCharacters.length,
        rightCharacters.length
    );

    apostrophes.forEach(item => {
        item.order = inwardOrder;
        item.direction = 0;
        item.isApostrophe = true;
    });

    const horizontalDistance = Math.min(
        175,
        Math.max(90, window.innerWidth * 0.09)
    );

    const overlay = document.createElement("span");
    overlay.className = "connect-title-animation";
    overlay.setAttribute("aria-hidden", "true");

    characterData.forEach(item => {
        const letter = document.createElement("span");
        letter.className = "connect-title-letter";
        letter.textContent = item.character;

        letter.style.left = `${item.rect.left - titleRect.left}px`;
        letter.style.top = `${item.rect.top - titleRect.top}px`;
        letter.style.width = `${item.rect.width + 1}px`;
        letter.style.height = `${item.rect.height}px`;
        letter.style.lineHeight = `${item.rect.height}px`;

        letter.style.setProperty(
            "--connect-order",
            item.order
        );

        letter.style.setProperty(
            "--connect-x",
            `${item.direction * horizontalDistance}px`
        );

        letter.style.setProperty(
            "--connect-y",
            item.isApostrophe ? "1.05em" : "0px"
        );

        overlay.append(letter);
    });

    return {
        overlay,
        finalOrder: Math.max(
            ...characterData.map(item => item.order)
        )
    };
}

function animateConnectTitle() {
    if (
        !connectTitle ||
        connectTitleLocked ||
        !connectTitleCanAnimate.matches ||
        connectReducedMotion.matches
    ) {
        return;
    }

    const animation = createConnectTitleAnimation();
    if (!animation) return;

    connectTitleLocked = true;
    connectTitle.append(animation.overlay);

    window.requestAnimationFrame(() => {
        connectTitle.classList.add("is-splitting");
    });

    const animationTime =
        2400 + animation.finalOrder * 80 + 80;

    window.setTimeout(() => {
        connectTitle.classList.remove("is-splitting");
        animation.overlay.remove();

        window.setTimeout(() => {
            connectTitleLocked = false;
        }, 5000);
    }, animationTime);
}

connectTitle?.addEventListener(
    "pointerenter",
    animateConnectTitle
);

/* =========================================
   WORK — image carousels
========================================= */

const carousels = document.querySelectorAll(
    ".project-carousel"
);

const touchBreakpoint = window.matchMedia(
    "(max-width: 900px)"
);

const carouselStates = new Map();

carousels.forEach(carousel => {
    const track = carousel.querySelector(
        ".carousel-track"
    );

    const dots = carousel.querySelectorAll(".dot");

    const slideCount = carousel.querySelectorAll(
        ".carousel-slide"
    ).length;

    const previousButton =
        carousel.querySelector(".prev");

    const nextButton =
        carousel.querySelector(".next");

    const state = {
        track,
        dots,
        slideCount,
        index: 0,
        touchStartX: 0,
        touchDeltaX: 0,
        isDragging: false
    };

    carouselStates.set(carousel, state);

    function goToSlide(index) {
        state.index = Math.max(
            0,
            Math.min(
                index,
                state.slideCount - 1
            )
        );

        if (track) {
            track.style.transform =
                `translateX(-${state.index * (100 / state.slideCount)}%)`;
        }

        dots.forEach((dot, dotIndex) => {
            dot.classList.toggle(
                "active",
                dotIndex === state.index
            );
        });
    }

    state.goToSlide = goToSlide;

    previousButton?.addEventListener(
        "click",
        () => {
            goToSlide(state.index - 1);
        }
    );

    nextButton?.addEventListener(
        "click",
        () => {
            goToSlide(state.index + 1);
        }
    );

    dots.forEach(dot => {
        dot.addEventListener("click", () => {
            goToSlide(
                Number(dot.dataset.index)
            );
        });
    });
});

/* =========================================
   WORK — mobile swipe support
========================================= */

const swipeThreshold = 50;
const dragResistance = 0.3;

function handleTouchStart(carousel, state) {
    return event => {
        if (!state.track) return;

        state.touchStartX =
            event.touches[0].clientX;

        state.touchDeltaX = 0;
        state.isDragging = true;

        state.track.style.transition = "none";
    };
}

function handleTouchMove(carousel, state) {
    return event => {
        if (!state.isDragging || !state.track) {
            return;
        }

        state.touchDeltaX =
            event.touches[0].clientX -
            state.touchStartX;

        const baseOffset =
            -state.index *
            (100 / state.slideCount);

        let dragOffsetPercent =
            (state.touchDeltaX /
                state.track.offsetWidth) *
            100;

        const atFirstSlide =
            state.index === 0;

        const atLastSlide =
            state.index ===
            state.slideCount - 1;

        if (
            (atFirstSlide &&
                state.touchDeltaX > 0) ||
            (atLastSlide &&
                state.touchDeltaX < 0)
        ) {
            dragOffsetPercent *= dragResistance;
        }

        state.track.style.transform =
            `translateX(${baseOffset + dragOffsetPercent}%)`;
    };
}

function handleTouchEnd(carousel, state) {
    return () => {
        if (!state.isDragging || !state.track) {
            return;
        }

        state.isDragging = false;

        state.track.style.transition =
            "transform .5s cubic-bezier(.65, 0, .35, 1)";

        const atFirstSlide =
            state.index === 0;

        const atLastSlide =
            state.index ===
            state.slideCount - 1;

        if (
            state.touchDeltaX < -swipeThreshold &&
            !atLastSlide
        ) {
            state.goToSlide(state.index + 1);
        } else if (
            state.touchDeltaX > swipeThreshold &&
            !atFirstSlide
        ) {
            state.goToSlide(state.index - 1);
        } else {
            state.goToSlide(state.index);
        }
    };
}

function enableSwipe(carousel, state) {
    if (!state.track || state._onStart) return;

    state._onStart =
        handleTouchStart(carousel, state);

    state._onMove =
        handleTouchMove(carousel, state);

    state._onEnd =
        handleTouchEnd(carousel, state);

    state.track.addEventListener(
        "touchstart",
        state._onStart,
        { passive: true }
    );

    state.track.addEventListener(
        "touchmove",
        state._onMove,
        { passive: true }
    );

    state.track.addEventListener(
        "touchend",
        state._onEnd
    );
}

function disableSwipe(carousel, state) {
    if (!state._onStart || !state.track) return;

    state.track.removeEventListener(
        "touchstart",
        state._onStart
    );

    state.track.removeEventListener(
        "touchmove",
        state._onMove
    );

    state.track.removeEventListener(
        "touchend",
        state._onEnd
    );

    state._onStart = null;
    state._onMove = null;
    state._onEnd = null;
}

function handleBreakpointChange(event) {
    carouselStates.forEach((state, carousel) => {
        if (event.matches) {
            enableSwipe(carousel, state);
        } else {
            disableSwipe(carousel, state);
        }
    });
}

handleBreakpointChange(touchBreakpoint);

touchBreakpoint.addEventListener(
    "change",
    handleBreakpointChange
);
