declare module "html-to-pdfmake" {
  import type { Content } from "pdfmake/interfaces"
  function htmlToPdfmake(html: string, options?: { window?: Window }): Content
  export default htmlToPdfmake
}
