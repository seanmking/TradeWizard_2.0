"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

interface ProductCapacity {
  productId: string;
  productName: string;
  maxCapacity: string;
  unit: string;
  frequency: string;
  constraints?: string;
}

interface MaxCapacityStepProps {
  onSubmit: (data: any) => void;
  data?: {
    exportFocusProducts?: Array<{ id: string; name: string }>;
    productionCapacities?: ProductCapacity[];
  };
}

const UNITS = [
  'Units',
  'Kilograms',
  'Tons',
  'Liters',
  'Pieces',
  'Boxes',
  'Containers'
];

const FREQUENCIES = [
  'Daily',
  'Weekly',
  'Monthly',
  'Quarterly',
  'Annually'
];

export default function MaxCapacityStep({ onSubmit, data = {} }: MaxCapacityStepProps) {
  const [capacities, setCapacities] = useState<ProductCapacity[]>(
    data.productionCapacities || 
    (data.exportFocusProducts || []).map(p => ({
      productId: p.id,
      productName: p.name,
      maxCapacity: '',
      unit: 'Units',
      frequency: 'Monthly',
      constraints: ''
    }))
  );
  
  const [error, setError] = useState('');
  
  const updateCapacity = (
    productId: string, 
    field: keyof ProductCapacity, 
    value: string
  ) => {
    setCapacities(capacities.map(c => 
      c.productId === productId ? { ...c, [field]: value } : c
    ));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate all products have max capacities
    const invalidCapacities = capacities.filter(
      c => !c.maxCapacity || isNaN(Number(c.maxCapacity))
    );
    
    if (invalidCapacities.length > 0) {
      setError('Please enter valid maximum capacity values for all products');
      return;
    }
    
    onSubmit({ productionCapacities: capacities });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 mb-6">
          Please specify the maximum production capacity for each product, 
          considering your current infrastructure and resources. You can also 
          note any constraints that might affect scaling up production.
        </p>
        
        {capacities.map((capacity) => (
          <Card key={capacity.productId} className="p-4">
            <h3 className="font-medium mb-4">{capacity.productName}</h3>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm mb-1">Max Capacity</label>
                <Input
                  type="number"
                  min="0"
                  value={capacity.maxCapacity}
                  onChange={(e) => updateCapacity(
                    capacity.productId, 
                    'maxCapacity', 
                    e.target.value
                  )}
                  placeholder="Enter amount"
                />
              </div>
              
              <div>
                <label className="block text-sm mb-1">Unit</label>
                <Select
                  value={capacity.unit}
                  onValueChange={(value) => updateCapacity(
                    capacity.productId, 
                    'unit', 
                    value
                  )}
                >
                  {UNITS.map(unit => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </Select>
              </div>
              
              <div>
                <label className="block text-sm mb-1">Frequency</label>
                <Select
                  value={capacity.frequency}
                  onValueChange={(value) => updateCapacity(
                    capacity.productId, 
                    'frequency', 
                    value
                  )}
                >
                  {FREQUENCIES.map(freq => (
                    <option key={freq} value={freq}>
                      {freq}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm mb-1">
                Production Constraints (Optional)
              </label>
              <Input
                value={capacity.constraints || ''}
                onChange={(e) => updateCapacity(
                  capacity.productId, 
                  'constraints', 
                  e.target.value
                )}
                placeholder="E.g., Limited storage space, seasonal availability of raw materials"
              />
            </div>
          </Card>
        ))}
        
        {error && (
          <div className="text-red-500 text-sm">
            {error}
          </div>
        )}
        
        <div className="flex justify-end pt-4">
          <Button type="submit">
            Continue
          </Button>
        </div>
      </div>
    </form>
  );
} 