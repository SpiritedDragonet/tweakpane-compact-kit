/**
 * Shared button-content styles.
 *
 * Both custom button plugins render through the same content DOM now, so the
 * icon/text alignment rules live in one place instead of leaking from one
 * plugin's stylesheet into the other.
 */
export const BUTTON_CONTENT_CSS = `
  .tp-sized-button .tp-btnv_c,
  .tp-boolean-button .tp-btnv_c {
    align-items: center;
    display: flex;
    justify-content: center;
    height: 100%;
    width: 100%;
  }
  .tp-sized-button .tp-btnc,
  .tp-boolean-button .tp-btnc {
    --tp-btnc-gap: 6px;
    --tp-btnc-icon-size: 16px;
    --tp-btnc-anchor: clamp(calc(var(--tp-btnc-icon-size) + 14px), 28%, 92px);
    --tp-btnc-text-pad-start: calc(var(--tp-btnc-anchor) + (var(--tp-btnc-icon-size) * 0.5) + var(--tp-btnc-gap));
    --tp-btnc-text-pad-end: max(12px, calc(var(--tp-btnc-icon-size) * 0.75));
    align-items: center;
    box-sizing: border-box;
    display: flex;
    height: 100%;
    justify-content: center;
    min-width: 0;
    position: relative;
    width: 100%;
  }
  .tp-sized-button .tp-btnc_ir,
  .tp-sized-button .tp-btnc_tr,
  .tp-sized-button .tp-btnc_gh,
  .tp-boolean-button .tp-btnc_ir,
  .tp-boolean-button .tp-btnc_tr,
  .tp-boolean-button .tp-btnc_gh {
    min-width: 0;
  }
  .tp-sized-button .tp-btnc_ir,
  .tp-boolean-button .tp-btnc_ir {
    align-items: center;
    display: flex;
    justify-content: center;
  }
  .tp-sized-button .tp-btnc_iw,
  .tp-boolean-button .tp-btnc_iw {
    align-items: center;
    display: inline-flex;
    flex: 0 0 auto;
    height: var(--tp-btnc-icon-size);
    justify-content: center;
    width: var(--tp-btnc-icon-size);
  }
  .tp-sized-button .tp-btnc_tw,
  .tp-boolean-button .tp-btnc_tw {
    display: block;
    line-height: 1.05;
    max-width: 100%;
    min-width: 0;
    overflow-wrap: anywhere;
    text-align: center;
    white-space: pre-line;
  }
  .tp-sized-button .tp-btnc_i,
  .tp-boolean-button .tp-btnc_i {
    display: block;
    fill: none;
    height: var(--tp-btnc-icon-size);
    stroke: currentColor;
    stroke-width: 1.5;
    width: var(--tp-btnc-icon-size);
  }
  .tp-sized-button .tp-btnc-mixed .tp-btnc_ir,
  .tp-boolean-button .tp-btnc-mixed .tp-btnc_ir {
    left: var(--tp-btnc-anchor);
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
  }
  .tp-sized-button .tp-btnc-mixed .tp-btnc_tr,
  .tp-boolean-button .tp-btnc-mixed .tp-btnc_tr {
    align-items: center;
    display: flex;
    height: 100%;
    justify-content: center;
    min-width: 0;
    padding-inline-end: var(--tp-btnc-text-pad-end);
    padding-inline-start: var(--tp-btnc-text-pad-start);
    width: 100%;
  }
  .tp-sized-button .tp-btnc-mixed .tp-btnc_gh,
  .tp-boolean-button .tp-btnc-mixed .tp-btnc_gh {
    display: none;
  }
  .tp-sized-button .tp-btnc-text,
  .tp-sized-button .tp-btnc-icon,
  .tp-sized-button .tp-btnc-empty,
  .tp-boolean-button .tp-btnc-text,
  .tp-boolean-button .tp-btnc-icon,
  .tp-boolean-button .tp-btnc-empty {
    align-items: center;
    display: flex;
    justify-content: center;
  }
  .tp-sized-button .tp-btnc-text .tp-btnc_tr,
  .tp-sized-button .tp-btnc-icon .tp-btnc_ir,
  .tp-boolean-button .tp-btnc-text .tp-btnc_tr,
  .tp-boolean-button .tp-btnc-icon .tp-btnc_ir {
    align-items: center;
    display: flex;
    height: 100%;
    justify-content: center;
    width: 100%;
  }
  .tp-sized-button .tp-btnc-empty,
  .tp-sized-button .tp-btnc-text .tp-btnc_ir,
  .tp-sized-button .tp-btnc-text .tp-btnc_gh,
  .tp-sized-button .tp-btnc-icon .tp-btnc_tr,
  .tp-sized-button .tp-btnc-icon .tp-btnc_gh,
  .tp-boolean-button .tp-btnc-empty,
  .tp-boolean-button .tp-btnc-text .tp-btnc_ir,
  .tp-boolean-button .tp-btnc-text .tp-btnc_gh,
  .tp-boolean-button .tp-btnc-icon .tp-btnc_tr,
  .tp-boolean-button .tp-btnc-icon .tp-btnc_gh {
    display: none;
  }
`;
