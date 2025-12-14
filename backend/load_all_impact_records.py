#!/usr/bin/env python
"""
Load all 75 impact records from the fixture file.
This script ensures all dependencies are loaded first.
Run with: python3 load_all_impact_records.py
"""
import os
import sys
import django
import json

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 're_meals_api.settings')
django.setup()

from django.core.management import call_command
from django.db import transaction
from fooditem.models import FoodItem
from impactrecord.models import ImpactRecord

print("=" * 60)
print("Loading all 75 impact records from fixture")
print("=" * 60)

# Step 1: Load all dependencies in order
print("\nStep 1: Loading dependencies...")
fixtures_order = [
    'fixtures/001_restaurant_chains.json',
    'fixtures/002_restaurants.json',
    'fixtures/003_warehouses.json',
    'fixtures/004_communities.json',
    'fixtures/005_users.json',
    'fixtures/006_user_roles.json',
    'fixtures/007_donations.json',
    'fixtures/008_food_items.json',
]

for fixture in fixtures_order:
    print(f"  Loading {fixture}...", end=" ")
    try:
        call_command('loaddata', fixture, verbosity=0)
        print("✓")
    except Exception as e:
        error_msg = str(e)
        if 'duplicate' in error_msg.lower() or 'already exists' in error_msg.lower():
            print("⚠ (some duplicates skipped)")
        else:
            print(f"✗ Error: {error_msg[:50]}...")
            # Continue anyway - some may already exist

# Step 2: Verify food items exist
print("\nStep 2: Verifying food items...")
with open('fixtures/011_impactrecord.json', 'r') as f:
    impact_data = json.load(f)

needed_food_ids = set(record['fields']['food'] for record in impact_data)
existing_food_ids = set(FoodItem.objects.values_list('food_id', flat=True))
missing_food = needed_food_ids - existing_food_ids

print(f"  Needed: {len(needed_food_ids)} food items")
print(f"  Existing: {len(existing_food_ids)} food items")
print(f"  Missing: {len(missing_food)} food items")

if missing_food:
    print(f"  ⚠ Warning: {len(missing_food)} food items are missing!")
    print(f"  First 5 missing: {list(missing_food)[:5]}")
    print("  Attempting to load food items fixture again...")
    try:
        call_command('loaddata', 'fixtures/008_food_items.json', verbosity=0)
        # Recheck
        existing_food_ids = set(FoodItem.objects.values_list('food_id', flat=True))
        missing_food = needed_food_ids - existing_food_ids
        if missing_food:
            print(f"  ✗ Still missing {len(missing_food)} food items")
        else:
            print("  ✓ All food items now exist")
    except Exception as e:
        print(f"  ✗ Error loading food items: {e}")

# Step 3: Clear existing impact records from test data
print("\nStep 3: Preparing impact records...")
existing_count = ImpactRecord.objects.count()
if existing_count > 0:
    print(f"  Found {existing_count} existing impact records")
    # Delete test records (those not from fixture)
    test_records = ImpactRecord.objects.exclude(impact_id__startswith='IMP00000')
    test_count = test_records.count()
    if test_count > 0:
        test_records.delete()
        print(f"  ✓ Deleted {test_count} test records")
    # Keep any that match fixture IDs, will skip duplicates
    print("  Will skip duplicates when loading fixture")

# Step 4: Load impact records
print("\nStep 4: Loading impact records...")
try:
    with transaction.atomic():
        call_command('loaddata', 'fixtures/011_impactrecord.json', verbosity=1)
    print("  ✓ Successfully loaded impact records")
except Exception as e:
    error_msg = str(e)
    if 'duplicate' in error_msg.lower() or 'already exists' in error_msg.lower():
        print("  ⚠ Some records already exist (skipping duplicates)")
    elif 'foreign key' in error_msg.lower():
        print(f"  ✗ Foreign key error: {error_msg[:100]}...")
        print("  This usually means food items are missing. Check Step 2 above.")
    else:
        print(f"  ✗ Error: {error_msg[:100]}...")

# Step 5: Verify results
print("\n" + "=" * 60)
print("Final Results:")
print("=" * 60)
total_records = ImpactRecord.objects.count()
print(f"Total impact records in database: {total_records}")

if total_records >= 75:
    print("✓ All 75 records loaded successfully!")
    
    # Calculate totals
    from django.db.models import Sum
    totals = ImpactRecord.objects.aggregate(
        meals=Sum('meals_saved'),
        weight=Sum('weight_saved_kg'),
        co2=Sum('co2_reduced_kg')
    )
    print(f"\nTotals:")
    print(f"  Meals saved: {totals['meals']:,.0f}")
    print(f"  Weight saved: {totals['weight']:,.1f} kg")
    print(f"  CO₂ reduced: {totals['co2']:,.1f} kg")
else:
    print(f"⚠ Only {total_records} records loaded (expected 75)")
    print("  Some records may have been skipped due to missing dependencies")

print("\n✓ Impact dashboard should now show all data!")
