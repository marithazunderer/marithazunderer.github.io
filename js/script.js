// ===================== navigation =====================
const mainNav = document.querySelector(".main-nav");
const hero = document.querySelector("#hero");
const arrow = document.querySelector("#arrow");
const projects = document.querySelector("main");
// das nav-Element
const worksNav = document.querySelector(".works-nav");
const worksDropdown = document.querySelector(".works-dropdown");
const worksButton = document.querySelector(".works-button");
let hideWorksNavTimeout;

// Make nav sticky after it scrolls past the top of viewport
if (mainNav && hero) {
  window.addEventListener("scroll", () => {
    // Nav starts at bottom of hero (absolute), calculate when it hits top of viewport
    const navOriginalTop = hero.offsetHeight - mainNav.offsetHeight;
    if (window.scrollY >= navOriginalTop) {
      mainNav.classList.add("stuck");
    } else {
      mainNav.classList.remove("stuck");
    }
  });
}

if (arrow && projects) {
  arrow.addEventListener("click", () => {
    projects.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

if (worksButton && projects) {
  worksButton.addEventListener("click", () => {
    projects.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// nav menu on hover
if (worksDropdown && worksNav) {
  const showWorksNav = () => {
    clearTimeout(hideWorksNavTimeout);
    worksNav.classList.add("sichtbar");
  };

  const hideWorksNav = () => {
    hideWorksNavTimeout = setTimeout(() => {
      worksNav.classList.remove("sichtbar");
    }, 1000);
  };

  worksDropdown.addEventListener("mouseenter", showWorksNav);
  worksDropdown.addEventListener("mouseleave", hideWorksNav);
  
  worksNav.addEventListener("mouseenter", showWorksNav);
  worksNav.addEventListener("mouseleave", hideWorksNav);
}






// ===================== slideshow header hero images =====================

const heroImgsArray = [...document.querySelectorAll("#hero img, #hero video")];

// das 1. Bild im Array soll gleich gezeigt werden
let heroSichtbar = 0;

// macht zuerst mal alle Bilder unsichtbar
// und dann animiert das, das die Nummer "heroSichtbar" im heroImgsArray hat
function heroBilderSichtbarkeit() {
  if (!heroImgsArray.length) return;
  // console.log(heroSichtbar);
  for (let i = 0; i < heroImgsArray.length; i++) {
    heroImgsArray[i].classList.add("unsichtbar");
    // if the hidden element is a video, pause it and rewind
    if (heroImgsArray[i].tagName === "VIDEO") {
      try {
        heroImgsArray[i].pause();
        heroImgsArray[i].currentTime = 0;
      } catch (e) {}
    }
  }
  const visible = heroImgsArray[heroSichtbar];
  visible.classList.remove("unsichtbar");
  if (visible.tagName === "VIDEO") {
    // play the video when it becomes visible
    try {
      visible.play();
    } catch (e) {}
  }
}

if (heroImgsArray.length) {
  // erst mal alle hero-Bilder bis auf das erste unsichtbar
  heroBilderSichtbarkeit();

  function heroAnimation() {
    if (heroSichtbar < heroImgsArray.length - 1) {
      heroSichtbar = heroSichtbar + 1;
    } else {
      heroSichtbar = 0;
    }
    heroBilderSichtbarkeit();
  }

  // wie lange soll das jeweilige Bild stehen bleiben ?
  // hier 5 Sekunden
  const heroAni = setInterval(heroAnimation, 3500);
}





// =====================  =====================

// td wird blocksatz unter th wenn es über mehrere zeilen geht
function updateWrappedTds() {
  const isInfoKleinActive = window.matchMedia("(max-width: 1000px)").matches;

  document.querySelectorAll(".image-container > table").forEach((table) => {
    table.querySelectorAll("tr").forEach((tr) => {
      const th = tr.querySelector("th");
      const td = tr.querySelector("td");
      if (!th || !td) return;
      if (isInfoKleinActive) {
        const thRect = th.getBoundingClientRect();
        const tdRect = td.getBoundingClientRect();
        if (tdRect.top > thRect.top + 2 || tdRect.height > thRect.height + 2) {
          td.style.textAlign = "justify";
          td.classList.add("wrapped-below");
          td.style.paddingTop = 0;
        } else {
          td.style.textAlign = "right";
          td.style.padding = "";
          td.classList.remove("wrapped-below");
        }
      } else {
        td.style.textAlign = "";
        td.style.padding = "";
        td.classList.remove("wrapped-below");
      }
    });
  });
}

let __wrapResizeTimer;

function syncWrappedTds() {
  updateWrappedTds();
}

window.addEventListener("load", syncWrappedTds);

window.addEventListener("resize", function () {
  clearTimeout(__wrapResizeTimer);
  __wrapResizeTimer = setTimeout(syncWrappedTds, 120);
});

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(syncWrappedTds);
}
