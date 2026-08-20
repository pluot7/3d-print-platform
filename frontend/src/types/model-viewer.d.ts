// Type declarations for model-viewer
// https://github.com/GoogleWebComponents/model-viewer

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src: string;
          alt?: string;
          'auto-rotate'?: boolean | string;
          'camera-controls'?: boolean | string;
          'orbit-sensitivity'?: number | string;
          loading?: 'lazy' | 'eager' | string;
          'shadow-intensity'?: number | string;
          exposure?: number | string;
          scale?: string;
          poster?: string;
          'camera-orbit'?: string;
          'field-of-view'?: string;
          ar?: boolean | string;
          'ar-modes'?: string;
          'background-color'?: string;
          class?: string;
          style?: React.CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}

export {};