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
    width: 100%;
  }
  .tp-sized-button .tp-btnc,
  .tp-boolean-button .tp-btnc {
    --tp-btnc-gap: 6px;
    --tp-btnc-rail-size: 16px;
    align-items: center;
    box-sizing: border-box;
    column-gap: var(--tp-btnc-gap);
    display: grid;
    grid-template-columns:
      var(--tp-btnc-rail-size)
      minmax(0, 1fr)
      var(--tp-btnc-rail-size);
    max-width: 100%;
    min-width: 0;
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
    justify-content: flex-end;
  }
  .tp-sized-button .tp-btnc_tr,
  .tp-boolean-button .tp-btnc_tr {
    align-items: center;
    display: flex;
    justify-content: center;
  }
  .tp-sized-button .tp-btnc_iw,
  .tp-boolean-button .tp-btnc_iw {
    align-items: center;
    display: inline-flex;
    flex: 0 0 auto;
    height: var(--tp-btnc-rail-size);
    justify-content: center;
    width: var(--tp-btnc-rail-size);
  }
  .tp-sized-button .tp-btnc_tw,
  .tp-boolean-button .tp-btnc_tw {
    display: block;
    max-width: 100%;
    min-width: 0;
    text-align: center;
    white-space: pre-line;
  }
  .tp-sized-button .tp-btnc_i,
  .tp-boolean-button .tp-btnc_i {
    display: block;
    fill: none;
    height: 16px;
    stroke: currentColor;
    stroke-width: 1.5;
    width: 16px;
  }
  .tp-sized-button .tp-btnc-icon,
  .tp-boolean-button .tp-btnc-icon {
    grid-template-columns: 1fr var(--tp-btnc-rail-size) 1fr;
  }
  .tp-sized-button .tp-btnc-icon .tp-btnc_ir,
  .tp-boolean-button .tp-btnc-icon .tp-btnc_ir {
    grid-column: 2;
    justify-content: center;
  }
  .tp-sized-button .tp-btnc-icon .tp-btnc_tr,
  .tp-sized-button .tp-btnc-icon .tp-btnc_gh,
  .tp-boolean-button .tp-btnc-icon .tp-btnc_tr,
  .tp-boolean-button .tp-btnc-icon .tp-btnc_gh {
    display: none;
  }
`;
