import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">TradeWizard 2.0</h1>
      <p className="text-xl mb-8">
        AI-powered export readiness platform for South African SMEs
      </p>
      
      {/* Assessment CTA Button */}
      <div className="mb-10">
        <Link 
          href="/assessment"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 inline-flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
          </svg>
          Start Export Readiness Assessment
        </Link>
      </div>
      
      <div className="bg-blue-50 p-6 rounded-lg max-w-xl">
        <h2 className="text-2xl font-semibold mb-2">Project Structure Updated</h2>
        <p className="mb-4">
          The project structure has been successfully standardized according to the development strategy.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Removed tradewizard submodule</li>
          <li>Standardized directory structure</li>
          <li>Consolidated duplicate files</li>
          <li>Updated import paths</li>
        </ul>
      </div>
    </main>
  );
} 