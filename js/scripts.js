const cursorBall = document.querySelector(".cursor-ball");

/* =========================================
   TOUCH DETECTION
========================================= */

const isTouchDevice = window.matchMedia(
    "(hover: none), (pointer: coarse)"
).matches;

/* =========================================
   CURSOR — movement, hover and dialogs
========================================= */

if (cursorBall) {
    const cursorHome = cursorBall.parentElement;
    const hoverSelector =
        "a, button, input, select, textarea, label, img, h1, " +
        ".available, .menu-item";

    let mouseX = 0;
    let mouseY = 0;
    let ballX = 0;
    let ballY = 0;

    // Start hidden until a mouse moves. Touch input does not need a cursor.
    cursorBall.hidden = true;

    // A modal dialog is above the entire page, even above a large z-index.
    // Move the same cursor into it, then return it when the dialog closes.
    function placeCursor() {
        const openDialog = document.querySelector("dialog[open]");
        const cursorParent = openDialog || cursorHome;

        if (cursorBall.parentElement !== cursorParent) {
            cursorParent.appendChild(cursorBall);
        }
    }

    const dialogObserver = new MutationObserver(placeCursor);
    dialogObserver.observe(document.body, {
        subtree: true,
        attributes: true,
        attributeFilter: ["open"]
    });

    window.addEventListener("pointermove", event => {
        if (event.pointerType !== "mouse") {
            cursorBall.hidden = true;
            return;
        }

        // Recheck on movement as well, so newly created dialogs are covered.
        placeCursor();
        mouseX = event.clientX;
        mouseY = event.clientY;

        if (cursorBall.hidden) {
            ballX = mouseX;
            ballY = mouseY;
        }

        cursorBall.hidden = false;
        const hoveredElement = event.target.closest(hoverSelector);
        cursorBall.classList.toggle("active", Boolean(hoveredElement));
    });

    window.addEventListener("pointerdown", event => {
        if (event.pointerType !== "mouse") cursorBall.hidden = true;
    });

    window.addEventListener("blur", () => {
        cursorBall.hidden = true;
    });

    document.documentElement.addEventListener("pointerleave", () => {
        cursorBall.hidden = true;
    });

    function animateCursor() {
        ballX += (mouseX - ballX) * 0.35;
        ballY += (mouseY - ballY) * 0.35;

        cursorBall.style.transform =
            `translate3d(${ballX}px, ${ballY}px, 0) translate(-50%, -50%)`;

        requestAnimationFrame(animateCursor);
    }

    animateCursor();
}

/* =========================================
   AVAILABLE FOR FREELANCE
========================================= */

const available = document.querySelector(".available");

if (available) {
    const text = available.textContent.trim();

    available.innerHTML = [...text]
        .map(letter => {
            if (letter === " ") {
                return `<span class="available-letter">&nbsp;</span>`;
            }

            return `<span class="available-letter">${letter}</span>`;
        })
        .join("");

    available.addEventListener("click", async () => {
        const email = available.dataset.email;

        try {
            await navigator.clipboard.writeText(email);
        } catch (error) {
            console.error("Could not copy email:", error);
        }
    });
}



/* =========================================
   HEADER NAME — home link and letter reels
========================================= */

const homeTitleLink =
    document.querySelector(
        ".home-title-link"
    );

const nameSlotCanAnimate =
    window.matchMedia(
        "(min-width: 901px) and (hover: hover) and (pointer: fine)"
    );

const nameSlotReducedMotion =
    window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

const nameSlotGlyphs =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

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

const nameSlotSessionLetters =
    new Set();

const nameSlotRunningAnimations =
    new Set();

function measureNameLetters() {
    if (!homeTitleLink) return;

    homeTitleLink
        .querySelectorAll(
            ".name-letter"
        )
        .forEach(letter => {
            letter.style.width =
                "auto";

            const width =
                letter
                    .querySelector(
                        ".name-letter-value"
                    )
                    ?.getBoundingClientRect()
                    .width;

            if (width) {
                letter.style.width =
                    `${width}px`;
            }
        });
}

