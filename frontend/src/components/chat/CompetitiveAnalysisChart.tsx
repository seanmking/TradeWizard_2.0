import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

interface CompetitiveData {
  marketShare: number;
  priceCompetitiveness: number;
  productQuality: number;
  brandRecognition: number;
  distribution: number;
  customerService: number;
}

interface CompetitiveAnalysisChartProps {
  data: CompetitiveData;
  className?: string;
}

const CompetitiveAnalysisChart: React.FC<CompetitiveAnalysisChartProps> = ({
  data,
  className = ''
}) => {
  const chartData = [
    {
      subject: 'Market Share',
      value: data.marketShare,
      fullMark: 100
    },
    {
      subject: 'Price Competitiveness',
      value: data.priceCompetitiveness,
      fullMark: 100
    },
    {
      subject: 'Product Quality',
      value: data.productQuality,
      fullMark: 100
    },
    {
      subject: 'Brand Recognition',
      value: data.brandRecognition,
      fullMark: 100
    },
    {
      subject: 'Distribution',
      value: data.distribution,
      fullMark: 100
    },
    {
      subject: 'Customer Service',
      value: data.customerService,
      fullMark: 100
    }
  ];

  return (
    <div className={`bg-white rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Competitive Analysis</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis angle={30} domain={[0, 100]} />
            <Radar
              name="Your Product"
              dataKey="value"
              stroke="#2563eb"
              fill="#3b82f6"
              fillOpacity={0.6}
            />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CompetitiveAnalysisChart; 