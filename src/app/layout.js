import "./globals.css";

export const metadata = {
  title: "The Cut Barbershop",
  description: "Thoughtful barbering, considered grooming, and good company.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