function setupNameLetters() {
    if (!homeTitleLink) return;

    const name =
        homeTitleLink.textContent
            .trim()
            .toUpperCase();

    const fragment =
        document.createDocumentFragment();

    Array.from(name).forEach(
        character => {
            if (
                character === " "
            ) {
                const space =
                    document.createElement(
                        "span"
                    );

                space.className =
                    "name-space";

                space.textContent =
                    "\u00a0";

                space.setAttribute(
                    "aria-hidden",
                    "true"
                );

                fragment.append(
                    space
                );

                return;
            }

            const letter =
                document.createElement(
                    "span"
                );

            const value =
                document.createElement(
                    "span"
                );

            letter.className =
                "name-letter";

            letter.dataset.original =
                character;

            letter.setAttribute(
                "aria-hidden",
                "true"
            );

            value.className =
                "name-letter-value";

            value.textContent =
                character;

            letter.append(value);
            fragment.append(letter);
        }
    );

    homeTitleLink.replaceChildren(
        fragment
    );

    measureNameLetters();

    document.fonts?.ready.then(
        measureNameLetters
    );
}

function randomNameGlyph(
    currentCharacter
) {
    let nextCharacter =
        currentCharacter;

    while (
        nextCharacter ===
        currentCharacter
    ) {
        nextCharacter =
            nameSlotGlyphs[
                Math.floor(
                    Math.random() *
                        nameSlotGlyphs.length
                )
            ];
    }

    return nextCharacter;
}

function rollNameLetter(
    letter,
    fromCharacter,
    toCharacter,
    duration
) {
    return new Promise(resolve => {
        const reel =
            document.createElement(
                "span"
            );

        const current =
            document.createElement(
                "span"
            );

        const next =
            document.createElement(
                "span"
            );

        reel.className =
            "name-letter-reel";

        current.textContent =
            fromCharacter;

        next.textContent =
            toCharacter;

        reel.append(
            current,
            next
        );

        letter.replaceChildren(
            reel
        );

        const animation =
            reel.animate(
                [
                    {
                        transform:
                            "translateY(0)"
                    },

                    {
                        transform:
                            "translateY(-50%)"
                    }
                ],
                {
                    duration,

                    easing:
                        "cubic-bezier(.45, 0, .55, 1)",

                    fill:
                        "forwards"
                }
            );

        animation.finished
            .catch(() => {})
            .finally(() => {
                const value =
                    document.createElement(
                        "span"
                    );

                value.className =
                    "name-letter-value";

                value.textContent =
                    toCharacter;

                letter.replaceChildren(
                    value
                );

                resolve();
            });
    });
}

