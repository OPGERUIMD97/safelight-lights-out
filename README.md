# Lights Out

Dim or cover the Safelight interface so the photo is all you see. Three steps, same idea as a darkroom lights-out control:

1. Everything except the photo is dimmed (80% by default).
2. Everything except the photo is covered completely.
3. The interface is back to normal.

**L** cycles the steps. The key can be changed in **Preferences ▸ Shortcuts** (General ▸ Lights Out). **Click** or **Esc** returns to normal from either dimmed step.

Dim amount, veil colour and Library are in **Preferences ▸ Extensions ▸ Lights Out**.

- **Dim amount** — how much of the interface the first step covers (10–100). The second step is always fully covered.
- **Veil colour** — Black or Grey. Both steps use the colour you pick. Black is the default.
- **Also in Library** — off by default. While it is off, L does nothing in Library and the grid stays as it is. Turn it on to dim the panels there too; the grid itself stays visible, because Library has no single photo. Switching to Library while this is off clears a dim that was started in Develop.

No build step; `index.js` is the bundle.

## Install

In Safelight, go to **View ▸ Extensions** and enter:

```
OPGERUIMD97/safelight-lights-out
```

Needs Safelight 3.2.0 or newer.

## Where the hole is cut

Checked against the Safelight source:

- In **Develop**, the photo is the `<canvas>` inside `[data-canvas-surround]` (`DevelopStage` / `ViewportImage`). The canvas is positioned with a CSS transform, and `getBoundingClientRect()` includes that transform. The rectangle is clipped to the viewport, so a zoomed photo does not uncover the panels. The grey surround around the photo is dimmed with everything else.
- **Library** has no single photo canvas. With **Also in Library** on, the hole is `[data-dock-main]`, the centre column, so the grid stays visible and the panels dim. With it off, L does not run in Library.

The app does not expose the photo rectangle on the extension API. This uses those two stable attributes rather than Tailwind class names.

## License

MIT
