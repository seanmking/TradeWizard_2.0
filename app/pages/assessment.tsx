import React from 'react';
import InitialAssessment from '../components/assessment/InitialAssessment';
import Head from 'next/head';

const AssessmentPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Export Readiness Assessment | TradeWizard</title>
        <meta 
          name="description" 
          content="Take our interactive export readiness assessment to discover your business's potential for international markets."
        />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        <InitialAssessment />
      </div>
    </>
  );
};

export default AssessmentPage; 