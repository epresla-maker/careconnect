export const metadata = {
  title: "Pharmagister - Gyógyszertári Helyettesítés",
  description: "Gyógyszertári helyettesítési platform. Kösd össze a gyógyszertárakat és a helyettesítőket.",
  themeColor: "#0891b2",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pharmagister"
  }
};

export default function PharmagisterLayout({ children }) {
  return <>{children}</>;
}
