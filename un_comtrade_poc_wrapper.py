import requests
import json
import pandas as pd
from urllib.parse import urlencode
import urllib3
import time
import os
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime

# Disable SSL warnings for development only
urllib3.disable_warnings()

class ComtradeAPI:
    """
    UN Comtrade API wrapper for preview functions (no subscription key required)
    """
    
    def __init__(self, verify_ssl=False, cache_dir="comtrade_cache"):
        """
        Initialize the API wrapper
        
        Args:
            verify_ssl: Whether to verify SSL certificates (disable only in dev)
            cache_dir: Directory to cache API responses
        """
        self.base_url = "https://comtradeapi.un.org"
        self.session = requests.Session()
        self.session.verify = verify_ssl
        
        # Create cache directory if it doesn't exist
        self.cache_dir = cache_dir
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # Load cached reference data
        self.references = None
        self.reporters = None
        self.partners = None
        self.commodities = None
        
        # Try to load cached reference data
        self._load_cached_references()
    
    def _cache_data(self, data, filename):
        """Cache data to file"""
        cache_path = os.path.join(self.cache_dir, filename)
        if isinstance(data, pd.DataFrame):
            data.to_csv(cache_path, index=False)
        else:
            with open(cache_path, 'w') as f:
                json.dump(data, f)
    
    def _load_cached_data(self, filename):
        """Load cached data from file"""
        cache_path = os.path.join(self.cache_dir, filename)
        if os.path.exists(cache_path):
            if filename.endswith('.csv'):
                return pd.read_csv(cache_path)
            else:
                with open(cache_path, 'r') as f:
                    return json.load(f)
        return None
    
    def _load_cached_references(self):
        """Load cached reference data"""
        self.references = self._load_cached_data('references.csv')
        self.reporters = self._load_cached_data('reporters.csv')
        self.partners = self._load_cached_data('partners.csv')
        self.commodities = self._load_cached_data('commodities.csv')
    
    def get_reference_tables(self, use_cache=True):
        """
        Get list of available reference tables
        
        Args:
            use_cache: Whether to use cached data if available
        """
        if use_cache and self.references is not None:
            return self.references
        
        url = f"{self.base_url}/files/v1/app/reference/ListofReferences.json"
        response = self.session.get(url)
        
        if response.status_code == 200:
            # Extract the list of references from the JSON response
            try:
                ref_data = pd.DataFrame(response.json())
                self.references = ref_data
                self._cache_data(ref_data, 'references.csv')
                return ref_data
            except Exception as e:
                print(f"Error parsing reference tables: {e}")
                return None
        
        print(f"Failed to get reference tables: {response.status_code}")
        return None
    
    def get_reporters(self, use_cache=True):
        """
        Get list of reporter countries/areas
        
        Args:
            use_cache: Whether to use cached data if available
        """
        if use_cache and self.reporters is not None:
            return self.reporters
        
        try:
            refs = self.get_reference_tables(use_cache)
            if refs is None:
                print("Could not get reference tables")
                return None
            
            # Find the reporter reference URL
            reporter_ref = refs[refs['id'] == 'reporterAreas']
            if len(reporter_ref) == 0:
                print("Reporter reference not found")
                return None
            
            ref_url = reporter_ref['uri'].values[0]
            response = self.session.get(ref_url)
            
            if response.status_code == 200:
                reporter_data = pd.DataFrame(response.json())
                self.reporters = reporter_data
                self._cache_data(reporter_data, 'reporters.csv')
                return reporter_data
        except Exception as e:
            print(f"Error getting reporters: {e}")
        
        return None
    
    def get_partners(self, use_cache=True):
        """
        Get list of partner countries/areas
        
        Args:
            use_cache: Whether to use cached data if available
        """
        if use_cache and self.partners is not None:
            return self.partners
        
        try:
            refs = self.get_reference_tables(use_cache)
            if refs is None:
                print("Could not get reference tables")
                return None
            
            # Find the partner reference URL
            partner_ref = refs[refs['id'] == 'partnerAreas']
            if len(partner_ref) == 0:
                print("Partner reference not found")
                return None
            
            ref_url = partner_ref['uri'].values[0]
            response = self.session.get(ref_url)
            
            if response.status_code == 200:
                partner_data = pd.DataFrame(response.json())
                self.partners = partner_data
                self._cache_data(partner_data, 'partners.csv')
                return partner_data
        except Exception as e:
            print(f"Error getting partners: {e}")
        
        return None
    
    def get_commodities(self, classification="HS", use_cache=True):
        """
        Get list of commodities by classification
        
        Args:
            classification: Classification code (e.g., "HS", "S1", "S2", etc.)
            use_cache: Whether to use cached data if available
        """
        if use_cache and self.commodities is not None:
            return self.commodities
        
        try:
            refs = self.get_reference_tables(use_cache)
            if refs is None:
                print("Could not get reference tables")
                return None
            
            # Find the commodity reference URL for the specified classification
            commodity_ref = refs[refs['id'] == f'commodities{classification}']
            if len(commodity_ref) == 0:
                print(f"Commodity reference not found for classification {classification}")
                return None
            
            ref_url = commodity_ref['uri'].values[0]
            response = self.session.get(ref_url)
            
            if response.status_code == 200:
                commodity_data = pd.DataFrame(response.json())
                self.commodities = commodity_data
                self._cache_data(commodity_data, f'commodities_{classification}.csv')
                return commodity_data
        except Exception as e:
            print(f"Error getting commodities: {e}")
        
        return None
    
    def preview_final_data(self, reporter_code, flow_code, period, cmd_code="TOTAL", 
                          type_code='C', freq_code='A', cl_code='HS',
                          max_records=500, include_desc=True):
        """
        Get preview of final data (no subscription key required)
        
        Args:
            reporter_code: Reporter country/area code
            flow_code: Flow code (M=Import, X=Export, etc.)
            period: Period (YYYY for annual, YYYYMM for monthly)
            cmd_code: Commodity code (TOTAL for all commodities)
            type_code: Type code (C=Commodities, S=Services)
            freq_code: Frequency code (A=Annual, M=Monthly)
            cl_code: Classification code (HS, SITC, etc.)
            max_records: Maximum number of records to return (max 500 for preview)
            include_desc: Whether to include descriptions
        """
        params = {
            "reportercode": reporter_code,
            "flowCode": flow_code,
            "period": period,
            "cmdCode": cmd_code,
            "maxRecords": max_records,
            "includeDesc": str(include_desc)
        }
        
        url = f"{self.base_url}/public/v1/preview/{type_code}/{freq_code}/{cl_code}?{urlencode(params)}"
        
        # Create cache key based on parameters
        cache_key = f"preview_{type_code}_{freq_code}_{cl_code}_{reporter_code}_{flow_code}_{period}_{cmd_code}.csv"
        cached_data = self._load_cached_data(cache_key)
        
        if cached_data is not None:
            return cached_data
        
        print(f"Requesting URL: {url}")
        response = self.session.get(url)
        
        if response.status_code == 200:
            data = response.json()
            if 'data' in data and data['data'] is not None:
                df = pd.DataFrame(data['data'])
                self._cache_data(df, cache_key)
                return df
            else:
                print("No data found in response")
                return pd.DataFrame()
        else:
            print(f"Error {response.status_code}: {response.text}")
            return pd.DataFrame()
    
    def get_country_name(self, country_code, type_='reporter'):
        """Get country name from code"""
        if type_ == 'reporter' and self.reporters is not None:
            country = self.reporters[self.reporters['id'] == country_code]
            if len(country) > 0:
                return country['text'].values[0]
        
        if type_ == 'partner' and self.partners is not None:
            country = self.partners[self.partners['id'] == country_code]
            if len(country) > 0:
                return country['text'].values[0]
        
        return str(country_code)
    
    def visualize_top_partners(self, data, reporter_code, flow_code, period, cmd_code="TOTAL",
                               top_n=10, filename=None):
        """
        Create visualization of top trading partners
        
        Args:
            data: DataFrame from preview_final_data
            reporter_code: Reporter country/area code
            flow_code: Flow code (M=Import, X=Export)
            period: Period (YYYY for annual, YYYYMM for monthly)
            cmd_code: Commodity code (TOTAL for all commodities)
            top_n: Number of top partners to display
            filename: Filename to save the visualization (optional)
        """
        if data.empty:
            print("No data to visualize")
            return
        
        # Set plot style
        sns.set(style="whitegrid")
        plt.figure(figsize=(12, 8))
        
        # Get reporter name
        reporter_name = self.get_country_name(reporter_code)
        
        # Get flow description
        flow_desc = "Imports" if flow_code == "M" else "Exports"
        
        # Format period for display
        if len(str(period)) == 4:  # Annual
            period_desc = str(period)
        elif len(str(period)) == 6:  # Monthly
            try:
                period_date = datetime.strptime(str(period), "%Y%m")
                period_desc = period_date.strftime("%B %Y")
            except:
                period_desc = str(period)
        else:
            period_desc = str(period)
        
        # Get commodity description
        cmd_desc = "All Commodities"
        if cmd_code != "TOTAL" and 'cmdDesc' in data.columns:
            cmd_desc_values = data[data['cmdCode'] == cmd_code]['cmdDesc'].unique()
            if len(cmd_desc_values) > 0:
                cmd_desc = cmd_desc_values[0]
        
        # Group by partner and sum trade value
        partner_data = data.groupby(['partnerCode', 'partnerDesc'])['primaryValue'].sum().reset_index()
        
        # Sort and get top N
        top_partners = partner_data.sort_values('primaryValue', ascending=False).head(top_n)
        
        # Create bar chart
        ax = sns.barplot(x='primaryValue', y='partnerDesc', data=top_partners, palette='viridis')
        
        # Format trade values (in millions)
        for p in ax.patches:
            value = p.get_width()
            formatted_value = f"${value/1e6:.1f}M" if value < 1e9 else f"${value/1e9:.1f}B"
            ax.text(p.get_width() + (p.get_width() * 0.02), p.get_y() + p.get_height()/2, 
                    formatted_value, ha='left', va='center')
        
        # Set title and labels
        plt.title(f"Top {top_n} Trading Partners: {reporter_name} {flow_desc} of {cmd_desc} ({period_desc})",
                 fontsize=15, fontweight='bold')
        plt.xlabel("Trade Value (USD)", fontsize=12)
        plt.ylabel("Partner Country", fontsize=12)
        
        # Tight layout
        plt.tight_layout()
        
        # Save or display
        if filename:
            plt.savefig(filename, dpi=300, bbox_inches='tight')
            print(f"Visualization saved to {filename}")
        else:
            plt.show()
        
        return top_partners

