import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MazCom | Reparación de Móviles, Tablets y Ordenadores en Boadilla",
  description: "Servicio técnico especializado en Boadilla del Monte. Reparación de móviles, tablets y ordenadores. Venta de accesorios. ¡Pide tu cita por WhatsApp!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${outfit.variable}`}>
        {children}
      </body>
    </html>
  );
}
