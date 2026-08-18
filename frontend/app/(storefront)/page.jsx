import Link from "next/link";
import {
  ShieldCheck,
  Truck,
  BadgeCheck,
  Wallet,
  Smartphone,
  Laptop,
  Headphones,
  Watch,
  Gamepad2,
  Home as HomeIcon,
  Cable,
  ArrowRight,
  Star,
} from "lucide-react";
import api from "../../lib/api.js";
import ProductCard from "../../components/ProductCard.jsx";
import { Button } from "../../components/ui/button.jsx";
import { Card, CardContent } from "../../components/ui/card.jsx";
import { Badge } from "../../components/ui/badge.jsx";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../../components/ui/accordion.jsx";

const CATEGORIES = [
  { name: "Mobile", icon: Smartphone },
  { name: "Laptop", icon: Laptop },
  { name: "Audio", icon: Headphones },
  { name: "Wearable", icon: Watch },
  { name: "Gaming", icon: Gamepad2 },
  { name: "Smart Home", icon: HomeIcon },
  { name: "Accessories", icon: Cable },
];

const TRUST_POINTS = [
  { icon: BadgeCheck, title: "100% genuine products", body: "Every item is sourced and checked before it ships." },
  { icon: Truck, title: "Nationwide delivery", body: "Delivered to all 64 districts, tracked door to door." },
  { icon: Wallet, title: "Flexible payment", body: "bKash, Nagad, or Cash on Delivery — your choice." },
  { icon: ShieldCheck, title: "Verified before shipping", body: "Manual payment checks mean no fake confirmations." },
];

const STEPS = [
  { step: "01", title: "Browse & choose", body: "Pick your gadget and add it to the cart." },
  { step: "02", title: "Checkout", body: "Enter delivery details and pick bKash, Nagad, or COD." },
  { step: "03", title: "We verify", body: "Our team confirms your payment within minutes." },
  { step: "04", title: "It ships", body: "Your order is packed and on its way — tracked end to end." },
];

const TESTIMONIALS = [
  { name: "Rafiul H.", text: "Ordered a phone case and earbuds — arrived in 2 days, exactly as described.", rating: 5 },
  { name: "Nusrat J.", text: "bKash payment was verified quickly and they messaged me on WhatsApp to confirm.", rating: 5 },
  { name: "Tanvir A.", text: "Good prices compared to local shops, and genuine products.", rating: 4 },
];

const FAQS = [
  { q: "Delivery কতদিনে পাবো?", a: "ঢাকার ভিতরে সাধারণত ১-২ দিন, ঢাকার বাইরে ৩-৫ দিন সময় লাগে।" },
  { q: "bKash/Nagad payment safe তো?", a: "হ্যাঁ। আপনি Send Money করার পর TrxID দেন, আমরা manually verify করেই order confirm করি — কোনো তথ্য শেয়ার করা লাগে না।" },
  { q: "Product খারাপ হলে return করা যাবে?", a: "হ্যাঁ, ডেলিভারির ৩ দিনের মধ্যে unused/unboxed product এর জন্য replacement দেওয়া হয়।" },
  { q: "Cash on Delivery সব জায়গায় আছে?", a: "হ্যাঁ, সারা বাংলাদেশে Cash on Delivery available।" },
];

async function getFeaturedProducts() {
  try {
    const res = await api.get("/products", { params: { featured: true, limit: 8 } });
    return res.data.products;
  } catch {
    return [];
  }
}

export default async function Home() {
  const featured = await getFeaturedProducts();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto px-5 pt-20 pb-14">
          <Badge variant="outline" className="font-mono text-xs mb-4">
            genuine electronics · bangladesh
          </Badge>
          <h1 className="text-4xl sm:text-6xl font-800 leading-[1.05] max-w-3xl">
            Gadgets that arrive as promised — <span className="text-primary">tested, boxed, delivered.</span>
          </h1>
          <p className="text-muted-foreground mt-6 max-w-xl text-base sm:text-lg">
            Order phones, laptops, and accessories with Cash on Delivery or bKash/Nagad —
            every payment personally verified before your order ships.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Button size="lg" asChild>
              <Link href="/shop">
                Browse the shop <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/shop?featured=true">See best sellers</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-5 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TRUST_POINTS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-3">
              <Icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <h2 className="text-xl font-700 mb-6">Shop by category</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {CATEGORIES.map(({ name, icon: Icon }) => (
            <Link
              key={name}
              href={`/shop?category=${encodeURIComponent(name)}`}
              className="chip-card flex flex-col items-center justify-center gap-2 py-6 hover:border-primary hover:shadow-sm transition-all"
            >
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium text-center">{name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="max-w-6xl mx-auto px-5 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-700">Featured this week</h2>
          <Link href="/shop" className="text-sm text-primary flex items-center gap-1 hover:underline">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No featured products yet. Mark a product "Featured" in the admin panel to show it here.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {featured.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </section>

      <div className="trace-divider max-w-6xl mx-auto" />

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <h2 className="text-xl font-700 mb-8">How ordering works</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map(({ step, title, body }) => (
            <Card key={step}>
              <CardContent className="p-5">
                <span className="font-mono text-2xl text-primary/50">{step}</span>
                <p className="font-medium mt-3">{title}</p>
                <p className="text-sm text-muted-foreground mt-1">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <h2 className="text-xl font-700 mb-8">What customers say</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name}>
                <CardContent className="p-5">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < t.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">"{t.text}"</p>
                  <p className="text-sm font-medium mt-4">{t.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-5 py-16">
        <h2 className="text-xl font-700 mb-6">Frequently asked questions</h2>
        <Accordion type="single" collapsible>
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger>{f.q}</AccordionTrigger>
              <AccordionContent>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-5 pb-20">
        <Card className="bg-primary text-primary-foreground border-none">
          <CardContent className="p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-700">Ready to find your next gadget?</h3>
              <p className="text-primary-foreground/80 text-sm mt-1">
                Genuine electronics, verified payment, delivered across Bangladesh.
              </p>
            </div>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/shop">
                Start shopping <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
