"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

interface ProductVolume {
  productId: string;
  productName: string;
  volume: string;
  unit: string;
  frequency: string;
}

interface ProductionVolumeStepProps {
  onSubmit: (data: any) => void;
  data?: {
    exportFocusProducts?: Array<{ id: string; name: string }>;
    productionVolumes?: ProductVolume[];
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

export default function ProductionVolumeStep({ onSubmit, data = {} }: ProductionVolumeStepProps) {
  const [volumes, setVolumes] = React.useState<ProductVolume[]>(
    data.productionVolumes || 
    (data.exportFocusProducts || []).map(p => ({
      productId: p.id,
      productName: p.name,
      volume: '',
      unit: 'Units',
      frequency: 'Monthly'
    }))
  );
  
  const [error, setError] = React.useState('');
  
  const updateVolume = (
    productId: string, 
    field: keyof ProductVolume, 
    value: string
  ) => {
    setVolumes(volumes.map(v => 
      v.productId === productId ? { ...v, [field]: value } : v
    ));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate all products have volumes
    const invalidVolumes = volumes.filter(v => !v.volume || isNaN(Number(v.volume)));
    
    if (invalidVolumes.length > 0) {
      setError('Please enter valid production volumes for all products');
      return;
    }
    
    onSubmit({ productionVolumes: volumes });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        {volumes.map((volume) => (
          <Card key={volume.productId} className="p-4">
            <h3 className="font-medium mb-4">{volume.productName}</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm mb-1">Volume</label>
                <Input
                  type="number"
                  min="0"
                  value={volume.volume}
                  onChange={(e) => updateVolume(volume.productId, 'volume', e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
              
              <div>
                <label className="block text-sm mb-1">Unit</label>
                <Select
                  value={volume.unit}
                  onValueChange={(value) => updateVolume(volume.productId, 'unit', value)}
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
                  value={volume.frequency}
                  onValueChange={(value) => updateVolume(volume.productId, 'frequency', value)}
                >
                  {FREQUENCIES.map(freq => (
                    <option key={freq} value={freq}>
                      {freq}
                    </option>
                  ))}
                </Select>
              </div>
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