import './globals.css';
import { Providers } from './providers';
import { kanit } from './ui/fonts';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${kanit.className} antialiased`}>

        <Providers>
        {children}
        </Providers>
      </body>
    </html>
  );
}
