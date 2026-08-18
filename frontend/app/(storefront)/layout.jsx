import Navbar from "../../components/Navbar.jsx";
import Footer from "../../components/Footer.jsx";
import SocialProofPopup from "../../components/SocialProofPopup.jsx";
import CartDrawer from "../../components/CartDrawer.jsx";

export default function StorefrontLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <SocialProofPopup />
      <CartDrawer />
    </>
  );
}