async function animateNameLetter(
    letter
) {
    if (
        !nameSlotCanAnimate.matches ||
        nameSlotReducedMotion.matches
    ) {
        return;
    }

    const originalCharacter =
        letter.dataset.original;

    let currentCharacter =
        originalCharacter;

    for (
        let index = 0;
        index <
        nameSlotDurations.length;
        index++
    ) {
        const isFinalRoll =
            index ===
            nameSlotDurations.length -
                1;

        const nextCharacter =
            isFinalRoll
                ? originalCharacter
                : randomNameGlyph(
                      currentCharacter
                  );

        await rollNameLetter(
            letter,
            currentCharacter,
            nextCharacter,
            nameSlotDurations[index]
        );

        currentCharacter =
            nextCharacter;
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

    if (
        !nameSlotSessionActive
    ) {
        nameSlotSessionActive =
            true;

        nameSlotSessionLetters.clear();
    }

    window.clearTimeout(
        nameSlotIdleTimer
    );

    return true;
}

function finishNameSlotSession() {
    if (
        !nameSlotSessionActive ||
        nameSlotRunningAnimations.size >
            0
    ) {
        return;
    }

    nameSlotSessionActive =
        false;

    nameSlotLocked = true;

    nameSlotSessionLetters.clear();

    window.clearTimeout(
        nameSlotCooldownTimer
    );

    nameSlotCooldownTimer =
        window.setTimeout(() => {
            nameSlotLocked =
                false;
        }, 8000);
}

function scheduleNameSlotSessionEnd() {
    window.clearTimeout(
        nameSlotIdleTimer
    );

    const delay =
        nameSlotPointerInside
            ? 700
            : 0;

    nameSlotIdleTimer =
        window.setTimeout(() => {
            finishNameSlotSession();
        }, delay);
}

setupNameLetters();

homeTitleLink?.addEventListener(
    "pointerenter",
    () => {
        nameSlotPointerInside =
            true;
    }
);

homeTitleLink?.addEventListener(
    "pointerover",
    event => {
        const letter =
            event.target.closest(
                ".name-letter"
            );

        if (
            !letter ||
            !homeTitleLink.contains(
                letter
            )
        ) {
            return;
        }

        if (
            !beginNameSlotSession()
        ) {
            return;
        }

        if (
            nameSlotSessionLetters.has(
                letter
            )
        ) {
            return;
        }

        nameSlotSessionLetters.add(
            letter
        );

        const runningAnimation =
            animateNameLetter(
                letter
            );

        nameSlotRunningAnimations.add(
            runningAnimation
        );

        runningAnimation.finally(
            () => {
                nameSlotRunningAnimations.delete(
                    runningAnimation
                );

                scheduleNameSlotSessionEnd();
            }
        );
    }
);

homeTitleLink?.addEventListener(
    "pointerleave",
    () => {
        nameSlotPointerInside =
            false;

        scheduleNameSlotSessionEnd();
    }
);

homeTitleLink?.addEventListener(
    "click",
    event => {
        event.preventDefault();

        const homeMenuItem =
            Array.from(
                menuItems
            ).find(
                item =>
                    item.dataset.page ===
                    "home"
            );

        menuItems.forEach(
            item => {
                item.classList.remove(
                    "active",
                    "expanding"
                );

                item.style.removeProperty(
                    "--fx"
                );

                item.style.removeProperty(
                    "--fy"
                );
            }
        );

        homeMenuItem?.classList.add(
            "active"
        );

        switchPage("home");

        if (
            menuNav?.classList.contains(
                "open"
            )
        ) {
            closeMobileMenu();
        }
    }
);

/* =========================================
   WORK — cards and project details
========================================= */

const workProjects =
    document.querySelector(
        ".work-projects"
    );

const workCards =
    document.querySelectorAll(
        ".work-card[data-project]"
    );

const projectDetails =
    document.querySelectorAll(
        ".project-detail[data-project]"
    );

const projectBackButtons =
    document.querySelectorAll(
        ".project-back"
    );

let workTransitionTimer = null;

const workTransitionDuration =
    window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches
        ? 0
        : 900;

function revealProjectDetail(
    selectedProject
) {
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

    projectDetails.forEach(
        detail => {
            detail.classList.remove(
                "is-open"
            );
        }
    );

    selectedProject.classList.add(
        "is-open"
    );

    const workInner =
        selectedProject.closest(
            ".work-inner"
        );

    workInner?.scrollTo({
        top: 0,
        behavior: "auto"
    });

    selectedProject
        .querySelector(
            ".project-back"
        )
        ?.focus();
}

function openProjectDetail(
    projectName,
    sourceCard
) {
    const selectedProject =
        Array.from(
            projectDetails
        ).find(
            detail =>
                detail.dataset
                    .project ===
                projectName
        );

    if (
        !selectedProject ||
        !workProjects
    ) {
        return;
    }

    if (
        workProjects.classList.contains(
            "is-transitioning"
        )
    ) {
        return;
    }

    const sourceIndex =
        Array.from(
            workCards
        ).indexOf(
            sourceCard
        );

    const exitDirection =
        sourceIndex === 1
            ? "exit-right"
            : "exit-left";

    workProjects.classList.add(
        "is-transitioning",
        exitDirection
    );

    workCards.forEach(card => {
        card.disabled = true;
    });

    window.clearTimeout(
        workTransitionTimer
    );

    workTransitionTimer =
        window.setTimeout(() => {
            revealProjectDetail(
                selectedProject
            );

            workTransitionTimer =
                null;
        }, workTransitionDuration);
}

function closeProjectDetail() {
    if (!workProjects) return;

    window.clearTimeout(
        workTransitionTimer
    );

    workTransitionTimer = null;

    workProjects.classList.remove(
        "is-transitioning",
        "exit-left",
        "exit-right"
    );

    workCards.forEach(card => {
        card.disabled = false;
    });

    const openProject =
        document.querySelector(
            ".project-detail.is-open"
        );

    const projectName =
        openProject?.dataset.project;

    projectDetails.forEach(
        detail => {
            detail.classList.remove(
                "is-open"
            );
        }
    );

    workProjects.hidden = false;

    const workInner =
        workProjects.closest(
            ".work-inner"
        );

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
    card.addEventListener(
        "click",
        () => {
            openProjectDetail(
                card.dataset.project,
                card
            );
        }
    );
});

