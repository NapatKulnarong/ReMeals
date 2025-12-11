from django.test import TestCase

# Create your tests here.
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from fooditem.models import FoodItem
from donation.models import Donation
from restaurants.models import Restaurant
from impactrecord.models import ImpactRecord


class ImpactRecordTests(APITestCase):

    def setUp(self):
        self.client = APIClient()

        # 1.Create restaurant
        self.restaurant = Restaurant.objects.create(
            restaurant_id="RES001",
            address="Bangkok",
            name="KFC",
            branch_name="Central Plaza",
            is_chain=False
        )

        # 2.Create donation
        self.donation = Donation.objects.create(
            donation_id="DON001",
            restaurant=self.restaurant
        )

        # Create food item (not distributed yet)
        self.food = FoodItem.objects.create(
            food_id="FOO001",
            name="Apple",
            quantity=10,
            unit="pcs",
            expire_date="2025-12-31",
            is_expired=False,
            is_claimed=False,
            is_distributed=False,
            donation=self.donation
        )

    # 1.Test creating ImpactRecord manually (should not be allowed)
    def test_manual_create_impactrecord_fails(self):
        """
        Ensure ImpactRecord cannot be created manually via API 
        (only auto-created when is_distributed changes).
        """
        data = {
            "impact_id": "IMP001",
            "meals_saved": 5,
            "weight_saved_kg": 1.2,
            "co2_reduced_kg": 3.5,
            "food": "FOO001"
        }
        res = self.client.post("/api/impact/", data, format="json")
        self.assertEqual(res.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    # 2.Test auto-create ImpactRecord when food distributed
    def test_auto_create_impactrecord(self):
        """
        When food.is_distributed changes from False → True,
        system should automatically create ImpactRecord.
        """
        res = self.client.patch(f"/api/fooditems/{self.food.food_id}/", {"is_distributed": True}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(ImpactRecord.objects.filter(food=self.food).exists())

    # 3.Test ImpactRecord created only once (True→True should NOT create again)
    def test_impactrecord_created_once(self):
        """
        Ensure ImpactRecord is NOT recreated when food remains distributed (True→True).
        """
        self.food.is_distributed = True
        self.food.save()

        # First impact created
        ImpactRecord.objects.create(
            impact_id="IMP001",
            meals_saved=5,
            weight_saved_kg=1.2,
            co2_reduced_kg=3.5,
            food=self.food
        )

        # Try update again
        res = self.client.patch(f"/api/fooditems/{self.food.food_id}/", {"is_distributed": True}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Still only 1 record
        self.assertEqual(ImpactRecord.objects.filter(food=self.food).count(), 1)

    # 4.Test that impact_date is today's date on creation
    def test_impactrecord_has_correct_date(self):
        """
        Ensure impact_date is automatically set to today's date on creation.
        """
        self.client.patch(f"/api/fooditems/{self.food.food_id}/", {"is_distributed": True}, format="json")
        record = ImpactRecord.objects.get(food=self.food)
        import datetime
        self.assertEqual(record.impact_date, datetime.date.today())

    # 5.Test meals_saved calculation correctness
    def test_meals_saved_calculation(self):
        """
        Ensure meals_saved = quantity * 0.5 (or configured rule).
        """
        self.client.patch(f"/api/fooditems/{self.food.food_id}/", {"is_distributed": True}, format="json")
        record = ImpactRecord.objects.get(food=self.food)
        self.assertEqual(record.meals_saved, 10 * 0.5)

    # 6.Test weight_saved_kg calculation correctness
    def test_weight_saved_calculation(self):
        """
        Ensure weight_saved_kg = quantity * 0.2 (example coefficient).
        """
        self.client.patch(f"/api/fooditems/{self.food.food_id}/", {"is_distributed": True}, format="json")
        record = ImpactRecord.objects.get(food=self.food)
        self.assertEqual(record.weight_saved_kg, 10 * 0.2)

    # 7.Test CO2 reduction calculation correctness
    def test_co2_saved_calculation(self):
        """
        Ensure CO2 reduction = weight_saved_kg * 2.5 (example rule).
        """
        self.client.patch(f"/api/fooditems/{self.food.food_id}/", {"is_distributed": True}, format="json")
        record = ImpactRecord.objects.get(food=self.food)
        expected = (10 * 0.2) * 2.5
        self.assertEqual(record.co2_reduced_kg, expected)

    # 8.Test impactrecord accessible via /impact/<id>
    def test_get_impactrecord_detail(self):
        """
        Ensure ImpactRecord can be retrieved normally via detail endpoint.
        """
        self.client.patch(f"/api/fooditems/{self.food.food_id}/", {"is_distributed": True}, format="json")
        record = ImpactRecord.objects.get(food=self.food)
        res = self.client.get(f"/api/impact/{record.impact_id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    # 9.Test impactrecord list returns correct count
    def test_list_impactrecords(self):
        """
        Ensure listing endpoint returns correct number of impact records.
        """
        self.client.patch(f"/api/fooditems/{self.food.food_id}/", {"is_distributed": True}, format="json")
        res = self.client.get("/api/impact/")
        self.assertEqual(len(res.data), 1)

    # 10.Test deleting food should delete ImpactRecord (CASCADE)
    def test_delete_food_deletes_impact_record(self):
        """
        Ensure ImpactRecord is deleted automatically when associated FoodItem is deleted.
        """
        self.client.patch(f"/api/fooditems/{self.food.food_id}/", {"is_distributed": True}, format="json")
        self.food.delete()
        self.assertFalse(ImpactRecord.objects.exists())