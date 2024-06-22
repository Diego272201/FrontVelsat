import SessionAuthProvider from '@/context/SessionAuthProvider';
import './globals.css';
import { Providers } from './providers';
// import { poppins} from './ui/fonts';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <link rel="icon" href="/favicon.ico"  type="image/x-icon"/>
      
      <body>
        <SessionAuthProvider>
          {children}
        </SessionAuthProvider>
      </body>

      {/* <body className={`${poppins.className} antialiased`}>{children}</body> */}
    </html>
  );
}
