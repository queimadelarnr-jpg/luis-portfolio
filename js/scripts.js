const cursorBall = document.querySelector(".cursor-ball");

/* =========================================
   TOUCH DETECTION
========================================= */

const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;

/* =========================================
   CURSOR — position + hover state
   (skipped entirely on touch devices)
========================================= */

if (!isTouchDevice && cursorBall) {

    let mouseX = 0;
    let mouseY = 0;

    let ballX = 0;
    let ballY = 0;

    window.addEventListener("mousemove", e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
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
        "a, button, input, select, textarea, label, img, h1, .available, .menu-item, .marquee-track span";

    document.addEventListener("mouseover", e => {
        const target = e.target.closest(HOVER_SELECTOR);
        if (!target) return;

        cursorBall.classList.add("active");
    });

    document.addEventListener("mouseout", e => {
        const target = e.target.closest(HOVER_SELECTOR);
        if (!target) return;

        // if we're moving to a descendant of the same target, don't clear yet
        if (target.contains(e.relatedTarget)) return;

        cursorBall.classList.remove("active");
    });

} else if (cursorBall) {
    cursorBall.style.display = "none";
}

/* =========================================
   MARQUEE — direction follows scroll direction
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
        loopWidth: loopWidth,
        baseDirection: isReverse ? -1 : 1
    });

    track.style.transform = `translate3d(${initialX}px, 0, 0)`;
}

function setupAllMarquees() {
    marqueeRows.forEach(track => setupMarquee(track));
}

setupAllMarquees();

let resizeTimer;

window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setupAllMarquees, 150);
});

function animateMarquee() {

    marqueeRows.forEach(track => {

        const state = marqueeStates.get(track);
        if (!state) return;

        state.x += marqueeSpeed * scrollDirection * state.baseDirection;

        if (state.x <= -state.loopWidth) state.x += state.loopWidth;
        if (state.x >= 0) state.x -= state.loopWidth;

        track.style.transform = `translate3d(${state.x}px, 0, 0)`;
    });

    requestAnimationFrame(animateMarquee);
}

animateMarquee();

/* =========================================
   MENU — expanding fill swap + page switch
========================================= */

const menuItems = document.querySelectorAll(".menu-item[data-page]");
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

    item.addEventListener("click", e => {

        if (item.classList.contains("active")) return;

        const rect = item.getBoundingClientRect();
        const fx = ((e.clientX - rect.left) / rect.width) * 100;
        const fy = ((e.clientY - rect.top) / rect.height) * 100;

        item.style.setProperty("--fx", `${fx}%`);
        item.style.setProperty("--fy", `${fy}%`);

        item.classList.add("expanding");

        const fill = item.querySelector(".menu-fill");

        fill.addEventListener("transitionend", () => {

            menuItems.forEach(other => {
                other.classList.remove("active", "expanding");
                other.style.removeProperty("--fx");
                other.style.removeProperty("--fy");
            });

            item.classList.add("active");

            switchPage(item.dataset.page);

            // close the mobile overlay after navigating
            if (menuNav && menuNav.classList.contains("open")) {
                closeMobileMenu();
            }

        }, { once: true });

    });

});

function switchPage(pageName) {

    const pages = document.querySelectorAll(".page");

    pages.forEach(page => {
        page.classList.toggle("page-visible", page.dataset.page === pageName);
    });

    if (pageName === "about") {
        setTimeout(triggerAboutEntrance, 100);
    }

    if (pageName === "work") {
        closeProjectDetail();
    }
}

/* =========================================
   WORK — cards + project detail views
========================================= */

const workProjects = document.querySelector(".work-projects");
const workCards = document.querySelectorAll(".work-card[data-project]");
const projectDetails = document.querySelectorAll(".project-detail[data-project]");
const projectBackButtons = document.querySelectorAll(".project-back");

function openProjectDetail(projectName) {
    const selectedProject = Array.from(projectDetails).find(
        detail => detail.dataset.project === projectName
    );

    if (!selectedProject || !workProjects) return;

    workProjects.hidden = true;
    projectDetails.forEach(detail => detail.classList.remove("is-open"));
    selectedProject.classList.add("is-open");

    const workInner = selectedProject.closest(".work-inner");
    workInner?.scrollTo({ top: 0, behavior: "auto" });
    selectedProject.querySelector(".project-back")?.focus();
}

