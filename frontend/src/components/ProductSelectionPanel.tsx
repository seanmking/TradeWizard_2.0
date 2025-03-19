import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, BarChart } from 'lucide-react';

import ProductManagementService from '@/services/product-management.service';
import { 
  ProductDetectionResult, 
  UserProductMetadata, 
  ProductFilter 
} from '@/types/product.types';

const ProductSelectionPanel: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [detectedProduct, setDetectedProduct] = useState<ProductDetectionResult | null>(null);
  const [savedProducts, setSavedProducts] = useState<UserProductMetadata[]>([]);
  const [filters, setFilters] = useState<ProductFilter>({});

  const handleDetectProduct = async () => {
    try {
      const result = await ProductManagementService.detectProduct(url);
      setDetectedProduct(result);
    } catch (error) {
      // Handle error (show toast, error message)
      console.error('Product detection failed', error);
    }
  };

  const handleSaveProduct = async () => {
    if (detectedProduct) {
      const productMetadata: UserProductMetadata = {
        userId: 'current-user-id', // Replace with actual user authentication
        originalDetection: detectedProduct,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      try {
        const savedProduct = await ProductManagementService.saveProduct(productMetadata);
        setSavedProducts([...savedProducts, savedProduct]);
        setDetectedProduct(null);
        setUrl('');
      } catch (error) {
        console.error('Product save failed', error);
      }
    }
  };

  const handleFilterProducts = async () => {
    try {
      const filteredProducts = await ProductManagementService.getUserProducts('current-user-id', filters);
      setSavedProducts(filteredProducts);
    } catch (error) {
      console.error('Product filtering failed', error);
    }
  };

  const renderConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge variant="success" className="flex items-center"><CheckCircle2 className="mr-1" size={16} /> High Confidence</Badge>;
    } else if (confidence >= 0.5) {
      return <Badge variant="warning" className="flex items-center"><AlertCircle className="mr-1" size={16} /> Medium Confidence</Badge>;
    } else {
      return <Badge variant="destructive" className="flex items-center"><AlertCircle className="mr-1" size={16} /> Low Confidence</Badge>;
    }
  };

  const renderExportViabilityIndicator = (product: UserProductMetadata) => {
    const viability = product.exportReadiness?.overallViability;
    const iconClass = "mr-2";
    
    switch (viability) {
      case 'high':
        return <div className="text-green-600 flex items-center"><BarChart className={iconClass} /> High Export Potential</div>;
      case 'medium':
        return <div className="text-yellow-600 flex items-center"><BarChart className={iconClass} /> Moderate Export Potential</div>;
      case 'low':
        return <div className="text-red-600 flex items-center"><BarChart className={iconClass} /> Limited Export Potential</div>;
      default:
        return <div>Not Assessed</div>;
    }
  };

  useEffect(() => {
    // Fetch initial set of products on component mount
    const fetchInitialProducts = async () => {
      try {
        const initialProducts = await ProductManagementService.getUserProducts('current-user-id');
        setSavedProducts(initialProducts);
      } catch (error) {
        console.error('Initial product fetch failed', error);
      }
    };

    fetchInitialProducts();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Product Detection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 mb-4">
            <Input 
              placeholder="Enter product URL" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button onClick={handleDetectProduct}>Detect</Button>
          </div>

          {detectedProduct && (
            <div className="border p-4 rounded">
              <h3 className="font-bold">{detectedProduct.name}</h3>
              <p>{detectedProduct.description}</p>
              <div className="mt-2">
                {renderConfidenceBadge(detectedProduct.confidence)}
              </div>
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={handleSaveProduct}
              >
                Save Product
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 mb-4">
            <Input 
              placeholder="Category" 
              value={filters.category || ''}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
            />
            <Button onClick={handleFilterProducts}>Filter</Button>
          </div>

          {savedProducts.map((product) => (
            <Card key={product.id} className="mb-2">
              <CardContent className="p-4">
                <h4 className="font-bold">{product.originalDetection.name}</h4>
                <p>{product.originalDetection.description}</p>
                <div className="mt-2 flex justify-between items-center">
                  {renderConfidenceBadge(product.originalDetection.confidence)}
                  {renderExportViabilityIndicator(product)}
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductSelectionPanel;
