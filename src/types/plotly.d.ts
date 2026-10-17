declare module 'plotly.js-basic-dist-min' {
  // Tipado mínimo de la parte de la API de Plotly que usa la aplicación.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Any = any;
  const Plotly: {
    react(el: HTMLElement, data: Any[], layout: Any, config?: Any): Promise<Any>;
    newPlot(el: HTMLElement, data: Any[], layout: Any, config?: Any): Promise<Any>;
    relayout(el: HTMLElement, update: Any): Promise<Any>;
    purge(el: HTMLElement): void;
    downloadImage(el: HTMLElement, opts: Any): Promise<string>;
    Plots: { resize(el: HTMLElement): void };
  };
  export default Plotly;
}
