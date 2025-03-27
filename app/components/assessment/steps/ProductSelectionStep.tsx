"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/use-toast';

interface Product {
  id?: string;
  name: string;
  description: string;
  specifications?: string;
  category?: string;
  isSelected?: boolean;
}

interface ProductSelectionStepProps {
  onSubmit: (data: { products: Product[] }) => void;
  businessUrl?: string;
  data?: {
    products?: Product[];
  };
}

export default function ProductSelectionStep({ onSubmit, businessUrl, data = {} }: ProductSelectionStepProps) {
  const [products, setProducts] = React.useState<Product[]>(data.products || []);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [showManualAdd, setShowManualAdd] = React.useState(false);
  const [newProduct, setNewProduct] = React.useState<Product>({
    name: '',
    description: '',
    specifications: '',
    isSelected: true
  });

  // Fetch products from scraper service when component mounts
  React.useEffect(() => {
    const fetchProducts = async () => {
      if (!businessUrl || products.length > 0) return;
      
      setLoading(true);
      setError('');
      
      try {
        const response = await fetch(`/api/products/analyze?url=${encodeURIComponent(businessUrl)}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch products');
        }
        
        // Only accept items that have both name and description and look like actual products
        const validProducts = (data.productDetails || []).filter((product: any) => {
          if (!product.name || !product.description) return false;
          
          const name = product.name.toLowerCase();
          // Filter out items that look like navigation or blog posts
          if (name.includes('how') && 
              (name.includes('success') || name.includes('business') || name.includes('entrepreneur'))) {
            return false;
          }
          if (/^(our partners|food \+ family|lspeople)$/i.test(name)) {
            return false;
          }
          return true;
        });
        
        if (validProducts.length > 0) {
          setProducts(validProducts.map((product: any) => ({
            name: product.name,
            description: product.description || '',
            specifications: product.specifications || '',
            category: product.category || '',
            isSelected: true
          })));
          toast({
            title: "Products detected!",
            description: `Found ${validProducts.length} products from your website.`
          });
        } else {
          setShowManualAdd(true);
          toast({
            title: "No products found",
            description: "We couldn't detect any products from your website. Please add them manually.",
            variant: "destructive"
          });
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to fetch products. Please add them manually.');
        setShowManualAdd(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [businessUrl, products.length]);

  const handleProductToggle = (index: number) => {
    setProducts(prev => prev.map((p, i) => 
      i === index ? { ...p, isSelected: !p.isSelected } : p
    ));
  };

  const handleProductEdit = (index: number, field: keyof Product, value: string) => {
    setProducts(prev => prev.map((p, i) => 
      i === index ? { ...p, [field]: value } : p
    ));
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.description) {
      setError('Please provide both product name and description');
      return;
    }
    
    setProducts(prev => [...prev, newProduct]);
    setNewProduct({
      name: '',
      description: '',
      specifications: '',
      isSelected: true
    });
    setError('');
    setShowManualAdd(false); // Hide the form after adding
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const selectedProducts = products.filter(p => p.isSelected);
    
    if (selectedProducts.length === 0) {
      setError('Please select at least one product to export');
      return;
    }

    onSubmit({ products: selectedProducts });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-8">
        <Spinner size="lg" />
        <p>Analyzing your website for products...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-2 rounded-md">
          {error}
        </div>
      )}

      {products.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Your Products</h3>
          {products.map((product, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start space-x-4">
                <Checkbox
                  checked={product.isSelected}
                  onCheckedChange={() => handleProductToggle(index)}
                />
                <div className="flex-1 space-y-2">
                  <Input
                    value={product.name}
                    onChange={(e) => handleProductEdit(index, 'name', e.target.value)}
                    placeholder="Product Name"
                  />
                  <Textarea
                    value={product.description}
                    onChange={(e) => handleProductEdit(index, 'description', e.target.value)}
                    placeholder="Product Description"
                    rows={3}
                  />
                  <Textarea
                    value={product.specifications || ''}
                    onChange={(e) => handleProductEdit(index, 'specifications', e.target.value)}
                    placeholder="Technical Specifications (Optional)"
                    rows={2}
                  />
                  {product.category && (
                    <div className="text-sm text-gray-500">
                      Category: {product.category}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() => setShowManualAdd(true)}
        className="w-full"
      >
        Add More Products
      </Button>

      {showManualAdd && (
        <Card className="p-4 space-y-4">
          <h3 className="text-lg font-medium">Add New Product</h3>
          <div>
            <Input
              value={newProduct.name}
              onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Product Name"
            />
          </div>
          <div>
            <Textarea
              value={newProduct.description}
              onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Product Description"
              rows={3}
            />
          </div>
          <div>
            <Textarea
              value={newProduct.specifications || ''}
              onChange={(e) => setNewProduct(prev => ({ ...prev, specifications: e.target.value }))}
              placeholder="Technical Specifications (Optional)"
              rows={2}
            />
          </div>
          <Button type="button" onClick={handleAddProduct}>
            Add Product
          </Button>
        </Card>
      )}

      <div className="flex justify-end space-x-4">
        <Button type="submit" disabled={products.length === 0}>
          Continue
        </Button>
      </div>
    </form>
  );
} 