from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from donation.models import Donation
from delivery.models import Delivery
from fooditem.models import FoodItem
from restaurant_chain.models import RestaurantChain
from restaurants.models import Restaurant
from warehouse.models import Warehouse
from warehouse.serializers import WarehouseSerializer


class WarehouseAPITests(APITestCase):
    def setUp(self):
        self.chain = RestaurantChain.objects.create(chain_id="CHAIN01", chain_name="Food Chain")
        self.restaurant = Restaurant.objects.create(
            restaurant_id="REST01",
            address="100 Test Rd",
            name="TestKitchen",
            branch_name="Central",
            is_chain=True,
            chain=self.chain,
        )
        self.warehouse = Warehouse.objects.create(
            warehouse_id="WAHTEST01",
            address="Warehouse Lane 1",
            capacity=500.0,
            stored_date=timezone.now().date(),
            exp_date=timezone.now().date() + timedelta(days=30),
        )

    def _inventory_url(self, warehouse):
        return f"/api/warehouse/warehouses/{warehouse.warehouse_id}/inventory/"

    def _create_donation(self, donation_id="DONTEST01", status="accepted"):
        return Donation.objects.create(
            donation_id=donation_id,
            restaurant=self.restaurant,
            status=status,
        )

    def _create_delivery(
        self,
        donation,
        warehouse,
        status="delivered",
        dropoff_type="warehouse",
        delivery_id="DLVTEST01",
    ):
        return Delivery.objects.create(
            delivery_id=delivery_id,
            delivery_type="donation",
            pickup_time=timezone.now(),
            dropoff_time=timedelta(hours=1),
            pickup_location_type="restaurant",
            dropoff_location_type=dropoff_type,
            status=status,
            warehouse_id=warehouse,
            donation_id=donation,
        )

    def _create_food_item(
        self,
        donation,
        name="Sample Food",
        quantity=10,
        expire_offset_days=5,
        is_expired=False,
        is_claimed=False,
        is_distributed=False,
    ):
        return FoodItem.objects.create(
            name=name,
            quantity=quantity,
            unit="kg",
            expire_date=timezone.now().date() + timedelta(days=expire_offset_days),
            is_expired=is_expired,
            is_claimed=is_claimed,
            is_distributed=is_distributed,
            donation=donation,
        )

    # 1. Warehouse IDs are kept when supplied explicitly.
    def test_warehouse_preserves_supplied_id(self):
        warehouse = Warehouse.objects.create(
            warehouse_id="WAHOVERRIDE",
            address="Override St",
            capacity=100.0,
            stored_date=timezone.now().date(),
            exp_date=timezone.now().date() + timedelta(days=10),
        )
        self.assertEqual(warehouse.warehouse_id, "WAHOVERRIDE")

    # 2. Warehouse save auto-generates prefixed IDs when missing.
    def test_warehouse_autogenerates_id_when_empty(self):
        warehouse = Warehouse(
            address="Auto St",
            capacity=50.0,
            stored_date=timezone.now().date(),
            exp_date=timezone.now().date() + timedelta(days=15),
        )
        warehouse.save()
        self.assertTrue(warehouse.warehouse_id.startswith("WAH"))

    # 3. Warehouse __str__ shows identifier and address.
    def test_warehouse_str_includes_id_and_address(self):
        self.assertIn(self.warehouse.warehouse_id, str(self.warehouse))
        self.assertIn(self.warehouse.address, str(self.warehouse))

    # 4. Serializer exposes capacity in its payload.
    def test_serializer_includes_capacity(self):
        data = WarehouseSerializer(instance=self.warehouse).data
        self.assertEqual(data["capacity"], self.warehouse.capacity)

    # 5. Serializer exposes stored_date and exp_date.
    def test_serializer_includes_dates(self):
        data = WarehouseSerializer(instance=self.warehouse).data
        self.assertIn("stored_date", data)
        self.assertIn("exp_date", data)

    # 6. Inventory endpoint responds with empty counts when no deliveries exist.
    def test_inventory_returns_zero_when_no_deliveries(self):
        response = self.client.get(self._inventory_url(self.warehouse))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_items"], 0)

    # 7. Inventory ignores deliveries that are not delivered.
    def test_inventory_ignores_pending_deliveries(self):
        donation = self._create_donation("DONPENDING")
        self._create_delivery(donation, self.warehouse, status="pending", delivery_id="DLV001")
        self._create_food_item(donation, quantity=5)
        response = self.client.get(self._inventory_url(self.warehouse))
        self.assertEqual(response.data["total_items"], 0)

    # 8. Inventory includes items from delivered donations.
    def test_inventory_includes_items_from_delivered_donations(self):
        donation = self._create_donation("DONDONE")
        self._create_delivery(donation, self.warehouse, delivery_id="DLV002")
        self._create_food_item(donation, quantity=3)
        response = self.client.get(self._inventory_url(self.warehouse))
        self.assertEqual(response.data["total_items"], 1)

    # 9. Inventory marks expired items when expire_date is in the past.
    def test_inventory_marks_expired_items(self):
        donation = self._create_donation("DONEXPIRED")
        self._create_delivery(donation, self.warehouse, delivery_id="DLV003")
        expired_item = self._create_food_item(donation, name="Expired", expire_offset_days=-1)
        self.assertFalse(expired_item.is_expired)
        self.client.get(self._inventory_url(self.warehouse))
        expired_item.refresh_from_db()
        self.assertTrue(expired_item.is_expired)

    # 10. Inventory does not alter items already marked as expired.
    def test_inventory_ignores_already_expired_items(self):
        donation = self._create_donation("DONALREADY")
        self._create_delivery(donation, self.warehouse, delivery_id="DLV004")
        item = self._create_food_item(donation, name="Already Expired", expire_offset_days=-2, is_expired=True)
        self.client.get(self._inventory_url(self.warehouse))
        item.refresh_from_db()
        self.assertTrue(item.is_expired)

    # 11. Inventory still lists claimed items even when claimed.
    def test_inventory_lists_claimed_items(self):
        donation = self._create_donation("DONCLAIMED")
        self._create_delivery(donation, self.warehouse, delivery_id="DLV005")
        self._create_food_item(donation, name="Claimed", is_claimed=True)
        response = self.client.get(self._inventory_url(self.warehouse))
        inventory_names = {item["name"] for item in response.data["inventory"]}
        self.assertIn("Claimed", inventory_names)

    # 12. Inventory still lists distributed items regardless of flags.
    def test_inventory_lists_distributed_items(self):
        donation = self._create_donation("DONDIST")
        self._create_delivery(donation, self.warehouse, delivery_id="DLV006")
        self._create_food_item(donation, name="Distributed", is_distributed=True)
        response = self.client.get(self._inventory_url(self.warehouse))
        inventory_names = {item["name"] for item in response.data["inventory"]}
        self.assertIn("Distributed", inventory_names)

    # 13. Inventory total counts reflect the number of returned records.
    def test_inventory_total_matches_returned_items(self):
        donation = self._create_donation("DONTOTAL")
        self._create_delivery(donation, self.warehouse, delivery_id="DLV007")
        self._create_food_item(donation, name="One", quantity=1)
        self._create_food_item(donation, name="Two", quantity=2)
        response = self.client.get(self._inventory_url(self.warehouse))
        self.assertEqual(response.data["total_items"], 2)

    # 14. Inventory metadata is anchored to the warehouse being queried.
    def test_inventory_metadata_matches_warehouse(self):
        response = self.client.get(self._inventory_url(self.warehouse))
        self.assertEqual(response.data["warehouse_id"], self.warehouse.warehouse_id)
        self.assertEqual(response.data["warehouse_address"], self.warehouse.address)

    # 15. Inventory endpoint only considers deliveries with dropoff_type 'warehouse'.
    def test_inventory_ignores_non_warehouse_dropoffs(self):
        donation = self._create_donation("DONCOMM")
        self._create_delivery(donation, self.warehouse, dropoff_type="community", delivery_id="DLV008")
        self._create_food_item(donation, quantity=4)
        response = self.client.get(self._inventory_url(self.warehouse))
        self.assertEqual(response.data["total_items"], 0)

    # 16. Inventory aggregates items from multiple donations.
    def test_inventory_handles_multiple_donations(self):
        first = self._create_donation("DONMULTI1")
        second = self._create_donation("DONMULTI2")
        self._create_delivery(first, self.warehouse, delivery_id="DLV009")
        self._create_delivery(second, self.warehouse, delivery_id="DLV010")
        self._create_food_item(first, name="First")
        self._create_food_item(second, name="Second")
        response = self.client.get(self._inventory_url(self.warehouse))
        self.assertEqual(response.data["total_items"], 2)

    # 17. Inventory handles donations from different restaurants but same warehouse.
    def test_inventory_handles_multiple_restaurants(self):
        other_chain = RestaurantChain.objects.create(chain_id="CHAIN02", chain_name="Other Chain")
        other_restaurant = Restaurant.objects.create(
            restaurant_id="REST02",
            address="200 Other Rd",
            name="OtherKitchen",
            branch_name="Main",
            is_chain=True,
            chain=other_chain,
        )
        donation = Donation.objects.create(donation_id="DONOTHER", restaurant=other_restaurant, status="accepted")
        self._create_delivery(donation, self.warehouse, delivery_id="DLV011")
        self._create_food_item(donation, name="Other Food")
        response = self.client.get(self._inventory_url(self.warehouse))
        self.assertEqual(response.data["total_items"], 1)

    # 18. Inventory responds with an empty array when donations exist but no food items.
    def test_inventory_empty_inventory_list_when_no_food_items(self):
        donation = self._create_donation("DONTODD")
        self._create_delivery(donation, self.warehouse, delivery_id="DLV012")
        response = self.client.get(self._inventory_url(self.warehouse))
        self.assertEqual(response.data["inventory"], [])

    # 19. Inventory does not mark future-expiring items as expired.
    def test_inventory_skips_future_expiry_items(self):
        donation = self._create_donation("DONFUTURE")
        self._create_delivery(donation, self.warehouse, delivery_id="DLV013")
        future_item = self._create_food_item(donation, name="Future", expire_offset_days=10)
        self.client.get(self._inventory_url(self.warehouse))
        future_item.refresh_from_db()
        self.assertFalse(future_item.is_expired)

    # 20. Inventory response serializes each food item name and quantity.
    def test_inventory_serializes_food_name_and_quantity(self):
        donation = self._create_donation("DONSERIAL")
        self._create_delivery(donation, self.warehouse, delivery_id="DLV014")
        self._create_food_item(donation, name="Serialized", quantity=7)
        response = self.client.get(self._inventory_url(self.warehouse))
        item = response.data["inventory"][0]
        self.assertEqual(item["name"], "Serialized")
        self.assertEqual(item["quantity"], 7)

    # 21. Inventory totals only include completed dropoffs, not cancellations.
    def test_inventory_ignores_cancelled_deliveries(self):
        donation = self._create_donation("DONCANCEL")
        self._create_delivery(
            donation,
            self.warehouse,
            status="cancelled",
            delivery_id="DLV015",
        )
        self._create_food_item(donation, name="Cancelled")
        response = self.client.get(self._inventory_url(self.warehouse))
        self.assertEqual(response.data["total_items"], 0)

    # 22. Inventory counts delivered donations even when DurationField dropoff_time is zero.
    def test_inventory_handles_zero_duration(self):
        donation = self._create_donation("DONTIMEL")
        delivery = Delivery.objects.create(
            delivery_id="DLV016",
            delivery_type="donation",
            pickup_time=timezone.now(),
            dropoff_time=timedelta(hours=0),
            pickup_location_type="restaurant",
            dropoff_location_type="warehouse",
            status="delivered",
            warehouse_id=self.warehouse,
            donation_id=donation,
        )
        self._create_food_item(donation, name="ZeroTime")
        response = self.client.get(self._inventory_url(self.warehouse))
        self.assertEqual(response.data["total_items"], 1)

    # 23. Inventory endpoint returns 404 for unknown warehouse
    def test_inventory_404_for_missing_warehouse(self):
        response = self.client.get("/api/warehouse/warehouses/UNKNOWN/inventory/")
        self.assertEqual(response.status_code, 404)

    # 24. Warehouse listing returns data for created warehouses
    def test_list_warehouses_shows_created(self):
        response = self.client.get("/api/warehouse/warehouses/")
        self.assertEqual(response.status_code, 200)
        ids = {item["warehouse_id"] for item in response.data}
        self.assertIn(self.warehouse.warehouse_id, ids)

    # 25. Warehouse detail includes capacity field
    def test_detail_shows_capacity(self):
        response = self.client.get(f"/api/warehouse/warehouses/{self.warehouse.warehouse_id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["capacity"], self.warehouse.capacity)

    # 26. Serializer readable fields include address
    def test_serializer_contains_address(self):
        data = WarehouseSerializer(instance=self.warehouse).data
        self.assertEqual(data["address"], self.warehouse.address)

    # 27. Inventory returns empty list when no donations deliver to warehouse
    def test_inventory_empty_when_no_donations(self):
        response = self.client.get(self._inventory_url(self.warehouse))
        self.assertEqual(response.data["inventory"], [])

    # 28. Inventory includes restaurant info per food item
    def test_inventory_serializes_restaurant(self):
        donation = self._create_donation("DONREST")
        self._create_delivery(donation, self.warehouse, delivery_id="DLV017")
        self._create_food_item(donation, quantity=1)
        response = self.client.get(self._inventory_url(self.warehouse))
        item = response.data["inventory"][0]
        self.assertEqual(item["donation"], donation.donation_id)

    # 29. Inventory arbitrates multiple warehouses separately
    def test_inventory_isolation_between_warehouses(self):
        second_warehouse = Warehouse.objects.create(
            warehouse_id="WAHSECOND",
            address="Warehouse Two",
            capacity=600,
            stored_date=timezone.now().date(),
            exp_date=timezone.now().date() + timedelta(days=5),
        )
        donation = self._create_donation("DONISOLATE")
        self._create_delivery(donation, second_warehouse, delivery_id="DLV018")
        self._create_food_item(donation, name="Other")
        response_first = self.client.get(self._inventory_url(self.warehouse))
        response_second = self.client.get(self._inventory_url(second_warehouse))
        self.assertEqual(response_first.data["total_items"], 0)
        self.assertEqual(response_second.data["total_items"], 1)

    # 30. Inventory still operates when warehouse has no food items but other warehouses do.
    def test_inventory_independent_of_other_warehouses(self):
        other_warehouse = Warehouse.objects.create(
            warehouse_id="WAHOTHER",
            address="Warehouse Other",
            capacity=300,
            stored_date=timezone.now().date(),
            exp_date=timezone.now().date() + timedelta(days=30),
        )
        donation = self._create_donation("DONOTHERWARE")
        self._create_delivery(donation, other_warehouse, delivery_id="DLV019")
        self._create_food_item(donation, name="OtherWare")
        response = self.client.get(self._inventory_url(self.warehouse))
        self.assertEqual(response.data["total_items"], 0)

    # 31. Inventory exposes expectation-expiry metadata for WC items.
    def test_inventory_returns_expire_date_flag(self):
        donation = self._create_donation("DONEXP")
        self._create_delivery(donation, self.warehouse, delivery_id="DLV020")
        item = self._create_food_item(donation, name="ExpireMeta", expire_offset_days=2)
        response = self.client.get(self._inventory_url(self.warehouse))
        returned = next(i for i in response.data["inventory"] if i["name"] == "ExpireMeta")
        self.assertEqual(returned["expire_date"], item.expire_date.isoformat())
        self.assertFalse(returned["is_expired"])

    # 32. Inventory still lists distributed flag in serialized results.
    def test_inventory_serializes_distributed_flag(self):
        donation = self._create_donation("DONDISTFLAG")
        self._create_delivery(donation, self.warehouse, delivery_id="DLV021")
        item = self._create_food_item(donation, name="DistFlag", is_distributed=True)
        response = self.client.get(self._inventory_url(self.warehouse))
        returned = next(i for i in response.data["inventory"] if i["name"] == "DistFlag")
        self.assertTrue(returned["is_distributed"])

    # 33. POST can create a warehouse record through the API.
    def test_create_warehouse_via_api(self):
        payload = {
            "warehouse_id": "WAHNEW0001",
            "address": "New API Warehouse",
            "capacity": 1200.0,
            "stored_date": timezone.now().date().isoformat(),
            "exp_date": (timezone.now().date() + timedelta(days=20)).isoformat(),
        }
        response = self.client.post(
            "/api/warehouse/warehouses/", data=payload, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Warehouse.objects.filter(address="New API Warehouse").exists())

    # 34. PATCH can update an existing warehouse capacity via API.
    def test_patch_updates_capacity(self):
        url = f"/api/warehouse/warehouses/{self.warehouse.warehouse_id}/"
        response = self.client.patch(url, data={"capacity": 750.0}, format="json")
        self.assertEqual(response.status_code, 200)
        self.warehouse.refresh_from_db()
        self.assertEqual(self.warehouse.capacity, 750.0)
