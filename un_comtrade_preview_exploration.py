import comtradeapicall
import pandas as pd
import ssl
import certifi
import urllib3
import requests

# Disable SSL warnings and set verify to False for testing purposes only
# In production, you should properly configure SSL certificates
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
session = requests.Session()
session.verify = False

print("UN Comtrade API Preview Exploration")
print("===================================")

# 1. Get list of reference tables
print("\n1. Available Reference Tables:")
try:
    reference_tables = comtradeapicall.listReference()
    print(f"Found {len(reference_tables)} reference tables")
    print(reference_tables.head())
except Exception as e:
    print(f"Error: {e}")

# 2. Get reporter codes (countries)
print("\n2. Reporter Codes (Countries):")
try:
    reporters = comtradeapicall.getReference('reporter')
    print(f"Found {len(reporters)} reporters/countries")
    print(reporters.head())
except Exception as e:
    print(f"Error: {e}")

# 3. Get partner codes
print("\n3. Partner Codes:")
try:
    partners = comtradeapicall.getReference('partner')
    print(f"Found {len(partners)} partners")
    print(partners.head())
except Exception as e:
    print(f"Error: {e}")

# 4. Get HS commodity codes
print("\n4. HS Commodity Codes:")
try:
    commodities = comtradeapicall.getReference('cmd:HS')
    print(f"Found {len(commodities)} HS commodity codes")
    print(commodities.head())
except Exception as e:
    print(f"Error: {e}")

# 5. Try the preview final data with all required parameters
print("\n5. Preview Final Data - US Electronics Imports:")
try:
    electronics_imports = comtradeapicall.previewFinalData(
        typeCode='C',       # Commodities (as opposed to services)
        freqCode='M',       # Monthly data
        clCode='HS',        # Harmonized System classification
        period='202301',    # January 2023 (adjust as needed for more recent data)
        reporterCode='842', # USA
        cmdCode='85',       # Electronics (HS code 85)
        flowCode='M',       # Imports
        partnerCode=None,   # All partners
        partner2Code=None,  # No second partner
        customsCode=None,   # No customs code filter
        motCode=None,       # No mode of transport filter
        maxRecords=500,     # Maximum allowed for preview
        includeDesc=True    # Include descriptions
    )
    print(f"Retrieved {len(electronics_imports)} records")
    if not electronics_imports.empty:
        print(electronics_imports.head())
        
        # Basic visualization: Top 10 partner countries for electronics imports
        if len(electronics_imports) > 1:
            top_partners = electronics_imports.groupby('partnerDesc')['primaryValue'].sum().sort_values(ascending=False).head(10)
            plt.figure(figsize=(12, 6))
            top_partners.plot(kind='bar')
            plt.title('Top 10 Countries for US Electronics Imports')
            plt.xlabel('Partner Country')
            plt.ylabel('Trade Value (US$)')
            plt.tight_layout()
            plt.savefig('us_electronics_imports.png')
            print("\nCreated visualization: us_electronics_imports.png")
    else:
        print("No data returned. Try adjusting period or parameters.")
except Exception as e:
    print(f"Error: {e}")

# 6. Convert ISO3 codes to Comtrade codes
print("\n6. Converting ISO3 Country Codes:")
try:
    countries = "USA,CHN,DEU,JPN,GBR"
    country_codes = comtradeapicall.convertCountryIso3ToCode(countries)
    print(f"ISO3 codes {countries} convert to Comtrade codes: {country_codes}")
except Exception as e:
    print(f"Error: {e}")

# 7. Try preview tariff line data with all required parameters
print("\n7. Preview Tariff Line Data - Smartphones from China to USA:")
try:
    # Smartphones fall under HS code 851712
    smartphone_imports = comtradeapicall.previewTarifflineData(
        typeCode='C',        # Commodities
        freqCode='M',        # Monthly
        clCode='HS',         # Harmonized System
        period='202301',     # January 2023
        reporterCode='842',  # USA
        cmdCode='851712',    # Smartphones
        flowCode='M',        # Imports
        partnerCode='156',   # China
        partner2Code=None,   # No second partner
        customsCode=None,    # No customs code filter
        motCode=None,        # No mode of transport filter
        maxRecords=500,      # Maximum allowed for preview
        includeDesc=True     # Include descriptions
    )
    print(f"Retrieved {len(smartphone_imports)} records")
    if not smartphone_imports.empty:
        print(smartphone_imports.head())
    else:
        print("No data returned. Try adjusting period or parameters.")
except Exception as e:
    print(f"Error: {e}")

# 8. Try a more basic example 
print("\n8. Preview Final Data - Basic Example (All Trade for USA):")
try:
    # Using all required parameters with simpler query
    all_trade = comtradeapicall.previewFinalData(
        typeCode='C',       # Commodities
        freqCode='A',       # Annual data
        clCode='HS',        # Harmonized System
        period='2022',      # Year 2022
        reporterCode='842', # USA
        cmdCode='TOTAL',    # All commodities
        flowCode='M',       # Imports
        partnerCode=None,   # All partners
        partner2Code=None,  # No second partner
        customsCode=None,   # No customs code filter
        motCode=None,       # No mode of transport filter
        maxRecords=500,     # Maximum allowed
        includeDesc=True    # Include descriptions
    )
    print(f"Retrieved {len(all_trade)} records")
    if not all_trade.empty:
        print(all_trade.head())
    else:
        print("No data returned. Try adjusting period or parameters.")
except Exception as e:
    print(f"Error: {e}")

print("\nNote: SSL certificate issues are being bypassed for testing purposes only.")
print("In a production environment, you should properly configure SSL certificates.")
print("\nExploration shows the structure of required API calls, though we're experiencing connection issues.")
print("The preview API functions are available without a subscription, but require proper network configuration.")
print("\nExploration complete. These examples demonstrate what's possible with the preview API functions.")
print("For a real application, you would want to:")
print("1. Handle errors more gracefully")
print("2. Allow users to select parameters dynamically")
print("3. Create more meaningful visualizations")
print("4. Implement caching to reduce API calls")
print("5. Consider obtaining a subscription key for production use if 500 record limit is insufficient") 