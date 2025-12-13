#!/usr/bin/env python
"""
Test script for warehouse inventory functionality
"""
import os
import sys
import django
from datetime import timedelta
from django.utils import timezone

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 're_meals_api.settings')
django.setup()

from delivery.models import Delivery
from warehouse.models import Warehouse
from donation.models import Donation
from fooditem.models import FoodItem

def create_test_delivery():
    """Create a test delivery to warehouse"""

    # Check available warehouses
    print("\n📍 Available warehouses:")
    for wh in Warehouse.objects.all():
        print(f"   - {wh.warehouse_id}: {wh.address}")

    # Check available donations
    print("\n📦 Available donations:")
    for don in Donation.objects.all()[:5]:
        print(f"   - {don.donation_id}: {don.restaurant}")

    # Get warehouse and donation
    warehouse = Warehouse.objects.first()
    donation = Donation.objects.filter(status='accepted').first()

    if not warehouse or not donation:
        print("❌ No warehouse or donation found!")
        return None

    # Create delivery
    delivery = Delivery.objects.create(
        delivery_type='donation',
        pickup_time=timezone.now(),
        dropoff_time=timedelta(hours=2),
        pickup_location_type='restaurant',
        dropoff_location_type='warehouse',
        status='delivered',  # Mark as delivered
        warehouse_id=warehouse,
        donation_id=donation
    )

    print(f"✅ Created delivery: {delivery.delivery_id}")
    print(f"   - Warehouse: {warehouse.warehouse_id}")
    print(f"   - Donation: {donation.donation_id}")
    print(f"   - Status: {delivery.status}")

    # Check food items in this donation
    food_items = FoodItem.objects.filter(donation=donation)
    print(f"\n📦 Food items in donation:")
    for item in food_items:
        print(f"   - {item.food_id}: {item.name} ({item.quantity} {item.unit})")
        print(f"     Expired: {item.is_expired}, Distributed: {item.is_distributed}")

    return delivery

def test_inventory_query():
    """Test the warehouse inventory query logic"""

    warehouse = Warehouse.objects.first()  # Use first warehouse
    today = timezone.now().date()

    print(f"\n🏪 Testing inventory for: {warehouse.warehouse_id}")
    print(f"   Address: {warehouse.address}")

    # Find deliveries to this warehouse
    delivered_to_warehouse = Delivery.objects.filter(
        warehouse_id=warehouse,
        dropoff_location_type='warehouse',
        status='delivered'
    )

    print(f"\n📦 Deliveries to warehouse: {delivered_to_warehouse.count()}")
    for delivery in delivered_to_warehouse:
        print(f"   - {delivery.delivery_id}: Donation {delivery.donation_id}")

    # Get donation IDs
    donation_ids = delivered_to_warehouse.values_list('donation_id', flat=True)

    # Get all food items from these donations (without filters) for debugging
    all_items = FoodItem.objects.filter(donation__donation_id__in=donation_ids)
    print(f"\n📊 All food items from delivered donations: {all_items.count()}")
    for item in all_items:
        print(f"   - {item.food_id}: {item.name}")
        print(f"     Expire: {item.expire_date}, Today: {today}, Valid: {item.expire_date >= today}")
        print(f"     Distributed: {item.is_distributed}")

    # Get food items that meet inventory criteria
    food_items = FoodItem.objects.filter(
        donation__donation_id__in=donation_ids,
        is_distributed=False,
        expire_date__gte=today
    )

    print(f"\n✅ Food items in warehouse inventory (not expired, not distributed): {food_items.count()}")
    for item in food_items:
        print(f"   - {item.food_id}: {item.name} ({item.quantity} {item.unit})")
        print(f"     Expires: {item.expire_date}, Distributed: {item.is_distributed}")

if __name__ == '__main__':
    print("="*70)
    print("WAREHOUSE INVENTORY TEST")
    print("="*70)

    try:
        # Create test delivery
        delivery = create_test_delivery()

        if not delivery:
            print("\n⚠️  Could not create delivery - check database")
            sys.exit(1)

        # Test inventory query
        test_inventory_query()

        print("\n" + "="*70)
        print("✅ TEST COMPLETE")
        print("="*70)
        print(f"\nNow test the API endpoint:")
        print(f"curl http://localhost:8000/api/warehouse/warehouses/WAH0000001/inventory/")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
