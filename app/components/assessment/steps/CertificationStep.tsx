"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface CertificationStepProps {
  onSubmit: (data: any) => void;
  data?: {
    certifications?: string[];
    additionalNotes?: string;
  };
}

export default function CertificationStep({ onSubmit, data = {} }: CertificationStepProps) {
  const [certifications, setCertifications] = React.useState<string[]>(data.certifications || []);
  const [newCertification, setNewCertification] = React.useState('');
  const [additionalNotes, setAdditionalNotes] = React.useState(data.additionalNotes || '');
  const [error, setError] = React.useState('');

  const handleAddCertification = () => {
    if (newCertification.trim()) {
      setCertifications([...certifications, newCertification.trim()]);
      setNewCertification('');
    }
  };

  const handleRemoveCertification = (index: number) => {
    setCertifications(certifications.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    onSubmit({
      certifications,
      additionalNotes
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Add Certifications
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={newCertification}
              onChange={(e) => setNewCertification(e.target.value)}
              placeholder="Enter certification name"
            />
            <Button
              type="button"
              onClick={handleAddCertification}
              disabled={!newCertification.trim()}
            >
              Add
            </Button>
          </div>
        </div>

        {certifications.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Current Certifications
            </label>
            <div className="space-y-2">
              {certifications.map((cert, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>{cert}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleRemoveCertification(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">
            Additional Notes (Optional)
          </label>
          <Textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Any additional notes about certifications or compliance"
            rows={4}
          />
        </div>

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