function closeProjectDetail() {
    if (!workProjects) return;

    const openProject = document.querySelector(".project-detail.is-open");
    const projectName = openProject?.dataset.project;

    projectDetails.forEach(detail => detail.classList.remove("is-open"));
    workProjects.hidden = false;

    const workInner = workProjects.closest(".work-inner");
    workInner?.scrollTo({ top: 0, behavior: "auto" });

    if (projectName) {
        document.querySelector(`.work-card[data-project="${projectName}"]`)?.focus();
    }
}

workCards.forEach(card => {
    card.addEventListener("click", () => openProjectDetail(card.dataset.project));
});

projectBackButtons.forEach(button => {
    button.addEventListener("click", closeProjectDetail);
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && document.querySelector(".project-detail.is-open")) {
        closeProjectDetail();
    }
});

/* =========================================
   MOBILE MENU TOGGLE
========================================= */

if (menuToggle) {

    menuToggle.addEventListener("click", () => {
        const isOpen = menuNav.classList.toggle("open");
        menuToggle.setAttribute("aria-expanded", isOpen);
        document.body.style.overflow = isOpen ? "hidden" : "";
    });

}

if (menuBack) {
    menuBack.addEventListener("click", closeMobileMenu);
}

/* =========================================
   ABOUT — line entrance + scroll focus
========================================= */

const aboutMe = document.querySelector(".about_me");
const aboutText = document.querySelector(".about-text");
const aboutLines = document.querySelectorAll(".about_me .line");

// only the lines that actually have text take part in the
// stagger animation and the scroll-focus effect — empty
// spacer lines are ignored so the index math lines up with
// your real sentences regardless of how many blank spans
// you add before/after them
const aboutContentLines = Array.from(aboutLines).filter(
    line => line.textContent.trim().length > 0
);

aboutContentLines.forEach((line, i) => {
    line.style.setProperty("--enter-delay", `${0.05 + i * 0.07}s`);
});

function updateLineFocus() {
    if (!aboutMe || !aboutContentLines.length) return;

    const containerRect = aboutMe.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;

    let closestLine = null;
    let closestDistance = Infinity;

    aboutContentLines.forEach(line => {
        const rect = line.getBoundingClientRect();
        const lineCenter = rect.top + rect.height / 2;
        const distance = Math.abs(lineCenter - containerCenter);

        if (distance < closestDistance) {
            closestDistance = distance;
            closestLine = line;
        }
    });

    aboutContentLines.forEach(line => {
        line.classList.toggle("in-focus", line === closestLine);
    });
}

if (aboutMe) {
    aboutMe.addEventListener("scroll", updateLineFocus, { passive: true });
}

function triggerAboutEntrance() {
    if (!aboutText) return;

    updateAboutSpacers(); // measure BEFORE animating in, so heights are correct

    aboutText.classList.remove("entered");
    void aboutText.offsetWidth;
    aboutText.classList.add("entered");

    updateLineFocus();
}

let aboutResizeTimer;
window.addEventListener("resize", () => {
    clearTimeout(aboutResizeTimer);
    aboutResizeTimer = setTimeout(() => {
        updateAboutSpacers();
        updateLineFocus();
    }, 150);
});

const aboutSpacers = document.querySelectorAll(".about_me .spacer");

function updateAboutSpacers() {
    if (!aboutMe || !aboutSpacers.length) return;

    const halfHeight = aboutMe.clientHeight / 2;

    aboutSpacers.forEach(spacer => {
        spacer.style.height = `${halfHeight}px`;
    });
}

/* =========================================
   ABOUT — photo variant cycling
========================================= */

const photoVariants = document.querySelectorAll(".photo-variant");
let photoVariantIndex = 0;

function cyclePhotoVariant() {
    if (!photoVariants.length) return;

    photoVariants[photoVariantIndex].classList.remove("active");

    photoVariantIndex = (photoVariantIndex + 1) % photoVariants.length;

    photoVariants[photoVariantIndex].classList.add("active");
}