projectBackButtons.forEach(
    button => {
        button.addEventListener(
            "click",
            closeProjectDetail
        );
    }
);

document.addEventListener(
    "keydown",
    event => {
        const openProject =
            document.querySelector(
                ".project-detail.is-open"
            );

        if (
            event.key ===
                "Escape" &&
            openProject
        ) {
            closeProjectDetail();
        }
    }
);

/* =========================================
   MOBILE MENU
========================================= */

if (
    menuToggle &&
    menuNav
) {
    menuToggle.addEventListener(
        "click",
        () => {
            const isOpen =
                menuNav.classList.toggle(
                    "open"
                );

            menuToggle.setAttribute(
                "aria-expanded",
                String(isOpen)
            );

            document.body.style.overflow =
                isOpen
                    ? "hidden"
                    : "";
        }
    );
}

if (menuBack) {
    menuBack.addEventListener(
        "click",
        closeMobileMenu
    );
}

/* =========================================
   ABOUT — notify the portrait interaction
========================================= */

function triggerAboutEntrance() {
    window.dispatchEvent(new Event("about-open"));
}

/* =========================================
   CONNECT — desktop title split
========================================= */

const connectTitle =
    document.querySelector(
        ".connect-title"
    );

if (connectTitle) {
    Array.from(
        connectTitle.childNodes
    ).forEach(node => {
        if (
            node.nodeType !== 3
        ) {
            return;
        }

        const fragment =
            document.createDocumentFragment();

        Array.from(
            node.textContent
        ).forEach(character => {
            const letter =
                document.createElement(
                    "span"
                );

            letter.className =
                "connect-base-letter";

            letter.textContent =
                character;

            fragment.appendChild(
                letter
            );
        });

        node.replaceWith(
            fragment
        );
    });
}

const connectTitleCanAnimate =
    window.matchMedia(
        "(min-width: 901px) and (hover: hover) and (pointer: fine)"
    );

const connectReducedMotion =
    window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

let connectTitleLocked =
    false;

function createConnectTitleAnimation() {
    if (!connectTitle) {
        return null;
    }

    const titleRect =
        connectTitle.getBoundingClientRect();

    const viewportMiddle =
        window.innerWidth / 2;

    const characterData = [];

    Array.from(
        connectTitle.querySelectorAll(
            ".connect-base-letter"
        )
    ).forEach(baseLetter => {
        const node =
            baseLetter.firstChild;

        if (
            !node ||
            node.nodeType !== 3
        ) {
            return;
        }

        Array.from(
            node.textContent
        ).forEach(
            (character, index) => {
                if (
                    /\s/.test(
                        character
                    )
                ) {
                    return;
                }

                const range =
                    document.createRange();

                range.setStart(
                    node,
                    index
                );

                range.setEnd(
                    node,
                    index + 1
                );

                const rect =
                    range.getBoundingClientRect();

                range.detach();

                if (
                    !rect.width ||
                    !rect.height
                ) {
                    return;
                }

                characterData.push({
                    character,
                    rect,

                    center:
                        rect.left +
                        rect.width / 2
                });
            }
        );
    });

    if (
        !characterData.length
    ) {
        return null;
    }

    const apostrophes =
        characterData.filter(
            item =>
                item.character ===
                    "'" ||
                item.character ===
                    "’"
        );

    const leftCharacters =
        characterData
            .filter(item => {
                return (
                    !apostrophes.includes(
                        item
                    ) &&
                    item.center <
                        viewportMiddle
                );
            })
            .sort(
                (a, b) =>
                    a.center -
                    b.center
            );

    const rightCharacters =
        characterData
            .filter(item => {
                return (
                    !apostrophes.includes(
                        item
                    ) &&
                    item.center >=
                        viewportMiddle
                );
            })
            .sort(
                (a, b) =>
                    b.center -
                    a.center
            );

    leftCharacters.forEach(
        (item, index) => {
            item.order = index;
            item.direction = -1;
        }
    );

    rightCharacters.forEach(
        (item, index) => {
            item.order = index;
            item.direction = 1;
        }
    );

    const inwardOrder =
        Math.max(
            leftCharacters.length,
            rightCharacters.length
        );

    apostrophes.forEach(
        item => {
            item.order =
                inwardOrder;

            item.direction = 0;

            item.isApostrophe =
                true;
        }
    );

    const horizontalDistance =
        Math.min(
            175,
            Math.max(
                90,
                window.innerWidth *
                    0.09
            )
        );

    const overlay =
        document.createElement(
            "span"
        );

    overlay.className =
        "connect-title-animation";

    overlay.setAttribute(
        "aria-hidden",
        "true"
    );

    characterData.forEach(
        item => {
            const letter =
                document.createElement(
                    "span"
                );

            letter.className =
                "connect-title-letter";

            letter.textContent =
                item.character;

            letter.style.left =
                `${item.rect.left - titleRect.left}px`;

            letter.style.top =
                `${item.rect.top - titleRect.top}px`;

            letter.style.width =
                `${item.rect.width + 1}px`;

            letter.style.height =
                `${item.rect.height}px`;

            letter.style.lineHeight =
                `${item.rect.height}px`;

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
                item.isApostrophe
                    ? "1.05em"
                    : "0px"
            );

            overlay.append(
                letter
            );
        }
    );

    return {
        overlay,

        finalOrder:
            Math.max(
                ...characterData.map(
                    item =>
                        item.order
                )
            )
    };
}

