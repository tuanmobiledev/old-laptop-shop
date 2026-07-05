import React, { useState } from 'react';
import { Edit3, LogOut, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { formatCurrency } from './data.js';

const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || 'change-me-in-production';
const STORAGE_KEYS = { admin: 'oscar-admin-token', products: 'oscar-products-v2' };

const createProductId = () => Date.now();

const productDraft = () => ({
  id: '', name: '', category: 'laptop-cu', brand: 'Dell',
  cpu: '', gpu: '', ram: '', ssd: '', screen: '',
  demand: 'office', stock: 1, price: 0, oldPrice: 0,
  image: '/product-images/098-thinkpad-t14s-gen-2-1-8896f4af23ce.webp',
  color: '#255f85', batteryWh: '', batteryRuntime: '',
  condition: { vi: 'Máy cũ', en: 'Used' },
  badge: { vi: 'Liên hệ xác nhận hàng', en: 'Contact to confirm' },
  specs: { vi: [], en: [] },
  promo: { vi: 'Hàng tuyển chọn tại Laptop OSCAR', en: 'Laptop OSCAR selected device' },
  rating: 4.7, reviews: 0, type: 'catalog',
});

const normalizeAdminProduct = (draft) => ({
  ...productDraft(),
  ...draft,
  id: Number(draft.id) || createProductId(),
  price: Number(draft.price) || 0,
  oldPrice: Number(draft.oldPrice) || Number(draft.price) || 0,
  stock: Number(draft.stock) || 0,
  batteryWh: draft.batteryWh ? Number(draft.batteryWh) : undefined,
  specs: {
    vi: [draft.cpu, draft.gpu, `${draft.ram} RAM`, `${draft.ssd} SSD`, draft.screen].filter(Boolean),
    en: [draft.cpu, draft.gpu, `${draft.ram} RAM`, `${draft.ssd} SSD`, draft.screen].filter(Boolean),
  },
});

export default function AdminProductsPage({ products, setProducts, t }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEYS.admin) || '');
  const [tokenInput, setTokenInput] = useState('');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(productDraft());
  const [query, setQuery] = useState('');
  const isAdmin = token === ADMIN_TOKEN;
  const visibleProducts = products.filter((p) =>
    `${p.name} ${p.brand} ${p.cpu} ${p.gpu}`.toLowerCase().includes(query.toLowerCase())
  );
  const login = (e) => {
    e.preventDefault();
    if (tokenInput.trim() === ADMIN_TOKEN) {
      localStorage.setItem(STORAGE_KEYS.admin, tokenInput.trim());
      setToken(tokenInput.trim());
      setTokenInput('');
    }
  };
  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.admin);
    setToken('');
    setEditing(null);
  };
  const startCreate = () => { setEditing('new'); setDraft(productDraft()); };
  const startEdit = (p) => { setEditing(p.id); setDraft({ ...p, batteryWh: p.batteryWh || '' }); };
  const saveProduct = (e) => {
    e.preventDefault();
    const saved = normalizeAdminProduct(draft);
    setProducts((cur) => editing === 'new' ? [saved, ...cur] : cur.map((i) => i.id === editing ? saved : i));
    setEditing(null);
    setDraft(productDraft());
  };
  const removeProduct = (id) => {
    if (!window.confirm(t.adminDeleteConfirm)) return;
    setProducts((cur) => cur.filter((i) => i.id !== id));
  };
  const field = (label, key, type = 'text') => (
    <label>
      <span>{label}</span>
      <input
        type={type}
        value={draft[key] || ''}
        onChange={(e) => setDraft((cur) => ({ ...cur, [key]: e.target.value }))}
        required={['name', 'price'].includes(key)}
      />
    </label>
  );

  if (!isAdmin) return (
    <section className="section shell admin-page admin-login" id="admin">
      <div className="admin-login-card">
        <span className="eyebrow"><ShieldCheck size={16} /> {t.adminOnly}</span>
        <h1>{t.adminLoginTitle}</h1>
        <p>{t.adminTokenHelp}</p>
        <form onSubmit={login}>
          <input type="password" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder={t.adminTokenPlaceholder} autoComplete="current-password" />
          <button className="primary" type="submit">{t.login}</button>
        </form>
      </div>
    </section>
  );

  return (
    <section className="section shell admin-page" id="admin">
      <div className="admin-hero">
        <div>
          <span className="eyebrow"><ShieldCheck size={16} /> {t.adminDashboard}</span>
          <h1>{t.adminTitle}</h1>
          <p>{t.adminDesc}</p>
        </div>
        <div className="admin-actions">
          <button className="primary" onClick={startCreate}><Plus size={18} /> {t.addProduct}</button>
          <button className="secondary dark" onClick={logout}><LogOut size={18} /> {t.logout}</button>
        </div>
      </div>
      {editing && (
        <form className="admin-form" onSubmit={saveProduct}>
          <div className="admin-form-head">
            <h2>{editing === 'new' ? t.addProduct : t.editProduct}</h2>
            <button type="button" onClick={() => setEditing(null)}><X size={18} /></button>
          </div>
          <div className="admin-fields">
            {field(t.adminProductName, 'name')}
            {field(t.filterBrand, 'brand')}
            {field('CPU', 'cpu')}
            {field(t.adminGpu, 'gpu')}
            {field('RAM', 'ram')}
            {field('SSD', 'ssd')}
            {field(t.screenLabel, 'screen')}
            {field(t.adminSalePrice, 'price', 'number')}
            {field(t.adminOldPrice, 'oldPrice', 'number')}
            {field(t.adminStock, 'stock', 'number')}
            {field(t.adminImageUrl, 'image')}
            <label>
              <span>{t.category}</span>
              <select value={draft.category} onChange={(e) => setDraft((cur) => ({ ...cur, category: e.target.value }))}>
                <option value="laptop-cu">Laptop</option>
                <option value="linh-kien">{t.partsCategory}</option>
              </select>
            </label>
            <label>
              <span>{t.demand}</span>
              <select value={draft.demand} onChange={(e) => setDraft((cur) => ({ ...cur, demand: e.target.value }))}>
                <option value="office">{t.office}</option>
                <option value="student">{t.student}</option>
                <option value="gaming">{t.gaming}</option>
                <option value="creator">{t.creator}</option>
                <option value="render">{t.render}</option>
              </select>
            </label>
          </div>
          <button className="primary" type="submit">{t.saveProduct}</button>
        </form>
      )}
      <div className="admin-toolbar">
        <strong>{products.length} {t.productCount}</strong>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.adminSearchPlaceholder} />
      </div>
      <div className="admin-table">
        {visibleProducts.map((p) => (
          <article key={p.id}>
            <img src={p.image} alt="" loading="lazy" />
            <div>
              <h3>{p.name}</h3>
              <p>{p.brand} • {p.cpu} • {p.ram}/{p.ssd}</p>
              <strong>{formatCurrency(p.price)}</strong>
            </div>
            <span>{t.stock}: {p.stock ?? 0}</span>
            <button onClick={() => startEdit(p)}><Edit3 size={17} /> {t.edit}</button>
            <button className="danger" onClick={() => removeProduct(p.id)}><Trash2 size={17} /> {t.delete}</button>
          </article>
        ))}
      </div>
    </section>
  );
}