if (photoVariants.length > 1) {
    setInterval(cyclePhotoVariant, 4500);
}

/* =========================================
   WORK — image carousels (supports multiple)
========================================= */

const carousels = document.querySelectorAll(".project-carousel");
const touchBreakpoint = window.matchMedia("(max-width: 900px)");

const carouselStates = new Map();

carousels.forEach(carousel => {

    const track = carousel.querySelector(".carousel-track");
    const dots = carousel.querySelectorAll(".dot");
    const slideCount = carousel.querySelectorAll(".carousel-slide").length;
    const prevBtn = carousel.querySelector(".prev");
    const nextBtn = carousel.querySelector(".next");

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
        // clamp — no wrap-around
        state.index = Math.max(0, Math.min(index, state.slideCount - 1));

        if (track) {
            track.style.transform = `translateX(-${state.index * (100 / state.slideCount)}%)`;
        }

        dots.forEach((dot, i) => {
            dot.classList.toggle("active", i === state.index);
        });
    }

    state.goToSlide = goToSlide;

    prevBtn?.addEventListener("click", () => goToSlide(state.index - 1));
    nextBtn?.addEventListener("click", () => goToSlide(state.index + 1));

    dots.forEach(dot => {
        dot.addEventListener("click", () => goToSlide(Number(dot.dataset.index)));
    });

});

/* =========================================
   WORK — swipe support
   (only active at tablet/mobile breakpoint)
========================================= */

const swipeThreshold = 50;
const dragResistance = 0.3;

function handleTouchStart(carousel, state) {
    return e => {
        state.touchStartX = e.touches[0].clientX;
        state.touchDeltaX = 0;
        state.isDragging = true;

        state.track.style.transition = "none";
    };
}

function handleTouchMove(carousel, state) {
    return e => {
        if (!state.isDragging) return;

        state.touchDeltaX = e.touches[0].clientX - state.touchStartX;

        const baseOffset = -state.index * (100 / state.slideCount);
        let dragOffsetPercent = (state.touchDeltaX / state.track.offsetWidth) * 100;

        const atFirstSlide = state.index === 0;
        const atLastSlide = state.index === state.slideCount - 1;

        if ((atFirstSlide && state.touchDeltaX > 0) || (atLastSlide && state.touchDeltaX < 0)) {
            dragOffsetPercent *= dragResistance;
        }

        state.track.style.transform = `translateX(${baseOffset + dragOffsetPercent}%)`;
    };
}

function handleTouchEnd(carousel, state) {
    return () => {
        if (!state.isDragging) return;
        state.isDragging = false;

        state.track.style.transition = "transform .5s cubic-bezier(.65, 0, .35, 1)";

        const atFirstSlide = state.index === 0;
        const atLastSlide = state.index === state.slideCount - 1;

        if (state.touchDeltaX < -swipeThreshold && !atLastSlide) {
            state.goToSlide(state.index + 1);
        } else if (state.touchDeltaX > swipeThreshold && !atFirstSlide) {
            state.goToSlide(state.index - 1);
        } else {
            state.goToSlide(state.index);
        }
    };
}

function enableSwipe(carousel, state) {
    state._onStart = handleTouchStart(carousel, state);
    state._onMove = handleTouchMove(carousel, state);
    state._onEnd = handleTouchEnd(carousel, state);

    state.track.addEventListener("touchstart", state._onStart, { passive: true });
    state.track.addEventListener("touchmove", state._onMove, { passive: true });
    state.track.addEventListener("touchend", state._onEnd);
}

function disableSwipe(carousel, state) {
    if (!state._onStart) return;

    state.track.removeEventListener("touchstart", state._onStart);
    state.track.removeEventListener("touchmove", state._onMove);
    state.track.removeEventListener("touchend", state._onEnd);
}

function handleBreakpointChange(e) {
    carouselStates.forEach((state, carousel) => {
        if (e.matches) {
            enableSwipe(carousel, state);
        } else {
            disableSwipe(carousel, state);
        }
    });
}

handleBreakpointChange(touchBreakpoint);
touchBreakpoint.addEventListener("change", handleBreakpointChange);