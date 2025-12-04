from datetime import date, timedelta

from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from restaurants.models import Restaurant
from donation.models import Donation
from .models import FoodItem


class FoodItemTests(APITestCase):

    def setUp(self):
        self.client = APIClient()

        # Create base restaurant
        self.restaurant = Restaurant.objects.create(
            restaurant_id="R0001",
            address="Bangkok",
            name="KFC",
            branch_name="Central World",
            is_chain=False
        )

        # reusable expiration helpers
        self.future_expire = (date.today() + timedelta(days=365)).isoformat()
        self.past_expire = (date.today() - timedelta(days=365)).isoformat()

        # Create base donation
        self.donation = Donation.objects.create(
            donation_id="D0001",
            restaurant=self.restaurant
        )


    # 1. Create a food item successfully
    def test_create_fooditem_success(self):
        data = {
            "food_id": "F0001",
            "name": "Rice Box",
            "quantity": 10,
            "unit": "box",
            "expire_date": self.future_expire,
            "is_expired": False,
            "is_claimed": False,
            "is_distributed": False,
            "donation": "D0001"
        }
        res = self.client.post("/api/fooditems/", data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FoodItem.objects.count(), 1)


    # 2. List food items
    def test_list_fooditems(self):
        FoodItem.objects.create(
            food_id="F0001",
            name="Rice Box",
            quantity=5,
            unit="box",
            expire_date=self.future_expire,
            donation=self.donation
        )
        res = self.client.get("/api/fooditems/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)


    # 3. Retrieve a single food item
    def test_retrieve_fooditem(self):
        FoodItem.objects.create(
            food_id="F0001",
            name="Rice Box",
            quantity=5,
            unit="box",
            expire_date=self.future_expire,
            donation=self.donation
        )
        res = self.client.get("/api/fooditems/F0001/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["food_id"], "F0001")


    # 4. Update food item quantity
    def test_update_fooditem_quantity(self):
        FoodItem.objects.create(
            food_id="F0001",
            name="Rice Box",
            quantity=5,
            unit="box",
            expire_date=self.future_expire,
            donation=self.donation
        )
        updated = {
            "food_id": "F0001",
            "name": "Rice Box",
            "quantity": 20,
            "unit": "box",
            "expire_date": self.future_expire,
            "is_expired": False,
            "is_claimed": False,
            "is_distributed": False,
            "donation": "D0001"
        }
        res = self.client.put("/api/fooditems/F0001/", updated, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["quantity"], 20)


    # 5. Delete food item
    def test_delete_fooditem(self):
        FoodItem.objects.create(
            food_id="F0001",
            name="Rice Box",
            quantity=5,
            unit="box",
            expire_date=self.future_expire,
            donation=self.donation
        )
        res = self.client.delete("/api/fooditems/F0001/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(FoodItem.objects.count(), 0)


    # 6. Creating food item without donation should fail
    def test_create_fooditem_invalid_no_donation(self):
        data = {
            "food_id": "F0001",
            "name": "Rice Box",
            "quantity": 10,
            "unit": "box",
            "expire_date": self.future_expire,
            "donation": None
        }
        res = self.client.post("/api/fooditems/", data, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


    # 7. Creating food item with invalid quantity
    def test_create_fooditem_invalid_quantity(self):
        data = {
            "food_id": "F0001",
            "name": "Rice Box",
            "quantity": -5,  # invalid
            "unit": "box",
            "expire_date": self.future_expire,
            "donation": "D0001"
        }
        res = self.client.post("/api/fooditems/", data, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


    # 8. Mark food item as claimed
    def test_mark_fooditem_claimed(self):
        item = FoodItem.objects.create(
            food_id="F0001",
            name="Rice Box",
            quantity=5,
            unit="box",
            expire_date=self.future_expire,
            donation=self.donation,
            is_claimed=False
        )

        updated = {
            "name": "Rice Box",
            "quantity": 5,
            "unit": "box",
            "expire_date": self.future_expire,
            "is_expired": False,
            "is_claimed": True,   # changed here
            "is_distributed": False,
            "donation": "D0001"
        }

        res = self.client.put("/api/fooditems/F0001/", updated, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["is_claimed"], True)


    # 9. Filter: list only items of a specific donation
    def test_list_fooditems_by_donation(self):
        FoodItem.objects.create(
            food_id="F0001", name="Rice", quantity=1,
            unit="box", expire_date=self.future_expire, donation=self.donation
        )

        # Second donation
        donation2 = Donation.objects.create(
            donation_id="D0002", restaurant=self.restaurant
        )
        FoodItem.objects.create(
            food_id="F0002", name="Soup", quantity=2,
            unit="cup", expire_date=self.future_expire, donation=donation2
        )

        res = self.client.get("/api/fooditems/?donation=D0001")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)  # Only 1 for D0001


    # 10. Expired food item should still be retrievable
    def test_get_expired_fooditem(self):
        FoodItem.objects.create(
            food_id="F0001",
            name="Old Rice",
            quantity=1,
            unit="box",
            expire_date=self.past_expire,
            donation=self.donation,
            is_expired=True
        )
        res = self.client.get("/api/fooditems/F0001/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["is_expired"], True)

    # 11. Creating a food item with duplicate food_id should fail
    def test_create_duplicate_foodid(self):
        FoodItem.objects.create(
            food_id="F0001",
            name="Rice Box",
            quantity=5,
            unit="box",
            expire_date=self.future_expire,
            donation=self.donation
        )

        data = {
            "food_id": "F0001",
            "name": "Duplicate Item",
            "quantity": 2,
            "unit": "bag",
            "expire_date": self.future_expire,
            "donation": "D0001"
        }

        res = self.client.post("/api/fooditems/", data, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


    # 12. List only expired items
    def test_filter_expired_items(self):
        FoodItem.objects.create(
            food_id="F0001", name="Expired1", quantity=1,
            unit="box", expire_date=self.past_expire, is_expired=True,
            donation=self.donation
        )
        FoodItem.objects.create(
            food_id="F0002", name="Fresh", quantity=1,
            unit="box", expire_date=self.future_expire, is_expired=False,
            donation=self.donation
        )

        res = self.client.get("/api/fooditems/?is_expired=true")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["food_id"], "F0001")


    # 13. List only claimed items
    def test_filter_claimed_items(self):
        FoodItem.objects.create(
            food_id="F0001", name="Claimed", quantity=1,
            unit="box", expire_date=self.future_expire, is_claimed=True,
            donation=self.donation
        )
        FoodItem.objects.create(
            food_id="F0002", name="NotClaimed", quantity=1,
            unit="box", expire_date=self.future_expire, is_claimed=False,
            donation=self.donation
        )

        res = self.client.get("/api/fooditems/?is_claimed=true")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["food_id"], "F0001")


    # 14. Partial update (PATCH) should work
    def test_patch_fooditem(self):
        item = FoodItem.objects.create(
            food_id="F0001",
            name="Rice Box",
            quantity=5,
            unit="box",
            expire_date=self.future_expire,
            donation=self.donation
        )

        payload = {"quantity": 99}
        res = self.client.patch("/api/fooditems/F0001/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["quantity"], 99)


    # 15. Setting is_distributed to true
    def test_set_item_distributed(self):
        item = FoodItem.objects.create(
            food_id="F0001",
            name="Food",
            quantity=1,
            unit="box",
            expire_date=self.future_expire,
            donation=self.donation,
            is_claimed=True,
            is_distributed=False
        )

        payload = {"is_distributed": True}
        res = self.client.patch("/api/fooditems/F0001/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["is_distributed"], True)


    # 16. Cannot create item with empty name
    def test_create_invalid_empty_name(self):
        data = {
            "food_id": "F0001",
            "name": "",
            "quantity": 1,
            "unit": "box",
            "expire_date": self.future_expire,
            "donation": "D0001"
        }
        res = self.client.post("/api/fooditems/", data, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


    # 17. Cannot create item with empty unit
    def test_create_invalid_empty_unit(self):
        data = {
            "food_id": "F0001",
            "name": "Rice",
            "quantity": 1,
            "unit": "",
            "expire_date": self.future_expire,
            "donation": "D0001"
        }
        res = self.client.post("/api/fooditems/", data, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


    # 18. Expire_date cannot be null
    def test_create_invalid_null_expire_date(self):
        data = {
            "food_id": "F0001",
            "name": "Rice",
            "quantity": 1,
            "unit": "box",
            "expire_date": None,
            "donation": "D0001"
        }
        res = self.client.post("/api/fooditems/", data, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


    # 19. List returns ordered by food_id
    def test_list_ordered_by_foodid(self):
        FoodItem.objects.create(
            food_id="F0002", name="B", quantity=1,
            unit="box", expire_date=self.future_expire, donation=self.donation
        )
        FoodItem.objects.create(
            food_id="F0001", name="A", quantity=1,
            unit="box", expire_date=self.future_expire, donation=self.donation
        )

        res = self.client.get("/api/fooditems/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data[0]["food_id"], "F0001")  # ordered


    # 20. Delete non-existent item should return 404
    def test_delete_nonexistent_item(self):
        res = self.client.delete("/api/fooditems/XXX/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    # 21. Cannot update quantity to negative value
    def test_update_invalid_negative_quantity(self):
        FoodItem.objects.create(
            food_id="F0001", name="Rice", quantity=5,
            unit="box", expire_date=self.future_expire,
            donation=self.donation
        )

        payload = {"quantity": -10}
        res = self.client.patch("/api/fooditems/F0001/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


    # 22. Cannot distribute item before it is claimed
    def test_cannot_distribute_before_claim(self):
        FoodItem.objects.create(
            food_id="F0001", name="Rice", quantity=5,
            unit="box", expire_date=self.future_expire,
            donation=self.donation,
            is_claimed=False,
            is_distributed=False
        )

        res = self.client.patch("/api/fooditems/F0001/", {"is_distributed": True}, format="json")
        # Expected failure because is_claimed is False
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


    # 23. Distribute item successfully after claiming
    def test_distribute_after_claim(self):
        item = FoodItem.objects.create(
            food_id="F0001", name="Rice", quantity=5,
            unit="box", expire_date=self.future_expire,
            donation=self.donation,
            is_claimed=True
        )

        res = self.client.patch("/api/fooditems/F0001/", {"is_distributed": True}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["is_distributed"], True)


    # 24. Cannot unclaim an already distributed item
    def test_unclaim_distributed_item_fails(self):
        item = FoodItem.objects.create(
            food_id="F0001", name="Rice", quantity=5,
            unit="box", expire_date=self.future_expire,
            donation=self.donation,
            is_claimed=True,
            is_distributed=True
        )

        res = self.client.patch("/api/fooditems/F0001/", {"is_claimed": False}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


    # 25. Filter by multiple conditions (claimed + expired)
    def test_filter_multiple_conditions(self):
        FoodItem.objects.create(
            food_id="F0001", name="Good", quantity=5,
            unit="box", expire_date=self.future_expire,
            donation=self.donation,
            is_claimed=True, is_expired=False
        )
        FoodItem.objects.create(
            food_id="F0002", name="Expired", quantity=2,
            unit="box", expire_date=self.past_expire,
            donation=self.donation,
            is_claimed=True, is_expired=True
        )

        res = self.client.get("/api/fooditems/?is_claimed=true&is_expired=true")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Only 1 item matches both filters
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["food_id"], "F0002")


    # 26. Getting non-existent food item returns 404
    def test_get_nonexistent_fooditem(self):
        res = self.client.get("/api/fooditems/UNKNOWN/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


    # 27. Create many items and check pagination (if enabled)
    def test_pagination(self):
        for i in range(20):
            FoodItem.objects.create(
                food_id=f"F{i:04}",
                name="Rice",
                quantity=1,
                unit="box",
                expire_date=self.future_expire,
                donation=self.donation
            )

        res = self.client.get("/api/fooditems/?page=1")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # At least some items must appear
        self.assertTrue(len(res.data) > 0)


    # 28. Update only name (partial update)
    def test_partial_update_name(self):
        FoodItem.objects.create(
            food_id="F0001", name="Old Name", quantity=5,
            unit="box", expire_date=self.future_expire, donation=self.donation
        )

        res = self.client.patch("/api/fooditems/F0001/", {"name": "New Name"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["name"], "New Name")


    # 29. Ensure boolean values accept both true/false strings
    def test_boolean_string_handling(self):
        FoodItem.objects.create(
            food_id="F0001", name="Test", quantity=5,
            unit="box", expire_date=self.future_expire, donation=self.donation,
            is_expired=False
        )

        res = self.client.get("/api/fooditems/?is_expired=false")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)


    # 30. Cannot create food item with past expiration and is_expired=False
    def test_expire_date_mismatch(self):
        data = {
            "food_id": "F0001",
            "name": "Rice",
            "quantity": 3,
            "unit": "box",
            "expire_date": self.past_expire,
            "is_expired": False,  # invalid logically
            "donation": "D0001"
        }

        res = self.client.post("/api/fooditems/", data, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
