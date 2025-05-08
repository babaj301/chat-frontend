import "./globals.css";
import { SocketProvider } from "../context/SocketContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body className='bg-white min-h-screen'>
        <SocketProvider>{children}</SocketProvider>
      </body>
    </html>
  );
}
