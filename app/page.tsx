export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">TradeWizard 2.0</h1>
      <p className="text-xl mb-8">
        AI-powered export readiness platform for South African SMEs
      </p>
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