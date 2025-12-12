
declare module 'mermaid' {
  interface MermaidConfig {
    startOnLoad?: boolean;
    theme?: 'default' | 'forest' | 'dark' | 'neutral' | 'base';
    themeVariables?: Record<string, string>;
    [key: string]: any;
  }

  interface MermaidAPI {
    initialize(config: MermaidConfig): void;
    render(
      id: string,
      txt: string,
      cb?: (svgCode: string, bindFunctions: (element: Element) => void) => void,
      container?: Element
    ): Promise<{svg: string, bindFunctions?: (element: Element) => void}>;
    parse(text: string): Promise<boolean>;
  }

  const mermaid: MermaidAPI;
  export default mermaid;
}
