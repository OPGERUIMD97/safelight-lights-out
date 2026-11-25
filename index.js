// Lights Out for Safelight.
//
// L cycles three steps: dim everything except the photo, cover it completely,
// then back to normal. Click or Esc restores normal. The key is rebindable in
// Preferences ▸ Shortcuts. Dim amount and veil colour live in
// Preferences ▸ Extensions.
//
// The photo rectangle is the Develop canvas inside [data-canvas-surround]
// (ViewportImage in DevelopCanvas). Its CSS transform is included in
// getBoundingClientRect, and the result is clipped to the viewport so a zoomed
// photo does not uncover the panels. Library has no single photo canvas, so
// when "Also in Library" is on the hole there is [data-dock-main]: the grid
// stays up and the panels dim. That switch is off by default, and L does
// nothing in Library.

const EXT = "safelight-lights-out";
const VEILS = { black: "#000000", grey: "#3a3a3a" };

let api = null;
let mode = 0;
let root = null;
let shade = null;
let raf = 0;
let onKey = null;
let onPointer = null;
let unsubModule = null;

export function activate(host) {
  api = host;

  api.registerSettings({
    title: "Lights Out",
    keywords: ["dim", "lights", "blackout", "veil"],
    fields: [
      {
        key: "dimPercent",
        label: "Dim amount",
        hint: "How much of the interface the first step covers, from 10 to 100. The second step covers it completely.",
        type: "number",
        default: 80,
        min: 10,
        max: 100,
        step: 5,
      },
      {
        key: "veil",
        label: "Veil colour",
        hint: "Black is the classic lights-out look. Grey is a dark neutral. Both steps use this colour.",
        type: "select",
        default: "black",
        options: [
          { value: "black", label: "Black" },
          { value: "grey", label: "Grey" },
        ],
      },
      {
        key: "inLibrary",
        label: "Also in Library",
        hint: "Off by default. L then does nothing in Library and leaves the grid alone. Develop is unchanged.",
        type: "boolean",
        default: false,
      },
    ],
  });

  api.settings.onChange(() => {
    if (mode !== 0 && libraryBlocked()) setMode(0);
    else if (mode !== 0) paint();
  });

  const store = api.stores && api.stores.useUIStore;
  if (store && typeof store.subscribe === "function") {
    unsubModule = store.subscribe(() => {
      if (mode !== 0 && libraryBlocked()) setMode(0);
    });
  }

  api.registerKeybinding({
    id: `${EXT}.cycle`,
    label: "Lights Out",
    category: "General",
    defaultCombo: "L",
    handler() {
      if (libraryBlocked()) return;
      setMode((mode + 1) % 3);
    },
  });
}

export function deactivate() {
  if (typeof unsubModule === "function") unsubModule();
  unsubModule = null;
  setMode(0);
  api = null;
}

function inLibrary() {
  const store = api && api.stores && api.stores.useUIStore;
  if (!store || typeof store.getState !== "function") return false;
  return store.getState().activeModule === "library";
}

function libraryBlocked() {
  if (api && api.settings.get("inLibrary") === true) return false;
  return inLibrary();
}

function readLook() {
  const raw = Number(api && api.settings.get("dimPercent"));
  const dimPercent = Number.isFinite(raw) ? Math.min(100, Math.max(10, raw)) : 80;
  const veil = api && api.settings.get("veil") === "grey" ? "grey" : "black";
  const alpha = mode === 2 ? 1 : dimPercent / 100;
  return { color: VEILS[veil], alpha };
}

function rgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function rectOf(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  return r;
}

function intersect(a, b) {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  if (right - left < 2 || bottom - top < 2) return null;
  return { left, top, width: right - left, height: bottom - top };
}

// Develop: the visible photo. Elsewhere: the module's centre column.
function holeRect() {
  const surround = document.querySelector("[data-canvas-surround]");
  const canvas = surround && surround.querySelector("canvas:not([aria-hidden])");
  if (canvas) {
    const frame = canvas.parentElement || surround;
    const hole = intersect(canvas.getBoundingClientRect(), frame.getBoundingClientRect());
    if (hole) return hole;
  }
  return rectOf(document.querySelector("[data-dock-main]"));
}

function paint() {
  if (!shade) return;
  const { color, alpha } = readLook();
  const hole = holeRect();
  if (!hole) {
    shade.style.left = "0";
    shade.style.top = "0";
    shade.style.width = "100%";
    shade.style.height = "100%";
    shade.style.boxShadow = "none";
    shade.style.background = rgba(color, alpha);
    return;
  }
  shade.style.left = `${hole.left}px`;
  shade.style.top = `${hole.top}px`;
  shade.style.width = `${hole.width}px`;
  shade.style.height = `${hole.height}px`;
  shade.style.background = "transparent";
  shade.style.boxShadow = `0 0 0 100vmax ${rgba(color, alpha)}`;
}

function frame() {
  paint();
  raf = requestAnimationFrame(frame);
}

function ensureOverlay() {
  if (root) return;
  root = document.createElement("div");
  root.dataset.lightsOut = "";
  Object.assign(root.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483000",
    pointerEvents: "none",
  });

  shade = document.createElement("div");
  shade.setAttribute("aria-hidden", "true");
  Object.assign(shade.style, { position: "fixed", pointerEvents: "none" });

  const catcher = document.createElement("div");
  Object.assign(catcher.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "auto",
    cursor: "default",
    background: "transparent",
  });
  onPointer = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setMode(0);
  };
  catcher.addEventListener("pointerdown", onPointer);

  root.append(shade, catcher);
  document.body.append(root);

  onKey = (event) => {
    if (event.key !== "Escape" || mode === 0) return;
    event.preventDefault();
    event.stopPropagation();
    setMode(0);
  };
  window.addEventListener("keydown", onKey, true);
  raf = requestAnimationFrame(frame);
}

function removeOverlay() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  if (onKey) window.removeEventListener("keydown", onKey, true);
  onKey = null;
  onPointer = null;
  if (root) root.remove();
  root = null;
  shade = null;
}

function setMode(next) {
  mode = next;
  if (mode === 0) removeOverlay();
  else ensureOverlay();
}
