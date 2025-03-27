import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Forward the request to the scraper service
    const scraperResponse = await fetch(`http://localhost:3001/analyze?url=${encodeURIComponent(url)}`);
    const data = await scraperResponse.json();

    if (!scraperResponse.ok) {
      throw new Error(data.message || 'Failed to analyze products');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error analyzing products:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 