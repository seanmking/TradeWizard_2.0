import requests
import json
import pandas as pd
from urllib.parse import urlencode
import urllib3
import time

# Disable SSL warnings - for testing purposes only
# In production, you should properly configure SSL certificates
urllib3.disable_warnings()

class ComtradeAPI:
    def __init__(self):
        self.base_url = "https://comtradeapi.un.org"
        self.session = requests.Session()
        self.session.verify = False  # Disable SSL verification (not recommended for production)
    
    def get_reference_tables(self):
        """Get list of available reference tables"""
        url = f"{self.base_url}/files/v1/app/reference/ListofReferences.json"
        response = self.session.get(url)
        if response.status_code == 200:
            return pd.DataFrame(response.json())
        return None
    
    def get_reference(self, reference_name):
        """Get specific reference data"""
        try:
            # First get the list of references to find the URL for the specific reference
            references = self.get_reference_tables()
            if references is None:
                print(f"Could not get reference list")
                return None
            
            # Find the URL for the specified reference
            ref_url = references[references['referenceTypeCode'] == reference_name]['uri'].values[0]
            response = self.session.get(ref_url)
            if response.status_code == 200:
                return pd.DataFrame(response.json())
            return None
        except Exception as e:
            print(f"Error getting reference {reference_name}: {e}")
            return None
    
    def preview_final_data(self, type_code, freq_code, cl_code, period, reporter_code, 
                          cmd_code, flow_code, max_records=500, include_desc=True):
        """Get preview of final data (no subscription key required)"""
        params = {
            "reportercode": reporter_code,
            "flowCode": flow_code,
            "period": period,
            "cmdCode": cmd_code,
            "maxRecords": max_records,
            "includeDesc": str(include_desc)
        }
        
        url = f"{self.base_url}/public/v1/preview/{type_code}/{freq_code}/{cl_code}?{urlencode(params)}"
        print(f"Requesting URL: {url}")
        
        response = self.session.get(url)
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if 'data' in data and data['data'] is not None:
                return pd.DataFrame(data['data'])
            else:
                print("No data found in response")
                return pd.DataFrame()
        else:
            print(f"Error {response.status_code}: {response.text}")
            return pd.DataFrame()
    
    def preview_tariffline_data(self, type_code, freq_code, cl_code, period, reporter_code, 
                              cmd_code, flow_code, partner_code=None, max_records=500, include_desc=True):
        """Get preview of tariffline data (no subscription key required)"""
        params = {
            "reportercode": reporter_code,
            "flowCode": flow_code,
            "period": period,
            "cmdCode": cmd_code,
            "maxRecords": max_records,
            "includeDesc": str(include_desc)
        }
        
        if partner_code:
            params["partnerCode"] = partner_code
        
        url = f"{self.base_url}/public/v1/previewTariffline/{type_code}/{freq_code}/{cl_code}?{urlencode(params)}"
        print(f"Requesting URL: {url}")
        
        response = self.session.get(url)
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if 'data' in data and data['data'] is not None:
                return pd.DataFrame(data['data'])
            else:
                print("No data found in response")
                return pd.DataFrame()
        else:
            print(f"Error {response.status_code}: {response.text}")
            return pd.DataFrame()

# Main execution
if __name__ == "__main__":
    api = ComtradeAPI()
    
    print("UN Comtrade API Direct Access Exploration")
    print("=========================================")
    
    # 1. Try getting reference tables
    print("\n1. Available Reference Tables:")
    try:
        references = api.get_reference_tables()
        if references is not None:
            print(f"Found {len(references)} reference tables")
            print(references.head())
        else:
            print("Could not retrieve reference tables")
    except Exception as e:
        print(f"Error: {e}")
    
    time.sleep(1)  # Avoid rate limiting
    
    # 2. Try getting reporter codes
    print("\n2. Reporter Codes (Countries):")
    try:
        reporters = api.get_reference('reporter')
        if reporters is not None:
            print(f"Found {len(reporters)} reporters/countries")
            print(reporters.head())
        else:
            print("Could not retrieve reporter codes")
    except Exception as e:
        print(f"Error: {e}")
    
    time.sleep(1)  # Avoid rate limiting
    
    # 3. Try preview final data
    print("\n3. Preview Final Data - US Total Imports for 2022:")
    try:
        imports = api.preview_final_data(
            type_code='C',       # Commodities
            freq_code='A',       # Annual
            cl_code='HS',        # Harmonized System
            period='2022',       # Year 2022
            reporter_code='842', # USA
            cmd_code='TOTAL',    # All commodities
            flow_code='M',       # Imports
            max_records=500,     # Maximum for preview
            include_desc=True    # Include descriptions
        )
        
        if not imports.empty:
            print(f"Retrieved {len(imports)} records")
            print(imports.head())
            
            # Save to CSV for further analysis
            imports.to_csv('us_imports_2022.csv', index=False)
            print("Data saved to us_imports_2022.csv")
        else:
            print("No data returned")
    except Exception as e:
        print(f"Error: {e}")
    
    time.sleep(1)  # Avoid rate limiting
    
    # 4. Try preview tariffline data
    print("\n4. Preview Tariffline Data - US Smartphone Imports from China:")
    try:
        smartphones = api.preview_tariffline_data(
            type_code='C',        # Commodities
            freq_code='M',        # Monthly
            cl_code='HS',         # Harmonized System
            period='202212',      # December 2022
            reporter_code='842',  # USA
            cmd_code='851712',    # Smartphones
            flow_code='M',        # Imports
            partner_code='156',   # China
            max_records=500,      # Maximum for preview
            include_desc=True     # Include descriptions
        )
        
        if not smartphones.empty:
            print(f"Retrieved {len(smartphones)} records")
            print(smartphones.head())
            
            # Save to CSV for further analysis
            smartphones.to_csv('us_smartphones_from_china.csv', index=False)
            print("Data saved to us_smartphones_from_china.csv")
        else:
            print("No data returned")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\nNote: SSL certificate verification has been disabled for testing purposes.")
    print("In a production environment, proper SSL certificate handling is recommended.")
    print("\nThis script demonstrates the direct API calls to UN Comtrade without a subscription key.")
    print("The preview functions are limited to 500 records per query.") 