import Image from "next/image";
import { notFound } from "next/navigation";
import { CheckCircle2, Star, ShieldCheck, Truck } from "lucide-react";
import api from "../../../lib/api.js";
import QuickOrderForm from "../QuickOrderForm.jsx";
import FlashSaleTimer from "../../../components/FlashSaleTimer.jsx";

async function getLandingPage(slug) {
  try {
    const res = await api.get(`/landing-pages/${slug}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const page = await getLandingPage(params.slug);
  if (!page) return { title: "Page not found" };
  return {
    title: page.headline,
    description: page.subheadline || page.product?.description?.slice(0, 155),
    openGraph: { images: page.heroImage ? [page.heroImage] : [] },
  };
}

export default async function LandingPage({ params }) {
  const page = await getLandingPage(params.slug);
  if (!page) notFound();

  const product = page.product;
  const price = page.price ?? product.discountPrice ?? product.price;
  const originalPrice = page.originalPrice ?? (page.price ? null : product.price);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border py-4 text-center">
        <span className="font-display font-800 text-lg">▣ TechArcade</span>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-8 grid md:grid-cols-2 gap-8">
        <div>
          <div className="aspect-square bg-card border border-border rounded-lg relative overflow-hidden">
            {page.heroImage || product.images?.[0] ? (
              <Image
                src={page.heroImage || product.images[0]}
                alt={page.headline}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 500px"
                className="object-cover"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                No image
              </span>
            )}
          </div>

          {product.flashSale?.active && product.flashSale?.endsAt && new Date(product.flashSale.endsAt) > new Date() && (
            <div className="mt-4 bg-destructive/10 border border-destructive/30 rounded-md p-3 flex items-center justify-between">
              <span className="text-sm text-destructive font-medium">ফ্ল্যাশ সেল শেষ হবে</span>
              <FlashSaleTimer endsAt={product.flashSale.endsAt} />
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mt-4 text-center">
            <div className="text-xs text-muted-foreground">
              <ShieldCheck className="h-5 w-5 text-primary mx-auto mb-1" />
              ১০০% জেনুইন
            </div>
            <div className="text-xs text-muted-foreground">
              <Truck className="h-5 w-5 text-primary mx-auto mb-1" />
              দ্রুত ডেলিভারি
            </div>
            <div className="text-xs text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary mx-auto mb-1" />
              {product.warranty || "ওয়ারেন্টি"}
            </div>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-800 leading-tight">{page.headline}</h1>
          {page.subheadline && <p className="text-muted-foreground mt-2">{page.subheadline}</p>}

          <div className="flex items-baseline gap-3 mt-4">
            <span className="text-primary text-3xl font-mono font-bold">৳{price}</span>
            {originalPrice && originalPrice > price && (
              <span className="text-muted-foreground line-through text-lg">৳{originalPrice}</span>
            )}
          </div>

          {page.bullets?.length > 0 && (
            <ul className="grid gap-2 mt-5">
              {page.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          )}

          {page.testimonialText && (
            <div className="border border-border rounded-md p-4 mt-5 bg-card">
              <div className="flex gap-0.5 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">"{page.testimonialText}"</p>
              {page.testimonialName && <p className="text-sm font-medium mt-2">— {page.testimonialName}</p>}
            </div>
          )}

          <div className="mt-6">
            <QuickOrderForm product={product} price={price} slug={page.slug} ctaText={page.ctaText} />
          </div>
        </div>
      </main>

      {/* Sticky mobile order bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border p-3 flex items-center justify-between gap-3 z-40">
        <span className="font-mono font-bold text-primary">৳{price}</span>
        <a
          href="#order-form"
          className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-md"
        >
          {page.ctaText || "অর্ডার করুন"}
        </a>
      </div>
      <div className="h-16 md:hidden" />
    </div>
  );
}
