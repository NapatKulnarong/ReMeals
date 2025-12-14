#!/usr/bin/env python
"""
Create missing donations and food items needed for impact records fixture.
This creates the minimal required data to load all 75 impact records.
Run with: python3 create_missing_data_for_impact.py
"""
import os
import sys
import django
import json
from datetime import date, timedelta

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 're_meals_api.settings')
django.setup()

from donation.models import Donation
from fooditem.models import FoodItem
from restaurants.models import Restaurant
from impactrecord.models import ImpactRecord

print("=" * 70)
print("Creating Missing Data for Impact Records")
print("=" * 70)

# Read the impact fixture to see what we need
with open('fixtures/011_impactrecord.json', 'r') as f:
    impact_data = json.load(f)

# Get all needed food IDs
needed_food_ids = sorted(set(record['fields']['food'] for record in impact_data))
print(f"\nRequired food items: {len(needed_food_ids)}")

# Check what exists
existing_food_ids = set(FoodItem.objects.values_list('food_id', flat=True))
missing_food_ids = [fid for fid in needed_food_ids if fid not in existing_food_ids]

print(f"Existing food items: {len(existing_food_ids)}")
print(f"Missing food items: {len(missing_food_ids)}")

if not missing_food_ids:
    print("\n✓ All required food items already exist!")
    sys.exit(0)

# Get or create required dependencies
print("\nSetting up dependencies...")

# Get a restaurant
restaurant = Restaurant.objects.first()
if not restaurant:
    print("✗ No restaurant found. Please load restaurant fixtures first.")
    sys.exit(1)
print(f"  Using restaurant: {restaurant.restaurant_id}")

# Create donations as needed (group food items by donation)
# We'll create one donation per 10 food items to keep it organized
donations_created = 0
food_items_created = 0

# Read food items fixture to get details
food_item_details = {}
try:
    with open('fixtures/008_food_items.json', 'r') as f:
        food_fixture = json.load(f)
        for item in food_fixture:
            if 'pk' in item:
                food_item_details[item['pk']] = item['fields']
except Exception as e:
    print(f"  ⚠ Could not read food items fixture: {e}")
    print("  Will create food items with default values")

# Create missing food items in batches
batch_size = 10
for i in range(0, len(missing_food_ids), batch_size):
    batch = missing_food_ids[i:i+batch_size]
    
    # Create a donation for this batch (donation_id must be max 10 chars)
    batch_num = i//batch_size + 1
    donation_id = f"DON{batch_num:07d}"  # Format: DON0000001, DON0000002, etc.
    donation, created = Donation.objects.get_or_create(
        donation_id=donation_id,
        defaults={
            'restaurant': restaurant,
            'status': 'completed',
        }
    )
    if created:
        donations_created += 1
    
    # Create food items for this batch
    for food_id in batch:
        if FoodItem.objects.filter(food_id=food_id).exists():
            continue
            
        # Get details from fixture if available
        details = food_item_details.get(food_id, {})
        
        FoodItem.objects.create(
            food_id=food_id,
            name=details.get('name', f'Food Item {food_id}'),
            quantity=details.get('quantity', 20),
            unit=details.get('unit', 'kg'),
            expire_date=details.get('expire_date', str(date.today() + timedelta(days=7))),
            is_expired=details.get('is_expired', False),
            is_claimed=details.get('is_claimed', False),
            is_distributed=True,  # Must be distributed for impact records
            donation=donation
        )
        food_items_created += 1

print(f"\nCreated:")
print(f"  Donations: {donations_created}")
print(f"  Food items: {food_items_created}")

# Now try to load impact records
print("\n" + "=" * 70)
print("Loading Impact Records")
print("=" * 70)

# Delete test records
test_records = ImpactRecord.objects.exclude(impact_id__regex=r'^IMP\d{7}$')
test_count = test_records.count()
if test_count > 0:
    test_records.delete()
    print(f"Deleted {test_count} test records")

# Load the fixture
from django.core.management import call_command
try:
    call_command('loaddata', 'fixtures/011_impactrecord.json', verbosity=0)
    print("✓ Successfully loaded impact records fixture")
except Exception as e:
    error_msg = str(e).lower()
    if 'duplicate' in error_msg or 'already exists' in error_msg:
        print("⚠ Some records already exist (skipped duplicates)")
    else:
        print(f"✗ Error: {str(e)[:100]}")

# Final summary
total_records = ImpactRecord.objects.count()
print(f"\nTotal impact records: {total_records}")

if total_records >= 75:
    print("✓ All 75 records loaded!")
    from django.db.models import Sum
    totals = ImpactRecord.objects.aggregate(
        meals=Sum('meals_saved'),
        weight=Sum('weight_saved_kg'),
        co2=Sum('co2_reduced_kg')
    )
    print(f"\nTotals:")
    print(f"  Meals: {totals['meals']:,.0f}")
    print(f"  Weight: {totals['weight']:,.1f} kg")
    print(f"  CO₂: {totals['co2']:,.1f} kg")
else:
    print(f"⚠ Only {total_records} records (expected 75)")

print("\n✓ Done!")