function animateConnectTitle(
    fromTouch = false
) {
    if (
        !connectTitle ||
        connectTitleLocked ||
        (
            !connectTitleCanAnimate.matches &&
            fromTouch !== true
        ) ||
        connectReducedMotion.matches
    ) {
        return;
    }

    const animation =
        createConnectTitleAnimation();

    if (!animation) return;

    connectTitleLocked = true;

    connectTitle.append(
        animation.overlay
    );

    window.requestAnimationFrame(
        () => {
            connectTitle.classList.add(
                "is-splitting"
            );
        }
    );

    const animationTime =
        2400 +
        animation.finalOrder *
            80 +
        80;

    window.setTimeout(
        () => {
            connectTitle.classList.remove(
                "is-splitting"
            );

            animation.overlay.remove();

            window.setTimeout(
                () => {
                    connectTitleLocked =
                        false;
                },
                5000
            );
        },
        animationTime
    );
}

connectTitle?.addEventListener(
    "pointerenter",
    event => {
        if (
            event.pointerType !==
            "touch"
        ) {
            animateConnectTitle();
        }
    }
);

/* =========================================
   TOUCH TAP ANIMATION HELPER
========================================= */

function addAnimationTap(
    element,
    action,
    containsPoint = () => true
) {
    if (!element) return;

    let start = null;

    element.addEventListener(
        "pointerdown",
        event => {
            if (
                event.pointerType !==
                    "touch" ||
                !event.isPrimary ||
                !containsPoint(
                    event.clientX,
                    event.clientY
                )
            ) {
                return;
            }

            start = {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                time:
                    performance.now()
            };
        },
        { passive: true }
    );

    element.addEventListener(
        "pointermove",
        event => {
            if (
                start?.id ===
                    event.pointerId &&
                Math.hypot(
                    event.clientX -
                        start.x,

                    event.clientY -
                        start.y
                ) > 12
            ) {
                start = null;
            }
        },
        { passive: true }
    );

    element.addEventListener(
        "pointerup",
        event => {
            const tap = start;
            start = null;

            if (
                !tap ||
                tap.id !==
                    event.pointerId ||
                performance.now() -
                    tap.time >
                    600
            ) {
                return;
            }

            if (
                Math.hypot(
                    event.clientX -
                        tap.x,

                    event.clientY -
                        tap.y
                ) <= 12 &&
                containsPoint(
                    event.clientX,
                    event.clientY
                )
            ) {
                action();
            }
        },
        { passive: true }
    );

    element.addEventListener(
        "pointercancel",
        () => {
            start = null;
        },
        { passive: true }
    );
}

addAnimationTap(
    heroMarquee,
    untangleHero,
    (x, y) => {
        if (!wovenPhoto) {
            return false;
        }

        const rect =
            wovenPhoto.getBoundingClientRect();

        return (
            x >= rect.left &&
            x <= rect.right &&
            y >= rect.top &&
            y <= rect.bottom
        );
    }
);

addAnimationTap(
    connectTitle,
    () =>
        animateConnectTitle(
            true
        )
);

/* =========================================
   WORK — image carousels
========================================= */

const carousels =
    document.querySelectorAll(
        ".project-carousel"
    );

const touchBreakpoint =
    window.matchMedia(
        "(max-width: 900px)"
    );

const carouselStates =
    new Map();