# Example usage
if __name__ == "__main__":
    api = ComtradeAPI()
    
    print("UN Comtrade API POC Wrapper Example")
    print("===================================")
    
    # Get reference data
    print("\nLoading reference data...")
    reporters = api.get_reporters()
    if reporters is not None:
        print(f"Loaded {len(reporters)} reporters")
    
    partners = api.get_partners()
    if partners is not None:
        print(f"Loaded {len(partners)} partners")
    
    # Example 1: Get US total imports for 2022
    print("\nExample 1: US total imports for 2022")
    us_imports = api.preview_final_data(
        reporter_code='842',  # USA
        flow_code='M',        # Imports
        period='2022',        # Year 2022
        cmd_code='TOTAL'      # All commodities
    )
    
    if not us_imports.empty:
        print(f"Retrieved {len(us_imports)} records")
        
        # Visualize top 10 import partners
        api.visualize_top_partners(
            us_imports, 
            reporter_code='842', 
            flow_code='M', 
            period='2022',
            filename="us_import_partners_2022.png"
        )
    
    # Example 2: Get Germany exports for 2022
    print("\nExample 2: Germany exports for 2022")
    germany_exports = api.preview_final_data(
        reporter_code='276',  # Germany
        flow_code='X',        # Exports
        period='2022',        # Year 2022
        cmd_code='TOTAL'      # All commodities
    )
    
    if not germany_exports.empty:
        print(f"Retrieved {len(germany_exports)} records")
        
        # Visualize top 10 export partners
        api.visualize_top_partners(
            germany_exports, 
            reporter_code='276', 
            flow_code='X', 
            period='2022',
            filename="germany_export_partners_2022.png"
        )
    
    print("\nThis POC wrapper demonstrates how to access the UN Comtrade API without a subscription key.")
    print("The preview functions are limited to 500 records per query.")
    print("For more comprehensive data access, a subscription key would be needed.") 