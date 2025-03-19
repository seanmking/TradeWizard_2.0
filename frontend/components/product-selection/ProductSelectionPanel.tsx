import React, { useState, useEffect } from 'react';
import { EnhancedProduct } from '../../../src/lib/types/product-detection.types';

interface ProductSelectionProps {
  websiteUrl?: string; // URL to analyze
  initialProducts?: EnhancedProduct[]; // Products pre-detected or from Brown Foods
  onProductsSelected: (products: EnhancedProduct[]) => void;
}

/**
 * ProductSelectionPanel component
 * 
 * This component displays products for the user to select for export.
 * It can either show pre-defined products (like Brown Foods products in the screenshot)
 * or fetch products from the SME's website URL using the product detection service.
 */
export const ProductSelectionPanel: React.FC<ProductSelectionProps> = ({ 
  websiteUrl, 
  initialProducts,
  onProductsSelected 
}) => {
  const [products, setProducts] = useState<(EnhancedProduct & { selected: boolean })[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const setupProducts = async () => {
      // If initial products are provided, use them
      if (initialProducts && initialProducts.length > 0) {
        setProducts(initialProducts.map(product => ({
          ...product,
          selected: false
        })));
        return;
      }
      
      // If a website URL is provided, fetch products
      if (websiteUrl) {
        setLoading(true);
        setError(null);
        
        try {
          // Call the web scraper service API
          const response = await fetch('/api/product-detection', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: websiteUrl }),
          });
          
          if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          if (data.products && Array.isArray(data.products)) {
            setProducts(data.products.map((product: EnhancedProduct) => ({
              ...product,
              selected: false // Initialize as unselected
            })));
          } else {
            // Fallback to example products if no products were detected
            setProducts(getExampleProducts());
          }
        } catch (err) {
          console.error('Failed to detect products:', err);
          setError('Failed to analyze website for products. Please try again.');
          
          // Fallback to example products on error
          setProducts(getExampleProducts());
        } finally {
          setLoading(false);
        }
      } else if (!initialProducts) {
        // No URL or initial products, use example products
        setProducts(getExampleProducts());
      }
    };
    
    setupProducts();
  }, [websiteUrl, initialProducts]);
  
  // Toggle product selection
  const handleToggleProduct = (index: number) => {
    setProducts(products.map((product, i) => 
      i === index 
        ? { ...product, selected: !product.selected } 
        : product
    ));
    
    // Notify parent component about selection change
    const selectedProducts = products.map((p, i) => 
      i === index ? { ...p, selected: !p.selected } : p
    ).filter(p => p.selected);
    
    onProductsSelected(selectedProducts);
  };
  
  return (
    <div className="product-selection-panel">
      <h2 className="text-2xl font-bold mb-4">Core Products for Export</h2>
      <p className="mb-6">Select which products you'd like to focus on for export opportunities.</p>
      
      {loading && (
        <div className="loading-indicator p-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p>Analyzing website for products...</p>
        </div>
      )}
      
      {error && (
        <div className="error-message p-4 mb-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {products.length > 0 ? (
        <div className="product-list space-y-4">
          {products.map((product, index) => (
            <div key={index} className="product-item border rounded-lg p-4 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
              <div className="product-info">
                <h3 className="text-lg font-semibold">{product.name}</h3>
                <span className={`potential-badge inline-block px-2 py-1 text-xs rounded-full ${
                  product.confidence && product.confidence > 0.8 
                    ? "bg-green-100 text-green-800" 
                    : "bg-yellow-100 text-yellow-800"
                }`}>
                  {product.confidence && product.confidence > 0.8 
                    ? "High potential" 
                    : "Medium potential"}
                </span>
                <p className="text-gray-600 mt-1">{product.description || 
                  (product.name.includes('Primary') 
                    ? 'Main product with export potential' 
                    : product.name.includes('Secondary') 
                      ? 'Complementary offering for international markets'
                      : 'Supporting service with specialized appeal')}</p>
              </div>
              <div className="toggle-switch">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={product.selected}
                    onChange={() => handleToggleProduct(index)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          ))}
        </div>
      ) : !loading && (
        <div className="no-products-message p-6 text-center border rounded-lg bg-gray-50">
          {websiteUrl 
            ? "No products detected on this website. Please try another URL or manually add products."
            : "Enter your website URL to detect products automatically."}
        </div>
      )}
      
      <div className="selection-summary mt-6 p-3 bg-blue-50 rounded-lg text-blue-800">
        {products.filter(p => p.selected).length > 0 
          ? `Selected products: ${products.filter(p => p.selected).length} selected.`
          : "Selected products: None selected. Toggle switches to select products for export."}
      </div>
    </div>
  );
};

/**
 * Get example products for testing or fallback
 */
function getExampleProducts(): (EnhancedProduct & { selected: boolean })[] {
  return [
    {
      name: "Browns Foods Primary Product",
      description: "Main product with export potential",
      images: [],
      attributes: {},
      confidence: 0.9,
      selected: false
    },
    {
      name: "Browns Foods Secondary Product",
      description: "Complementary offering for international markets",
      images: [],
      attributes: {},
      confidence: 0.7,
      selected: false
    },
    {
      name: "Browns Foods Service Line",
      description: "Supporting service with specialized appeal",
      images: [],
      attributes: {},
      confidence: 0.7,
      selected: false
    }
  ];
}

export default ProductSelectionPanel;
