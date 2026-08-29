import Image from "next/image"; 
import { notFound } from "next/navigation"; 
import { Star } from "lucide-react"; 
import api from "../../../../lib/api.js"; 
import AddToCartBar from "../../../../components/AddToCartBar.jsx"; 
import ProductReviews from "../../../../components/ProductReviews.jsx"; 
import FlashSaleTimer from "../../../../components/FlashSaleTimer.jsx"; 
 
async function getProduct(slug) { 
  try { 
    const res = await api.get(`/products/${slug}`); 
    return res.data; 
  } catch { 
    return null; 
  } 
} 
 
export async function generateMetadata({ params }) { 
  const { slug } = await params; 
  const product = await getProduct(slug); 
  if (!product) return { title: "Product not found — TechArcade" }; 
  return { 
    title: `${product.name} — TechArcade`, 
    description: product.description?.slice(0, 155), 
    openGraph: { 
      title: product.name, 
      description: product.description?.slice(0, 155), 
      images: product.images?.[0] ? [product.images[0]] : [], 
    }, 
  }; 
} 
 
export default async function ProductDetailPage({ params }) { 
  const { slug } = await params; 
  const product = await getProduct(slug); 
  if (!product) notFound(); 
 
  const price = product.discountPrice ?? product.price; 
 
  return ( 
    <> 
    <div className="max-w-6xl mx-auto px-5 py-10 grid md:grid-cols-2 gap-10"> 
      <div className="aspect-square bg-card border border-border rounded-md relative overflow-hidden"> 
        {product.images?.[0] ? ( 
          <Image 
            src={product.images[0]} 
            alt={product.name} 
            fill 
            sizes="(max-width: 768px) 100vw, 500px" 
            priority 
            className="object-cover" 
          /> 
        ) : ( 
          <span className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm"> 
            No image 
          </span> 
        )} 
      </div> 
 
      <div> 
        <p className="text-xs text-success font-mono uppercase tracking-wider">{product.category}</p> 
        <h1 className="text-2xl font-700 mt-1">{product.name}</h1> 
        {product.brand && <p className="text-muted-foreground text-sm mt-1">Brand: {product.brand}</p>} 
 
        {product.numReviews > 0 && ( 
          <div className="flex items-center gap-1.5 mt-2"> 
            <div className="flex gap-0.5"> 
              {Array.from({ length: 5 }).map((_, i) => ( 
                <Star 
                  key={i} 
                  className={`h-3.5 w-3.5 ${i < Math.round(product.rating) ? "fill-primary text-primary" : "text-muted-foreground/30"}`} 
                /> 
              ))} 
            </div> 
            <span className="text-xs text-muted-foreground"> 
              {product.rating} ({product.numReviews} review{product.numReviews === 1 ? "" : "s"}) 
            </span> 
          </div> 
        )} 
 
        <div className="flex items-baseline gap-3 mt-4"> 
          <span className="text-primary text-2xl font-mono font-bold">৳{price}</span> 
          {product.discountPrice && ( 
            <span className="text-muted-foreground line-through text-sm">৳{product.price}</span> 
          )} 
        </div> 
 
        <p className="text-muted-foreground text-sm mt-5 leading-relaxed">{product.description}</p> 
 
        {product.specs?.length > 0 && ( 
          <div className="mt-6 border border-border rounded-md divide-y divide-border"> 
            {product.specs.map((s, i) => ( 
              <div key={i} className="flex justify-between px-4 py-2 text-sm"> 
                <span className="text-muted-foreground">{s.key}</span> 
                <span>{s.value}</span> 
              </div> 
            ))} 
          </div> 
        )} 
 
        <p className="text-xs text-muted-foreground mt-4">Warranty: {product.warranty}</p> 
 
        {product.flashSale?.active && product.flashSale?.endsAt && new Date(product.flashSale.endsAt) > new Date() && ( 
          <div className="mt-3 flex items-center gap-2"> 
            <span className="text-xs text-muted-foreground">Flash sale ends in</span> 
            <FlashSaleTimer endsAt={product.flashSale.endsAt} /> 
          </div> 
        )} 
        {product.stock > 0 && product.stock <= 5 && ( 
          <p className="text-destructive text-xs font-medium mt-2">Only {product.stock} left in stock!</p> 
        )} 
 
        <AddToCartBar product={product} /> 
      </div> 
    </div> 
 
    <div className="max-w-6xl mx-auto px-5 pb-16"> 
      <ProductReviews productId={product._id} /> 
    </div> 
    </> 
  ); 
}