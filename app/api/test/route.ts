import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'The API is working!',
    serverInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    }
  });
} 