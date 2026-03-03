declare module 'pdf-parse' {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  }

  export interface PdfParseOptions {
    pagerender?: (pageData: any) => string;
    max?: number;
  }

  function pdf(dataBuffer: Buffer, options?: PdfParseOptions): Promise<PDFData>;

  export = pdf;
}
