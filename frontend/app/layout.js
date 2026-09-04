import "./globals.css";

export const metadata = {
  title: "Jains Computer LMS",
  description: "Jains Computer Lecture Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
