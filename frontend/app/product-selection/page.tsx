'use client';

import React, { useState } from 'react';
import ProductSelectionPanel from '../../components/product-selection/ProductSelectionPanel';
import { EnhancedProduct } from '../../../src/lib/types/product-detection.types';

/**
 * Product Selection Page
 * 
 * This page allows users to select products for export:
 * 1. They can enter their website URL to automatically detect products
 * 2. They can use predefined example products (like Browns Foods)
 * 3. They can toggle which products to include in their export strategy
 */
export default function ProductSelectionPage() {
  const [websiteUrl, setWebsiteUrl] = useState<string>('');
  const [showUrlInput, setShowUrlInput] = useState<boolean>(true);
  const [selectedProducts, setSelectedProducts] = useState<EnhancedProduct[]>([]);
  const [useExampleProducts, setUseExampleProducts] = useState<boolean>(false);
  
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // URL submitted, hide the input form
    setShowUrlInput(false);
  };
  
  const handleProductsSelected = (products: EnhancedProduct[]) => {
    setSelectedProducts(products);
  };
  
  const handleUseExampleProducts = () => {
    setShowUrlInput(false);
    setUseExampleProducts(true);
    setWebsiteUrl('');
  };
  
  const handleReset = () => {
    setShowUrlInput(true);
    setWebsiteUrl('');
    setSelectedProducts([]);
    setUseExampleProducts(false);
  };
  
  return (
    <div className="product-selection-page container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Export Product Selection</h1>
      
      {showUrlInput ? (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">Identify Your Products</h2>
          <p className="mb-4">Enter your business website URL to automatically detect products, or use sample products.</p>
          
          <form onSubmit={handleUrlSubmit} className="url-form mb-4">
            <label htmlFor="website-url" className="block mb-2 font-medium">Your business website:</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="website-url"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://yourbusiness.com"
                className="flex-grow px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Analyze Website
              </button>
            </div>
          </form>
          
          <div className="text-center">
            <span className="text-gray-500">or</span>
            <button 
              onClick={handleUseExampleProducts}
              className="block mx-auto mt-2 text-blue-600 hover:text-blue-800 underline"
            >
              Use Sample Products (Browns Foods)
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center mb-6">
          <div>
            {websiteUrl && (
              <div className="text-gray-600">
                Analyzing products from: <span className="font-medium">{websiteUrl}</span>
              </div>
            )}
            {useExampleProducts && (
              <div className="text-gray-600">
                Using sample products from Browns Foods
              </div>
            )}
          </div>
          <button 
            onClick={handleReset}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Change Source
          </button>
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <ProductSelectionPanel
          websiteUrl={!showUrlInput ? websiteUrl : undefined}
          initialProducts={useExampleProducts ? undefined : undefined}
          onProductsSelected={handleProductsSelected}
        />
        
        {selectedProducts.length > 0 && (
          <div className="action-buttons mt-8">
            <button 
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              onClick={() => {
                console.log('Selected products:', selectedProducts);
                // Navigate to next step or process selected products
                // This would typically use a router, like:
                // router.push('/export-strategy');
              }}
            >
              Continue with Selected Products
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
