#!/usr/bin/env python
"""
Script to load all fixtures in the correct order, handling dependencies.
Run with: python3 load_fixtures_properly.py
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

fixtures_order = [
    'fixtures/001_restaurant_chains.json',
    'fixtures/002_restaurants.json',
    'fixtures/003_warehouses.json',
    'fixtures/004_communities.json',
    'fixtures/005_users.json',
    'fixtures/006_user_roles.json',
    'fixtures/007_donations.json',
    'fixtures/008_food_items.json',
    'fixtures/011_impactrecord.json',
]

print("Loading fixtures in dependency order...")
print("=" * 60)

with transaction.atomic():
    for fixture in fixtures_order:
        print(f"\nLoading {fixture}...")
        try:
            call_command('loaddata', fixture, verbosity=0)
            print(f"  ✓ Successfully loaded {fixture}")
        except Exception as e:
            error_msg = str(e)
            if 'duplicate' in error_msg.lower() or 'already exists' in error_msg.lower():
                print(f"  ⚠ Some objects in {fixture} already exist (skipping duplicates)")
            else:
                print(f"  ✗ Error loading {fixture}: {error_msg}")
                # Don't break on errors, continue with other fixtures
                pass

print("\n" + "=" * 60)
print("Done! Checking results...")

from impactrecord.models import ImpactRecord
from fooditem.models import FoodItem
print(f"Impact records: {ImpactRecord.objects.count()}")
print(f"Food items: {FoodItem.objects.count()}")
