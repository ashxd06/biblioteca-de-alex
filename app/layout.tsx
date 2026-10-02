import "./globals.css";
export const metadata = { title:"Biblioteca de Alex", manifest:"/manifest.json" };
export const viewport = { themeColor:"#0b0b0d" };
export default function L({children}:{children:React.ReactNode}){
  return <html lang="es"><body className="min-h-screen"><div className="mx-auto max-w-3xl p-4">{children}</div>
  <script dangerouslySetInnerHTML={{__html:"if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js')"}}/></body></html>;
}
