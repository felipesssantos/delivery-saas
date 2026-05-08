"use client";

import { useState } from "react";
import CategoryForm from "./CategoryForm";
import ProductForm from "./ProductForm";
import ProductAddonsManager from "./ProductAddonsManager";

// Types derived from Prisma schema
type AddonOption = {
  id: string;
  name: string;
  price: number;
};

type AddonCategory = {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  pricingMethod: "SUM" | "AVERAGE" | "HIGHEST";
  options: AddonOption[];
};

type AddonLink = {
  addonCategoryId: string;
  addonCategory: AddonCategory;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  isActive: boolean;
  addonLinks: AddonLink[];
};

type Category = {
  id: string;
  name: string;
  isActive: boolean;
  products: Product[];
};

export default function MenuClient({ initialCategories, addonCategories }: { initialCategories: Category[]; addonCategories: AddonCategory[] }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const selectedCategory = initialCategories.find(c => c.id === selectedCategoryId) || null;

  // Modal states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [addonsProductId, setAddonsProductId] = useState<string | null>(null);
  
  const allProducts = initialCategories.flatMap(c => c.products);
  const addonsProduct = allProducts.find(p => p.id === addonsProductId) || null;

  const handleOpenCategoryModal = (category?: Category) => {
    setCategoryToEdit(category || null);
    setIsCategoryModalOpen(true);
  };

  const handleCloseCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setCategoryToEdit(null);
  };

  const handleOpenProductModal = (product?: Product) => {
    setProductToEdit(product || null);
    setIsProductModalOpen(true);
  };

  const handleCloseProductModal = () => {
    setIsProductModalOpen(false);
    setProductToEdit(null);
  };

  return (
    <div style={{ display: "flex", gap: "2rem", flexDirection: "column" }}>
      {/* HEADER ACTIONS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {selectedCategory ? (
          <div>
            <button
              onClick={() => setSelectedCategoryId(null)}
              className="btn-secondary"
              style={{ marginBottom: "1rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
            >
              ← Voltar para Categorias
            </button>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
              Produtos: <span style={{ color: "var(--primary)" }}>{selectedCategory.name}</span>
            </h3>
          </div>
        ) : (
          <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Suas Categorias</h3>
        )}

        <button
          onClick={() => selectedCategory ? handleOpenProductModal() : handleOpenCategoryModal()}
          className="btn-primary"
        >
          {selectedCategory ? "+ Novo Produto" : "+ Nova Categoria"}
        </button>
      </div>

      {/* CONTENT: CATEGORIES LIST */}
      {!selectedCategory && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
          {initialCategories.length === 0 ? (
            <div className="card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem" }}>
              <p style={{ color: "var(--text-secondary)" }}>Nenhuma categoria criada ainda.</p>
            </div>
          ) : (
            initialCategories.map((category) => (
              <div
                key={category.id}
                className="card"
                style={{
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  opacity: category.isActive ? 1 : 0.6,
                }}
              >
                <div onClick={() => setSelectedCategoryId(category.id)} style={{ padding: "1rem", flexGrow: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <h4 style={{ fontSize: "1.1rem", fontWeight: 600 }}>{category.name}</h4>
                    {!category.isActive && (
                      <span style={{ fontSize: "0.75rem", background: "var(--error-light)", color: "var(--error)", padding: "0.2rem 0.5rem", borderRadius: "1rem" }}>Inativo</span>
                    )}
                  </div>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    {category.products.length} {category.products.length === 1 ? "produto" : "produtos"}
                  </p>
                </div>
                
                <div style={{ borderTop: "1px solid var(--border-light)", padding: "1rem", display: "flex", gap: "1rem" }}>
                  <button onClick={(e) => { e.stopPropagation(); handleOpenCategoryModal(category); }} style={{ color: "var(--primary)", background: "transparent", border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: 500 }}>
                    Editar Categoria
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CONTENT: PRODUCTS LIST */}
      {selectedCategory && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {selectedCategory.products.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
              <p style={{ color: "var(--text-secondary)" }}>Nenhum produto nesta categoria.</p>
            </div>
          ) : (
            selectedCategory.products.map((product) => (
              <div key={product.id} className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", opacity: product.isActive ? 1 : 0.6 }}>
                <div style={{ width: "80px", height: "80px", borderRadius: "0.5rem", background: "var(--bg-secondary)", overflow: "hidden", flexShrink: 0 }}>
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)" }}>
                      Sem foto
                    </div>
                  )}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h4 style={{ fontWeight: 600, fontSize: "1rem" }}>{product.name}</h4>
                    {!product.isActive && (
                      <span style={{ fontSize: "0.7rem", background: "var(--error-light)", color: "var(--error)", padding: "0.1rem 0.4rem", borderRadius: "1rem" }}>Inativo</span>
                    )}
                  </div>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "0.25rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {product.description || "Sem descrição"}
                  </p>
                  <p style={{ fontWeight: 700, color: "var(--primary)" }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                  </p>
                  {product.addonLinks.length > 0 && (
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                      📎 {product.addonLinks.map(l => l.addonCategory.name).join(", ")}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <button onClick={() => setAddonsProductId(product.id)} className="btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", background: "var(--primary-light)", color: "var(--primary)", borderColor: "var(--primary)" }}>
                    Complementos
                  </button>
                  <button onClick={() => handleOpenProductModal(product)} className="btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
                    Editar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODALS */}
      {isCategoryModalOpen && (
        <CategoryForm category={categoryToEdit} onClose={handleCloseCategoryModal} />
      )}

      {isProductModalOpen && selectedCategory && (
        <ProductForm product={productToEdit} categoryId={selectedCategory.id} onClose={handleCloseProductModal} />
      )}

      {addonsProduct && (
        <ProductAddonsManager 
          product={addonsProduct} 
          allAddonCategories={addonCategories}
          onClose={() => setAddonsProductId(null)} 
        />
      )}
    </div>
  );
}
