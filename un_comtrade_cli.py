#!/usr/bin/env python3

import argparse
import json
import sys
from un_comtrade_poc_wrapper import ComtradeAPI

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="UN Comtrade API CLI")
    
    # Main action argument groups
    action_group = parser.add_mutually_exclusive_group(required=True)
    action_group.add_argument('--get-trade-data', action='store_true', help='Get trade data')
    action_group.add_argument('--get-reporters', action='store_true', help='Get reporter countries')
    action_group.add_argument('--get-partners', action='store_true', help='Get partner countries')
    action_group.add_argument('--get-commodities', action='store_true', help='Get commodity codes')
    action_group.add_argument('--visualize', action='store_true', help='Create visualization')
    
    # Parameters for trade data queries
    parser.add_argument('--reporter', type=str, help='Reporter country code')
    parser.add_argument('--flow', type=str, choices=['M', 'X'], help='Flow code (M=Import, X=Export)')
    parser.add_argument('--period', type=str, help='Period (YYYY for annual, YYYYMM for monthly)')
    parser.add_argument('--commodity', type=str, default='TOTAL', help='Commodity code (default: TOTAL)')
    parser.add_argument('--top-n', type=int, default=10, help='Number of top results to return')
    parser.add_argument('--classification', type=str, default='HS', help='Classification code (default: HS)')
    
    # Output options
    parser.add_argument('--output', type=str, choices=['json', 'csv'], default='json', 
                        help='Output format (default: json)')
    parser.add_argument('--output-file', type=str, help='Output file path (if not specified, print to stdout)')
    parser.add_argument('--image-file', type=str, help='Image file path for visualization')
    
    # Cache options
    parser.add_argument('--use-cache', action='store_true', default=True, help='Use cached data if available (default: True)')
    parser.add_argument('--cache-dir', type=str, default='comtrade_cache', help='Cache directory (default: comtrade_cache)')
    
    return parser.parse_args()

def main():
    """Main function"""
    args = parse_arguments()
    
    # Initialize API with cache options
    api = ComtradeAPI(verify_ssl=False, cache_dir=args.cache_dir)
    
    # Process based on requested action
    try:
        if args.get_reporters:
            # Get reporter countries
            data = api.get_reporters(use_cache=args.use_cache)
            if data is None:
                print("Error: Could not retrieve reporter countries", file=sys.stderr)
                return 1
            output_data(data, args.output, args.output_file)
        
        elif args.get_partners:
            # Get partner countries
            data = api.get_partners(use_cache=args.use_cache)
            if data is None:
                print("Error: Could not retrieve partner countries", file=sys.stderr)
                return 1
            output_data(data, args.output, args.output_file)
        
        elif args.get_commodities:
            # Get commodity codes
            data = api.get_commodities(classification=args.classification, use_cache=args.use_cache)
            if data is None:
                print("Error: Could not retrieve commodity codes", file=sys.stderr)
                return 1
            output_data(data, args.output, args.output_file)
        
        elif args.get_trade_data:
            # Validate required parameters
            if not all([args.reporter, args.flow, args.period]):
                print("Error: --reporter, --flow, and --period are required for --get-trade-data", file=sys.stderr)
                return 1
            
            # Get trade data
            data = api.preview_final_data(
                reporter_code=args.reporter,
                flow_code=args.flow,
                period=args.period,
                cmd_code=args.commodity
            )
            
            if data.empty:
                print("Error: No trade data found", file=sys.stderr)
                return 1
            
            output_data(data, args.output, args.output_file)
        
        elif args.visualize:
            # Validate required parameters
            if not all([args.reporter, args.flow, args.period, args.image_file]):
                print("Error: --reporter, --flow, --period, and --image-file are required for --visualize", 
                      file=sys.stderr)
                return 1
            
            # Get trade data
            data = api.preview_final_data(
                reporter_code=args.reporter,
                flow_code=args.flow,
                period=args.period,
                cmd_code=args.commodity
            )
            
            if data.empty:
                print("Error: No trade data found", file=sys.stderr)
                return 1
            
            # Create visualization
            api.visualize_top_partners(
                data=data,
                reporter_code=args.reporter,
                flow_code=args.flow,
                period=args.period,
                cmd_code=args.commodity,
                top_n=args.top_n,
                filename=args.image_file
            )
            
            print(json.dumps({"status": "success", "message": f"Visualization saved to {args.image_file}"}))
    
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return 1
    
    return 0

def output_data(data, format_type, output_file=None):
    """Output data in the specified format"""
    if format_type == 'json':
        # Convert DataFrame to JSON
        json_data = data.to_json(orient='records')
        
        if output_file:
            with open(output_file, 'w') as f:
                f.write(json_data)
        else:
            print(json_data)
    
    elif format_type == 'csv':
        # Convert DataFrame to CSV
        csv_data = data.to_csv(index=False)
        
        if output_file:
            with open(output_file, 'w') as f:
                f.write(csv_data)
        else:
            print(csv_data)

if __name__ == "__main__":
    sys.exit(main()) 