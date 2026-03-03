declare global {
  interface Window {
    pdfjsLib: {
      getDocument: (params: { data: ArrayBuffer }) => {
        promise: Promise<{
          getPage: (pageNumber: number) => Promise<{
            getViewport: (params: { scale: number }) => {
              height: number
              width: number
            }
            render: (params: {
              canvasContext: CanvasRenderingContext2D
              viewport: any
            }) => {
              promise: Promise<void>
            }
          }>
        }>
      }
      GlobalWorkerOptions: {
        workerSrc: string
      }
    }
  }
}

export {}