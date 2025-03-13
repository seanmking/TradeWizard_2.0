import { NextResponse } from 'next/server';
import { testWebScraper } from '../../lib/services/test-webscraper';

export async function GET(request: Request) {
  // Get the URL from the query string
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url') || 'https://example.com';
  
  try {
    // Test the web scraper
    const result = await testWebScraper(url);
    
    // Return the result
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    // Handle errors
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 