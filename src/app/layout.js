import "./globals.css";

export const metadata = {
  title: "SENTRY-360 // Control Console",
  description: "Guardian Ambiental IoT · Centro de control en tiempo real",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}
