#!/usr/bin/env python
"""
Create minimal test data for impact records to work.
This creates the necessary food items and impact records for testing.
Run with: python3 create_test_impact_data.py
"""
import os
import sys
import django
from datetime import date, timedelta

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 're_meals_api.settings')
django.setup()

from fooditem.models import FoodItem
from impactrecord.models import ImpactRecord
from donation.models import Donation
from restaurants.models import Restaurant

print("Creating test impact data...")
print("=" * 60)

# Get or create a restaurant
restaurant = Restaurant.objects.first()
if not restaurant:
    print("No restaurant found. Please load restaurant fixtures first.")
    sys.exit(1)

# Get or create a donation
donation = Donation.objects.first()
if not donation:
    from users.models import User
    user = User.objects.first()
    if not user:
        print("No user found. Please load user fixtures first.")
        sys.exit(1)
    
    donation = Donation.objects.create(
        donation_id="DON_TEST001",
        restaurant=restaurant,
        created_by=user,
        status="completed"
    )
    print(f"Created test donation: {donation.donation_id}")

# Create 10 test food items if they don't exist
food_items_created = 0
for i in range(1, 11):
    # Don't set food_id - let the model generate it automatically
    if FoodItem.objects.count() < 10:
        food_item = FoodItem.objects.create(
            name=f"Test Food Item {i}",
            quantity=10 + i * 5,
            unit="kg",
            expire_date=date.today() + timedelta(days=7),
            is_expired=False,
            is_claimed=False,
            is_distributed=True,  # Must be distributed to create impact record
            donation=donation
        )
        food_items_created += 1

print(f"Created {food_items_created} food items")

# Create impact records for the last 10 days
impact_records_created = 0
food_items = list(FoodItem.objects.filter(is_distributed=True)[:10])

# If we don't have enough distributed food items, mark some as distributed
if len(food_items) < 10:
    all_food = list(FoodItem.objects.all()[:10])
    for food in all_food:
        if not food.is_distributed:
            food.is_distributed = True
            food.save()
    food_items = list(FoodItem.objects.filter(is_distributed=True)[:10])

for i, food_item in enumerate(food_items):
    impact_date = date.today() - timedelta(days=9-i)
    
    # Check if impact record already exists for this food item
    if not ImpactRecord.objects.filter(food=food_item).exists():
        # Calculate impact based on quantity
        meals = food_item.quantity * 2  # Assume 2 meals per kg
        weight = food_item.quantity
        co2 = weight * 0.5  # Assume 0.5 kg CO2 per kg of food
        
        # Don't set impact_id - let the model generate it automatically
        ImpactRecord.objects.create(
            meals_saved=meals,
            weight_saved_kg=weight,
            co2_reduced_kg=co2,
            impact_date=impact_date,
            food=food_item
        )
        impact_records_created += 1

print(f"Created {impact_records_created} impact records")

# Summary
total_records = ImpactRecord.objects.count()
print("\n" + "=" * 60)
print(f"Total impact records in database: {total_records}")

if total_records > 0:
    print("✓ Impact dashboard should now show data!")
else:
    print("✗ No impact records created. Check the errors above.")
