"use client";

import React, { useState, useEffect } from 'react';
import { Switch } from '@headlessui/react';

interface Product {
  id: string;
  name: string;
  description: string;
  exportPotential: 'high' | 'medium' | 'low';
  selected: boolean;
}

interface ExportProductsSelectorProps {
  aiResponse: string;
  businessName: string;
  isLoading?: boolean;
}

const ExportProductsSelector: React.FC<ExportProductsSelectorProps> = ({
  aiResponse,
  businessName,
  isLoading = false
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  // Extract products from AI response
  useEffect(() => {
    if (isLoading || !aiResponse) {
      return;
    }

    try {
      // Try to find a JSON object in the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      let parsedData: any = null;
      
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error("Failed to parse JSON from match:", e);
        }
      }
      
      // Extract products array from the parsed data
      let productItems: any[] = [];
      
      if (parsedData && parsedData.products && Array.isArray(parsedData.products)) {
        productItems = parsedData.products;
      } else if (parsedData && parsedData.coreProducts && Array.isArray(parsedData.coreProducts)) {
        productItems = parsedData.coreProducts;
      } else {
        // Fallback to generate placeholder products if none found
        productItems = createPlaceholderProducts();
      }
      
      // Transform to our Product interface with selection state
      const formattedProducts = productItems.map((product: any, index: number) => ({
        id: product.id || `product-${index}`,
        name: product.name || `Product ${index + 1}`,
        description: product.description || 'No description available',
        exportPotential: product.potential || 'medium',
        selected: false
      }));
      
      setProducts(formattedProducts);
      setParseError(null);
    } catch (error) {
      console.error("Error processing products data:", error);
      setParseError(`Error: ${(error as Error).message}`);
      setProducts(createPlaceholderProducts());
    }
  }, [aiResponse, isLoading]);

  // Create placeholder products for testing or when parsing fails
  const createPlaceholderProducts = (): Product[] => {
    return [
      {
        id: 'product-1',
        name: 'Primary Product',
        description: 'Your main offering with strong export potential',
        exportPotential: 'high',
        selected: false
      },
      {
        id: 'product-2',
        name: 'Secondary Product',
        description: 'Complementary offering with good market fit',
        exportPotential: 'medium',
        selected: false
      },
      {
        id: 'product-3',
        name: 'Service Offering',
        description: 'Support service with limited but specialized market potential',
        exportPotential: 'low',
        selected: false
      }
    ];
  };

  // Toggle product selection
  const toggleProduct = (id: string) => {
    setProducts(products.map(product => 
      product.id === id ? {...product, selected: !product.selected} : product
    ));
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-5 rounded-lg bg-white shadow-sm border border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              <div className="h-6 w-10 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-lg bg-white shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-3">
        Core Products for Export
      </h2>
      
      {products.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 mb-4">
            Select which products you'd like to focus on for export opportunities.
          </p>
          
          {products.map((product) => (
            <div key={product.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <div className="flex items-center">
                  <span className="font-medium text-gray-800">{product.name}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    product.exportPotential === 'high' ? 'bg-green-100 text-green-800' :
                    product.exportPotential === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {product.exportPotential.charAt(0).toUpperCase() + product.exportPotential.slice(1)} potential
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{product.description}</p>
              </div>
              
              <Switch
                checked={product.selected}
                onChange={() => toggleProduct(product.id)}
                className={`${
                  product.selected ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    product.selected ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            </div>
          ))}
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Selected products:</span>{' '}
              {products.filter(p => p.selected).length > 0
                ? products.filter(p => p.selected).map(p => p.name).join(', ')
                : 'None selected. Toggle switches to select products for export.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 text-center text-gray-500">
          No core products identified. Try generating a new assessment.
        </div>
      )}
      
      {parseError && process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 border border-red-200 rounded bg-red-50 text-sm text-red-600">
          {parseError}
        </div>
      )}
    </div>
  );
};

export default ExportProductsSelector; 