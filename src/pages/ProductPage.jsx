import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { formatPrice, discountPercent, whatsappLink, attributesEqual } from '../lib/helpers';
import { useCart } from '../context/CartContext';
import { useSite } from '../context/SiteContext';
import ProductCard from '../components/ProductCard';
import ZoomImage from '../components/ZoomImage';

export default function ProductPage() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { settings } = useSite();

  const [product, setProduct] = useState(null);
  const [category, setCategory] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [variants, setVariants] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);
  const [activeImg, setActiveImg] = useState(0);
  const [selected, setSelected] = useState({}); // { Size: 'M', Color: 'Red' }
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('description');

  useEffect(() => {
    async function load() {
      let { data: p } = await supabase.from('products').select('*').eq('slug', idOrSlug).maybeSingle();
      if (!p) {
        const res = await supabase.from('products').select('*').eq('id', idOrSlug).maybeSingle();
        p = res.data;
      }
      if (!p) return;
      setProduct(p);
      setActiveImg(0);
      setQty(1);
      setSelected({});

      if (p.category_id) {
        const { data: cat } = await supabase.from('categories').select('*').eq('id', p.category_id).maybeSingle();
        setCategory(cat);
        const { data: rel } = await supabase.from('products').select('*').eq('category_id', p.category_id).neq('id', p.id).limit(10);
        setRelated(rel || []);
      }
      if (p.product_type === 'variable') {
        const { data: a } = await supabase.from('product_attributes').select('*').eq('product_id', p.id).order('position');
        setAttributes(a || []);
        const { data: v } = await supabase.from('product_variants').select('*').eq('product_id', p.id).order('position');
        setVariants(v || []);
      } else {
        setAttributes([]);
        setVariants([]);
      }
      const { data: r } = await supabase.from('product_reviews').select('*').eq('product_id', p.id).order('created_at', { ascending: false });
      setReviews(r || []);
    }
    load();
  }, [idOrSlug]);

  if (!product) return <div className="container" style={{ padding: 40 }}>Loading...</div>;

  const isVariable = product.product_type === 'variable';
  const images = product.images?.length ? product.images : ['https://placehold.co/500x500?text=No+Image'];

  const allSelected = isVariable && attributes.length > 0 && attributes.every((a) => selected[a.name]);
  const matchedVariant = allSelected ? variants.find((v) => attributesEqual(v.attributes, selected)) : null;

  const activeStock = isVariable ? (matchedVariant?.stock ?? 0) : product.stock;
  const activePrice = isVariable
    ? (matchedVariant ? (matchedVariant.discounted_price || matchedVariant.regular_price) : null)
    : (product.discounted_price || product.regular_price);
  const activeRegular = isVariable ? matchedVariant?.regular_price : product.regular_price;
  const off = discountPercent(activeRegular, isVariable ? matchedVariant?.discounted_price : product.discounted_price);
  const activeSku = isVariable ? matchedVariant?.sku : product.sku;
  const displayImage = matchedVariant?.image_url || images[activeImg];

  function selectAttribute(name, value) {
    setSelected((prev) => ({ ...prev, [name]: prev[name] === value ? undefined : value }));
  }

  function cartProduct() {
    return {
      id: product.id,
      name: product.name,
      images: matchedVariant?.image_url ? [matchedVariant.image_url] : product.images,
      discounted_price: activePrice,
      regular_price: activePrice,
    };
  }

  const variantLabel = isVariable ? Object.entries(selected).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ') : '';

  return (
    <div className="container">
      <div className="breadcrumb">Home / Shop / {category?.name} / {product.name}</div>
      <div className="product-detail">
        <div>
          <div className="product-gallery-main">
            <ZoomImage src={displayImage} alt={product.name} />
          </div>
          <div className="product-thumbs">
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                className={i === activeImg && !matchedVariant?.image_url ? 'active' : ''}
                onClick={() => setActiveImg(i)}
              />
            ))}
          </div>
        </div>

        <div>
          {category && <div className="pd-cat">{category.name}</div>}
          <h1 className="pd-name">{product.name}</h1>
          {activeSku && <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>SKU: {activeSku}</div>}

          {!isVariable && (
            <div className="pd-stock">{product.stock > 0 ? `In stock (${product.stock})` : 'Out of stock'}</div>
          )}
          {isVariable && matchedVariant && (
            <div className="pd-stock">{activeStock > 0 ? `In stock (${activeStock})` : 'Out of stock'}</div>
          )}

          {isVariable && attributes.map((a) => (
            <div className="pd-options" key={a.id}>
              <h5>{a.name}{!selected[a.name] && <span style={{ color: 'var(--danger)' }}> *</span>}</h5>
              <div className="pd-option-list">
                {(a.values || []).map((v) => (
                  <div
                    key={v}
                    className={`pd-option-chip ${selected[a.name] === v ? 'active' : ''}`}
                    onClick={() => selectAttribute(a.name, v)}
                  >
                    {v}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {(!isVariable || matchedVariant) && (
            <div className="pd-price-row">
              <span className="now">{formatPrice(activePrice)}</span>
              {off > 0 && <span className="old">{formatPrice(activeRegular)}</span>}
              {off > 0 && <span className="save">Save {off}%</span>}
            </div>
          )}

          {(!isVariable || matchedVariant) && (
            <div className="pd-qty-row">
              <div className="qty-stepper">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>-</button>
                <input value={qty} readOnly />
                <button type="button" onClick={() => setQty((q) => q + 1)}>+</button>
              </div>
            </div>
          )}

          <div className="pd-actions">
            {isVariable && !matchedVariant ? (
              <button className="btn btn-select-pill" disabled style={{ opacity: .8 }}>Select an option</button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={activeStock <= 0}
                  onClick={() => addItem(cartProduct(), qty, variantLabel, matchedVariant?.id || null)}
                >
                  Add to Bag
                </button>
                <button
                  type="button"
                  className="btn btn-teal"
                  disabled={activeStock <= 0}
                  onClick={() => {
                    addItem(cartProduct(), qty, variantLabel, matchedVariant?.id || null);
                    navigate('/checkout');
                  }}
                >
                  Buy Now
                </button>
              </>
            )}
          </div>

          <div className="pd-help">Need help? Feel free to contact us anytime</div>
          <a className="btn btn-teal pd-whatsapp" href={whatsappLink(settings.whatsapp, `Hi, I'm interested in ${product.name}`)} target="_blank" rel="noreferrer">
            💬 Whatsapp Order — {settings.whatsapp}
          </a>

          <div className="pd-tabs">
            <button className={`pd-tab ${tab === 'description' ? 'active' : ''}`} onClick={() => setTab('description')}>Description</button>
            <button className={`pd-tab ${tab === 'delivery' ? 'active' : ''}`} onClick={() => setTab('delivery')}>Delivery Info</button>
            <button className={`pd-tab ${tab === 'reviews' ? 'active' : ''}`} onClick={() => setTab('reviews')}>Reviews ({reviews.length})</button>
          </div>
          <div className="pd-tab-content">
            {tab === 'description' && (
              product.description
                ? <div className="rich-content" dangerouslySetInnerHTML={{ __html: product.description }} />
                : 'No description yet.'
            )}
            {tab === 'delivery' && (product.delivery_info || 'No delivery info yet.')}
            {tab === 'reviews' && (
              reviews.length === 0 ? 'No reviews yet.' :
              reviews.map((r) => (
                <div className="review-item" key={r.id}>
                  <div className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                  <strong>{r.author}</strong>
                  <p style={{ margin: '4px 0 0' }}>{r.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="section">
          <div className="section-head"><h3>You may also like</h3></div>
          <div className="product-grid">
            {related.map((p) => <ProductCard key={p.id} product={p} categoryName={category?.name} />)}
          </div>
        </div>
      )}
    </div>
  );
}
