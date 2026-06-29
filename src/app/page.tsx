import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Technology from "@/components/Technology";
import Infra from "@/components/Infra";
import Products from "@/components/Products";
import News from "@/components/News";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <About />
        <Technology />
        <Infra />
        <Products />
        <News />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
