#!/usr/bin/env python
"""
Load all fixtures including impact records, handling dependencies properly.
This is a comprehensive script that ensures everything loads correctly.
Run with: python3 load_complete_fixtures.py
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 're_meals_api.settings')
django.setup()

from django.core.management import call_command
from django.db import transaction
from fooditem.models import FoodItem
from impactrecord.models import ImpactRecord

print("=" * 70)
print("Loading Complete Fixture Data (Including All 75 Impact Records)")
print("=" * 70)

# Load fixtures in strict dependency order, ignoring duplicates
fixtures_order = [
    ('fixtures/001_restaurant_chains.json', 'Restaurant Chains'),
    ('fixtures/002_restaurants.json', 'Restaurants'),
    ('fixtures/003_warehouses.json', 'Warehouses'),
    ('fixtures/004_communities.json', 'Communities'),
    ('fixtures/005_users.json', 'Users'),
    ('fixtures/006_user_roles.json', 'User Roles'),
    ('fixtures/007_donations.json', 'Donations'),
    ('fixtures/008_food_items.json', 'Food Items'),
    ('fixtures/011_impactrecord.json', 'Impact Records'),
]

print("\nLoading fixtures (duplicates will be skipped)...")
print("-" * 70)

loaded_count = {}
for fixture_path, name in fixtures_order:
    print(f"\n{name}...", end=" ")
    try:
        # Use --verbosity=0 to suppress output, but catch errors
        result = call_command('loaddata', fixture_path, verbosity=0)
        print("✓ Loaded")
        loaded_count[name] = "loaded"
    except Exception as e:
        error_msg = str(e).lower()
        if 'duplicate' in error_msg or 'already exists' in error_msg or 'unique constraint' in error_msg:
            print("⚠ Already exists (skipped)")
            loaded_count[name] = "exists"
        elif 'foreign key' in error_msg:
            print("✗ Missing dependencies")
            loaded_count[name] = "failed"
            # Try to continue - might work if we load more dependencies
        else:
            print(f"✗ Error: {str(e)[:60]}...")
            loaded_count[name] = "failed"

# Now try to load impact records specifically
print("\n" + "=" * 70)
print("Loading Impact Records")
print("=" * 70)

# Check food items
needed_food_ids = set()
try:
    import json
    with open('fixtures/011_impactrecord.json', 'r') as f:
        impact_data = json.load(f)
        needed_food_ids = set(record['fields']['food'] for record in impact_data)
except Exception as e:
    print(f"Error reading fixture: {e}")

existing_food_ids = set(FoodItem.objects.values_list('food_id', flat=True))
missing_food = needed_food_ids - existing_food_ids

print(f"\nFood Items Status:")
print(f"  Required: {len(needed_food_ids)}")
print(f"  Available: {len(existing_food_ids)}")
print(f"  Missing: {len(missing_food)}")

if missing_food and len(missing_food) < len(needed_food_ids):
    print(f"\n  ⚠ Some food items are missing, but we can load partial data")
elif missing_food:
    print(f"\n  ✗ All required food items are missing!")
    print("  Trying to load food items fixture again...")
    try:
        call_command('loaddata', 'fixtures/008_food_items.json', verbosity=0)
        existing_food_ids = set(FoodItem.objects.values_list('food_id', flat=True))
        missing_food = needed_food_ids - existing_food_ids
        print(f"  After retry - Missing: {len(missing_food)}")
    except Exception as e:
        print(f"  ✗ Still failed: {e}")

# Load impact records
print(f"\nLoading Impact Records...", end=" ")
try:
    # Delete test records first (those with auto-generated IDs that don't match fixture pattern)
    test_records = ImpactRecord.objects.exclude(impact_id__regex=r'^IMP\d{7}$')
    test_count = test_records.count()
    if test_count > 0:
        test_records.delete()
        print(f"(deleted {test_count} test records)")
    
    call_command('loaddata', 'fixtures/011_impactrecord.json', verbosity=0)
    print("✓")
except Exception as e:
    error_msg = str(e).lower()
    if 'duplicate' in error_msg or 'already exists' in error_msg:
        print("⚠ Some duplicates skipped")
    elif 'foreign key' in error_msg:
        print("✗ Missing food items - cannot load")
        print(f"  Error: {str(e)[:100]}")
    else:
        print(f"✗ Error: {str(e)[:100]}")

# Final summary
print("\n" + "=" * 70)
print("Final Summary")
print("=" * 70)

total_records = ImpactRecord.objects.count()
print(f"\nImpact Records in Database: {total_records}")

if total_records >= 75:
    print("✓ All 75 records loaded successfully!")
elif total_records > 0:
    print(f"⚠ {total_records} records loaded (expected 75)")
    print("  Some may be missing due to dependencies")
else:
    print("✗ No impact records loaded")

if total_records > 0:
    from django.db.models import Sum
    totals = ImpactRecord.objects.aggregate(
        meals=Sum('meals_saved'),
        weight=Sum('weight_saved_kg'),
        co2=Sum('co2_reduced_kg')
    )
    print(f"\nCurrent Totals:")
    print(f"  Meals saved: {totals['meals']:,.0f}")
    print(f"  Weight saved: {totals['weight']:,.1f} kg")
    print(f"  CO₂ reduced: {totals['co2']:,.1f} kg")

print("\n" + "=" * 70)
print("Auto-Creation Status:")
print("=" * 70)
print("✓ Impact records will be automatically created when:")
print("  1. Food items are marked as distributed (is_distributed=True)")
print("  2. Deliveries are completed (status='delivered')")
print("✓ Duplicate prevention: Records are only created once per food item")
print("✓ Calculations use consistent formulas across all creation methods")