carousels.forEach(carousel => {
    const track =
        carousel.querySelector(
            ".carousel-track"
        );

    const dots =
        carousel.querySelectorAll(
            ".dot"
        );

    const slideCount =
        carousel.querySelectorAll(
            ".carousel-slide"
        ).length;

    const previousButton =
        carousel.querySelector(
            ".prev"
        );

    const nextButton =
        carousel.querySelector(
            ".next"
        );

    const state = {
        track,
        dots,
        slideCount,

        index: 0,

        touchStartX: 0,
        touchDeltaX: 0,

        isDragging: false
    };

    carouselStates.set(
        carousel,
        state
    );

    function goToSlide(index) {
        state.index =
            Math.max(
                0,
                Math.min(
                    index,
                    state.slideCount -
                        1
                )
            );

        if (track) {
            track.style.transform =
                `translateX(-${state.index * (100 / state.slideCount)}%)`;
        }

        dots.forEach(
            (dot, dotIndex) => {
                dot.classList.toggle(
                    "active",
                    dotIndex ===
                        state.index
                );
            }
        );
    }

    state.goToSlide =
        goToSlide;

    previousButton?.addEventListener(
        "click",
        () => {
            goToSlide(
                state.index - 1
            );
        }
    );

    nextButton?.addEventListener(
        "click",
        () => {
            goToSlide(
                state.index + 1
            );
        }
    );

    dots.forEach(dot => {
        dot.addEventListener(
            "click",
            () => {
                goToSlide(
                    Number(
                        dot.dataset
                            .index
                    )
                );
            }
        );
    });
});

/* =========================================
   WORK — mobile swipe support
========================================= */

const swipeThreshold = 50;
const dragResistance = 0.3;

function handleTouchStart(
    carousel,
    state
) {
    return event => {
        if (!state.track) return;

        state.touchStartX =
            event.touches[0]
                .clientX;

        state.touchDeltaX = 0;
        state.isDragging = true;

        state.track.style.transition =
            "none";
    };
}

function handleTouchMove(
    carousel,
    state
) {
    return event => {
        if (
            !state.isDragging ||
            !state.track
        ) {
            return;
        }

        state.touchDeltaX =
            event.touches[0]
                .clientX -
            state.touchStartX;

        const baseOffset =
            -state.index *
            (
                100 /
                state.slideCount
            );

        let dragOffsetPercent =
            (
                state.touchDeltaX /
                state.track
                    .offsetWidth
            ) * 100;

        const atFirstSlide =
            state.index === 0;

        const atLastSlide =
            state.index ===
            state.slideCount - 1;

        if (
            (
                atFirstSlide &&
                state.touchDeltaX > 0
            ) ||
            (
                atLastSlide &&
                state.touchDeltaX < 0
            )
        ) {
            dragOffsetPercent *=
                dragResistance;
        }

        state.track.style.transform =
            `translateX(${baseOffset + dragOffsetPercent}%)`;
    };
}

function handleTouchEnd(
    carousel,
    state
) {
    return () => {
        if (
            !state.isDragging ||
            !state.track
        ) {
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
            state.touchDeltaX <
                -swipeThreshold &&
            !atLastSlide
        ) {
            state.goToSlide(
                state.index + 1
            );
        } else if (
            state.touchDeltaX >
                swipeThreshold &&
            !atFirstSlide
        ) {
            state.goToSlide(
                state.index - 1
            );
        } else {
            state.goToSlide(
                state.index
            );
        }
    };
}

function enableSwipe(
    carousel,
    state
) {
    if (
        !state.track ||
        state._onStart
    ) {
        return;
    }

    state._onStart =
        handleTouchStart(
            carousel,
            state
        );

    state._onMove =
        handleTouchMove(
            carousel,
            state
        );

    state._onEnd =
        handleTouchEnd(
            carousel,
            state
        );

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

function disableSwipe(
    carousel,
    state
) {
    if (
        !state._onStart ||
        !state.track
    ) {
        return;
    }

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

function handleBreakpointChange(
    event
) {
    carouselStates.forEach(
        (state, carousel) => {
            if (event.matches) {
                enableSwipe(
                    carousel,
                    state
                );
            } else {
                disableSwipe(
                    carousel,
                    state
                );
            }
        }
    );
}

handleBreakpointChange(
    touchBreakpoint
);

touchBreakpoint.addEventListener(
    "change",
    handleBreakpointChange
);