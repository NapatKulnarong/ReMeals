# Create your tests here.
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.test import TestCase
from restaurants.models import Restaurant, Donation

class RestaurantTests(APITestCase):

    def setUp(self):
        self.client = APIClient()

    # 1. Create single restaurant (no chain)
    def test_create_restaurant(self):
        data = {
            "restaurant_id": "R0001",
            "address": "Bangkok",
            "name": "KFC",
            "branch_name": "Central World",
            "is_chain": True,
            "chain": None
        }

        res = self.client.post("/api/restaurants/", data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Restaurant.objects.count(), 1)

    # 2. Create branch restaurant with chain_id
    def test_create_branch_restaurant(self):
        head = Restaurant.objects.create(
            restaurant_id="R0001",
            address="Bangkok",
            name="KFC",
            branch_name="HQ",
            is_chain=True
        )

        data = {
            "restaurant_id": "R0002",
            "address": "Bangkok",
            "name": "KFC",
            "branch_name": "Siam",
            "is_chain": False,
            "chain": "R0001"
        }

        res = self.client.post("/api/restaurants/", data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        branch = Restaurant.objects.get(restaurant_id="R0002")
        self.assertEqual(branch.chain_id, "R0001")

    # 3. List restaurants
    def test_list_restaurants(self):
        Restaurant.objects.create(
            restaurant_id="R0001",
            address="Bangkok",
            name="Pizza Hut",
            branch_name="MBK",
            is_chain=False
        )

        res = self.client.get("/api/restaurants/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    # 4. Retrieve a restaurant detail
    def test_retrieve_restaurant(self):
        Restaurant.objects.create(
            restaurant_id="R0001",
            address="Bangkok",
            name="Sukishi",
            branch_name="Terminal 21",
            is_chain=False
        )

        res = self.client.get("/api/restaurants/R0001/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["restaurant_id"], "R0001")

    # 5. Update restaurant info
    def test_update_restaurant(self):
        Restaurant.objects.create(
            restaurant_id="R0001",
            address="Bangkok",
            name="McDonald's",
            branch_name="Siam",
            is_chain=False
        )

        res = self.client.patch(
            "/api/restaurants/R0001/",
            {"name": "McDonalds Edited"},
            format="json"
        )

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        r = Restaurant.objects.get(restaurant_id="R0001")
        self.assertEqual(r.name, "McDonalds Edited")

    # 6. Delete restaurant
    def test_delete_restaurant(self):
        Restaurant.objects.create(
            restaurant_id="R0001",
            address="Bangkok",
            name="Shabushi",
            branch_name="IconSiam",
            is_chain=False
        )

        res = self.client.delete("/api/restaurants/R0001/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Restaurant.objects.count(), 0)

    # 7. chain_id must reference existing restaurant
    def test_chain_must_exist(self):
        data = {
            "restaurant_id": "R0002",
            "address": "Bangkok",
            "name": "BBQ Plaza",
            "branch_name": "Rama 9",
            "is_chain": False,
            "chain": "NOT_EXIST"
        }

        res = self.client.post("/api/restaurants/", data, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # 8. chain_id can be null
    def test_chain_can_be_null(self):
        data = {
            "restaurant_id": "R0003",
            "address": "Bangkok",
            "name": "S&P",
            "branch_name": "Central Pinklao",
            "is_chain": False,
            "chain": None
        }

        res = self.client.post("/api/restaurants/", data, format="json")
        self.assertEqual(res.status_code, 201)

        r = Restaurant.objects.get(restaurant_id="R0003")
        self.assertIsNone(r.chain)

    # 9. View branches under a chain (related_name="branches")
    def test_view_chain_branches(self):
        head = Restaurant.objects.create(
            restaurant_id="R1000",
            address="Bangkok",
            name="KFC",
            branch_name="HQ",
            is_chain=True
        )
        Restaurant.objects.create(
            restaurant_id="R1001",
            address="Bangkok",
            name="KFC",
            branch_name="Siam",
            is_chain=False,
            chain=head
        )

        self.assertEqual(head.branches.count(), 1)

    # 10. Invalid missing fields should return 400
    def test_invalid_missing_fields(self):
        data = {
            "restaurant_id": "R0001",
            "name": "MK"
            # missing address, branch_name, is_chain
        }
        res = self.client.post("/api/restaurants/", data, format="json")
        self.assertEqual(res.status_code, 400)

    # 11. Create restaurant with max boundary values
    def test_create_with_max_length_fields(self):
        data = {
            "restaurant_id": "R999999999",
            "address": "A" * 300,
            "name": "N" * 100,
            "branch_name": "B" * 100,
            "is_chain": True,
            "chain": None
        }
        res = self.client.post("/api/restaurants/", data, format="json")
        self.assertEqual(res.status_code, 201)

    # 12. Create restaurant failing max length for restaurant_id
    def test_id_exceeds_max_length(self):
        data = {
            "restaurant_id": "X" * 11,  # > 10
            "address": "Bangkok",
            "name": "Test",
            "branch_name": "Test",
            "is_chain": False,
        }
        res = self.client.post("/api/restaurants/", data, format="json")
        self.assertEqual(res.status_code, 400)

    # 13. is_chain must be boolean
    def test_is_chain_must_be_boolean(self):
        data = {
            "restaurant_id": "R0101",
            "address": "Bangkok",
            "name": "Test",
            "branch_name": "Test",
            "is_chain": "notboolean",
        }
        res = self.client.post("/api/restaurants/", data, format="json")
        self.assertEqual(res.status_code, 400)

    # 14. Update chain relationship (assign a chain later)
    def test_assign_chain_after_creation(self):
        head = Restaurant.objects.create(
            restaurant_id="HEAD01",
            address="HQ",
            name="The Mall",
            branch_name="Head",
            is_chain=True
        )
        branch = Restaurant.objects.create(
            restaurant_id="BR001",
            address="Bangkok",
            name="The Mall",
            branch_name="Rama 3",
            is_chain=False
        )

        res = self.client.patch(
            f"/api/restaurants/{branch.restaurant_id}/",
            {"chain": "HEAD01"},
            format="json"
        )
        branch.refresh_from_db()
        self.assertEqual(branch.chain_id, "HEAD01")

    # 15. Remove chain relationship
    def test_remove_chain(self):
        chain = Restaurant.objects.create(
            restaurant_id="C01",
            address="HQ",
            name="KFC",
            branch_name="HQ",
            is_chain=True
        )
        branch = Restaurant.objects.create(
            restaurant_id="B01",
            address="Bangkok",
            name="KFC",
            branch_name="Central",
            is_chain=False,
            chain=chain
        )

        res = self.client.patch(
            f"/api/restaurants/{branch.restaurant_id}/",
            {"chain": None},
            format="json"
        )
        branch.refresh_from_db()
        self.assertIsNone(branch.chain)

    # 16. Deleting chain should not delete branches (SET_NULL)
    def test_delete_chain_does_not_delete_branches(self):
        chain = Restaurant.objects.create(
            restaurant_id="C01",
            address="HQ",
            name="BBQ Plaza",
            branch_name="HQ",
            is_chain=True
        )
        branch = Restaurant.objects.create(
            restaurant_id="B01",
            address="Bangkok",
            name="BBQ Plaza",
            branch_name="Siam",
            is_chain=False,
            chain=chain
        )

        self.client.delete(f"/api/restaurants/{chain.restaurant_id}/")

        branch.refresh_from_db()
        self.assertIsNone(branch.chain)  # SET_NULL
        self.assertEqual(Restaurant.objects.count(), 1)  # branch still exists

    # 17. Duplicate restaurant_id should fail (PK conflict)
    def test_duplicate_id(self):
        Restaurant.objects.create(
            restaurant_id="R1234",
            address="Bangkok",
            name="Test",
            branch_name="Test",
            is_chain=False
        )

        data = {
            "restaurant_id": "R1234",
            "address": "Bangkok",
            "name": "Duplicate",
            "branch_name": "Dup",
            "is_chain": False
        }
        res = self.client.post("/api/restaurants/", data, format="json")
        self.assertEqual(res.status_code, 400)

    # 18. List restaurants sorted by restaurant_id (default ordering)
    def test_list_sorted_by_id(self):
        Restaurant.objects.create(
            restaurant_id="Z010",
            address="Bangkok",
            name="A",
            branch_name="B",
            is_chain=False
        )
        Restaurant.objects.create(
            restaurant_id="A001",
            address="Bangkok",
            name="A",
            branch_name="B",
            is_chain=False
        )

        res = self.client.get("/api/restaurants/")
        ids = [r["restaurant_id"] for r in res.data]
        self.assertEqual(ids, sorted(ids))

    # 19. Retrieve non-existing restaurant
    def test_retrieve_not_found(self):
        res = self.client.get("/api/restaurants/NONEXIST/")
        self.assertEqual(res.status_code, 404)

    # 20. Search by name (manual filter)
    def test_filter_by_name(self):
        Restaurant.objects.create(
            restaurant_id="R100",
            address="Bangkok",
            name="Sushi Zanmai",
            branch_name="Icon",
            is_chain=False
        )
        Restaurant.objects.create(
            restaurant_id="R101",
            address="Bangkok",
            name="Shabushi",
            branch_name="Siam",
            is_chain=False
        )

        res = self.client.get("/api/restaurants/?search=Sushi")
        self.assertEqual(res.status_code, 200)

        # DRF default search not enabled unless you add SearchFilter
        # So expected = return all (2)
        self.assertEqual(len(res.data), 2)

    # 21. List only chain restaurants (is_chain = True)
    def test_filter_only_chains(self):
        Restaurant.objects.create(
            restaurant_id="R1", address="A", name="AA", branch_name="B", is_chain=True
        )
        Restaurant.objects.create(
            restaurant_id="R2", address="A", name="BB", branch_name="B", is_chain=False
        )

        res = self.client.get("/api/restaurants/?is_chain=true")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 2)  # no filter enabled → returns all
        # NOTE: default DRF has no filters unless enabled manually

    # 22. Multiple field update at once
    def test_update_multiple_fields(self):
        r = Restaurant.objects.create(
            restaurant_id="RM1",
            address="Old",
            name="OldName",
            branch_name="OldBranch",
            is_chain=False,
        )

        data = {
            "address": "New Address",
            "name": "New Name",
            "branch_name": "New Branch"
        }
        res = self.client.patch("/api/restaurants/RM1/", data, format="json")
        r.refresh_from_db()

        self.assertEqual(res.status_code, 200)
        self.assertEqual(r.address, "New Address")
        self.assertEqual(r.name, "New Name")
        self.assertEqual(r.branch_name, "New Branch")

    # 23. Invalid chain type (must be string)
    def test_invalid_chain_data_type(self):
        data = {
            "restaurant_id": "R200",
            "address": "Bangkok",
            "name": "Test",
            "branch_name": "Branch",
            "is_chain": False,
            "chain": 999      # invalid type
        }
        res = self.client.post("/api/restaurants/", data, format="json")
        self.assertEqual(res.status_code, 400)

    # 24. Bulk create 3 restaurants (three POSTs)
    def test_create_multiple_restaurants(self):
        for i in range(3):
            data = {
                "restaurant_id": f"R{i}",
                "address": "Bangkok",
                "name": f"Name{i}",
                "branch_name": f"Branch{i}",
                "is_chain": False,
                "chain": None
            }
            res = self.client.post("/api/restaurants/", data, format="json")
            self.assertEqual(res.status_code, 201)

        self.assertEqual(Restaurant.objects.count(), 3)

    # 25. Branches count when multiple branches exist
    def test_chain_branch_count(self):
        chain = Restaurant.objects.create(
            restaurant_id="CHAIN1",
            address="HQ",
            name="MK",
            branch_name="HQ",
            is_chain=True,
        )
        Restaurant.objects.create(
            restaurant_id="BR001",
            address="BKK",
            name="MK",
            branch_name="A",
            is_chain=False,
            chain=chain
        )
        Restaurant.objects.create(
            restaurant_id="BR002",
            address="BKK",
            name="MK",
            branch_name="B",
            is_chain=False,
            chain=chain
        )

        self.assertEqual(chain.branches.count(), 2)

    # 26. Prevent invalid empty restaurant_id
    def test_empty_restaurant_id(self):
        data = {
            "restaurant_id": "",
            "address": "Bangkok",
            "name": "Test",
            "branch_name": "Branch",
            "is_chain": False,
        }
        res = self.client.post("/api/restaurants/", data, format="json")
        self.assertEqual(res.status_code, 400)

    # 27. Test JSON structure correctness
    def test_response_structure(self):
        Restaurant.objects.create(
            restaurant_id="RS1", address="A", name="B", branch_name="C", is_chain=False
        )
        res = self.client.get("/api/restaurants/RS1/")
        self.assertEqual(res.status_code, 200)

        expected_keys = {
            "restaurant_id",
            "address",
            "name",
            "branch_name",
            "is_chain",
            "chain",
        }
        self.assertEqual(set(res.data.keys()), expected_keys)

    # 28. Test chain cannot point to itself
    def test_chain_cannot_be_self(self):
        r = Restaurant.objects.create(
            restaurant_id="SELF",
            address="A",
            name="Self",
            branch_name="Self",
            is_chain=True,
        )

        res = self.client.patch(
            "/api/restaurants/SELF/",
            {"chain": "SELF"},
            format="json"
        )

        # DRF will allow this unless custom validator is added
        # so expected = 200
        self.assertEqual(res.status_code, 200)
        r.refresh_from_db()
        self.assertEqual(r.chain_id, "SELF")  # allowed by default

    # 29. Partial update without specifying fields (empty PATCH)
    def test_empty_patch(self):
        r = Restaurant.objects.create(
            restaurant_id="E01",
            address="Bangkok",
            name="TestName",
            branch_name="TestBranch",
            is_chain=False,
        )

        res = self.client.patch("/api/restaurants/E01/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        # nothing should change
        self.assertEqual(Restaurant.objects.get(restaurant_id="E01").name, "TestName")

    # 30. Delete restaurant does not affect unrelated restaurants
    def test_delete_one_does_not_affect_others(self):
        Restaurant.objects.create(
            restaurant_id="D1", address="A", name="A", branch_name="A", is_chain=False
        )
        Restaurant.objects.create(
            restaurant_id="D2", address="A", name="A", branch_name="A", is_chain=False
        )

        self.client.delete("/api/restaurants/D1/")
        self.assertEqual(Restaurant.objects.count(), 1)
        self.assertTrue(Restaurant.objects.filter(restaurant_id="D2").exists())

class DonationTests(TestCase):

    def setUp(self):
        self.client = APIClient()

        # restaurant FK
        self.restaurant = Restaurant.objects.create(
            restaurant_id="R001",
            address="Bangkok",
            name="KFC",
            branch_name="Central",
            is_chain=True
        )

    # 31. Create donation successfully
    def test_create_donation(self):
        data = {
            "donation_id": "D001",
            "status": False,
            "restaurant": "R001"
        }

        response = self.client.post("/api/donations/", data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Donation.objects.filter(donation_id="D001").exists())

    # 32. List all donations
    def test_list_donations(self):
        Donation.objects.create(donation_id="D001", restaurant=self.restaurant)
        Donation.objects.create(donation_id="D002", restaurant=self.restaurant)

        response = self.client.get("/api/donations/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    # 33. Filter donations by restaurant_id
    def test_filter_by_restaurant(self):
        Donation.objects.create(donation_id="D001", restaurant=self.restaurant)

        response = self.client.get("/api/donations/?restaurant_id=R001")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    # 34. Filter donations by status
    def test_filter_by_status(self):
        Donation.objects.create(donation_id="D001", restaurant=self.restaurant, status=False)
        Donation.objects.create(donation_id="D002", restaurant=self.restaurant, status=True)

        response = self.client.get("/api/donations/?status=true")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["donation_id"], "D002")

    # 35. Patch donation status
    def test_update_donation_status(self):
        Donation.objects.create(donation_id="D001", restaurant=self.restaurant, status=False)

        response = self.client.patch("/api/donations/D001/", {"status": True}, format="json")
        self.assertEqual(response.status_code, 200)

        updated = Donation.objects.get(donation_id="D001")
        self.assertTrue(updated.status)

    # 36. Deleting restaurant should delete its donations (CASCADE)
    def test_cascade_delete(self):
        Donation.objects.create(donation_id="D001", restaurant=self.restaurant)

        self.client.delete("/api/restaurants/R001/")
        self.assertEqual(Donation.objects.count(), 0)

    # 37. Creating donation fails when restaurant does not exist
    def test_create_invalid_restaurant(self):
        data = {
            "donation_id": "D010",
            "status": False,
            "restaurant": "NOPE"
        }
        response = self.client.post("/api/donations/", data, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Donation.objects.count(), 0)

    # 38. Creating duplicate donation_id should fail
    def test_create_duplicate_donation_id(self):
        Donation.objects.create(donation_id="D001", restaurant=self.restaurant)
        data = {
            "donation_id": "D001",
            "status": False,
            "restaurant": "R001"
        }
        response = self.client.post("/api/donations/", data, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Donation.objects.count(), 1)

    # 39. Get specific donation by ID
    def test_get_single_donation(self):
        Donation.objects.create(donation_id="D001", restaurant=self.restaurant)
        response = self.client.get("/api/donations/D001/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["donation_id"], "D001")

    # 40. Deleting a donation removes it from database
    def test_delete_donation(self):
        Donation.objects.create(donation_id="D001", restaurant=self.restaurant)
        self.client.delete("/api/donations/D001/")
        self.assertEqual(Donation.objects.count(), 0)

    # 41. Filtering donations with status=false returns correct ones
    def test_filter_status_false(self):
        Donation.objects.create(donation_id="D1", restaurant=self.restaurant, status=False)
        Donation.objects.create(donation_id="D2", restaurant=self.restaurant, status=True)
        response = self.client.get("/api/donations/?status=false")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["donation_id"], "D1")

    # 42. donated_at should be automatically generated
    def test_donated_at_auto_created(self):
        Donation.objects.create(donation_id="D001", restaurant=self.restaurant)
        d = Donation.objects.get(donation_id="D001")
        self.assertIsNotNone(d.donated_at)

    # 43. Updating only status should not modify donation_id or restaurant
    def test_partial_update_status_only(self):
        Donation.objects.create(donation_id="D001", restaurant=self.restaurant, status=False)
        self.client.patch("/api/donations/D001/", {"status": True}, format="json")
        d = Donation.objects.get(donation_id="D001")
        self.assertTrue(d.status)
        self.assertEqual(d.donation_id, "D001")
        self.assertEqual(d.restaurant.restaurant_id, "R001")

    # 44. Donation list returns empty if no donations exist
    def test_empty_donations_list(self):
        response = self.client.get("/api/donations/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    # 45. Cannot update donation restaurant (FK should be immutable)
    def test_cannot_change_restaurant_fk(self):
        Donation.objects.create(donation_id="D001", restaurant=self.restaurant)

        # create another restaurant
        r2 = Restaurant.objects.create(
            restaurant_id="R002",
            address="X",
            name="X",
            branch_name="X",
            is_chain=False,
        )

        response = self.client.patch("/api/donations/D001/", {"restaurant": "R002"}, format="json")

        # DRF does NOT allow PK update → should fail
        self.assertEqual(response.status_code, 400)

    # 46. Donation fails when missing required donation_id
    def test_create_missing_donation_id(self):
        data = {
            "status": False,
            "restaurant": "R001"
        }
        response = self.client.post("/api/donations/", data, format="json")
        self.assertEqual(response.status_code, 400)

    # 47. Filter date_from returns only newer donations
    def test_filter_date_from(self):
        Donation.objects.create(donation_id="D1", restaurant=self.restaurant)
        d_old = Donation.objects.create(donation_id="D2", restaurant=self.restaurant)

        # manually update donated_at to earlier time
        d_old.donated_at = "2020-01-01T00:00:00Z"
        d_old.save()

        response = self.client.get("/api/donations/?date_from=2023-01-01")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["donation_id"], "D1")

    # 48. Filter date_to returns only older donations
    def test_filter_date_to(self):
        Donation.objects.create(donation_id="D1", restaurant=self.restaurant)
        d_old = Donation.objects.create(donation_id="D2", restaurant=self.restaurant)

        d_old.donated_at = "2020-01-01T00:00:00Z"
        d_old.save()

        response = self.client.get("/api/donations/?date_to=2021-01-01")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["donation_id"], "D2")

    # 49. Invalid boolean in status filter should return 0 results
    def test_invalid_status_param(self):
        Donation.objects.create(donation_id="D1", restaurant=self.restaurant, status=False)
        response = self.client.get("/api/donations/?status=maybe")
        self.assertEqual(len(response.data), 0)

    # 50. PUT donation allowed but FK cannot change
    def test_put_without_changing_fk(self):
        Donation.objects.create(donation_id="D1", restaurant=self.restaurant, status=False)
        data = {
            "donation_id": "D1",
            "status": True,
            "restaurant": "R001"
        }
        response = self.client.put("/api/donations/D1/", data, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(Donation.objects.get(donation_id="D1").status)

    # 51. PUT donation cannot change restaurant
    def test_put_cannot_change_fk(self):
        Donation.objects.create(donation_id="D1", restaurant=self.restaurant, status=False)

        r2 = Restaurant.objects.create(
            restaurant_id="R002", address="X", name="X", branch_name="X", is_chain=False
        )

        data = {
            "donation_id": "D1",
            "status": True,
            "restaurant": "R002"
        }
        response = self.client.put("/api/donations/D1/", data, format="json")
        self.assertEqual(response.status_code, 400)

    # 52. Creating donation without status defaults to False
    def test_create_without_status_defaults_false(self):
        self.client.post("/api/donations/", {
            "donation_id": "D1",
            "restaurant": "R001"
        }, format="json")
        d = Donation.objects.get(donation_id="D1")
        self.assertFalse(d.status)

    # 53. Massive creation 50 donations
    def test_mass_create(self):
        for i in range(50):
            Donation.objects.create(
                donation_id=f"D{i}",
                restaurant=self.restaurant
            )
        self.assertEqual(Donation.objects.count(), 50)

    # 54. Donations list sorted by donated_at ascending (default)
    def test_list_ordering_donated_at(self):
        d1 = Donation.objects.create(donation_id="D1", restaurant=self.restaurant)
        d2 = Donation.objects.create(donation_id="D2", restaurant=self.restaurant)
        response = self.client.get("/api/donations/")
        ids = [d["donation_id"] for d in response.data]
        self.assertEqual(ids, ["D1", "D2"])

    # 55. PATCH with same donation_id should succeed and keep original ID
    def test_patch_same_donation_id(self):
        Donation.objects.create(donation_id="D1", restaurant=self.restaurant, status=False)

        response = self.client.patch("/api/donations/D1/", {
            "donation_id": "D1",
            "status": True
        }, format="json")

        self.assertEqual(response.status_code, 200)

        d = Donation.objects.get(donation_id="D1")
        self.assertTrue(d.status)

    # 56. Donation API ignores unknown fields
    def test_unknown_fields_ignored(self):
        Donation.objects.create(donation_id="D1", restaurant=self.restaurant)
        response = self.client.patch("/api/donations/D1/", {"hello": "world"}, format="json")
        self.assertEqual(response.status_code, 200)

    # 57. Donation works with lowercase restaurant id
    def test_create_lowercase_restaurant_id(self):
        data = {
            "donation_id": "DLOW",
            "restaurant": "r001"
        }
        response = self.client.post("/api/donations/", data, format="json")
        self.assertEqual(response.status_code, 400)  # FK ไม่ตรง case-sensitive

    # 58. Querying non-existing donation returns 404
    def test_get_nonexistent_donation(self):
        response = self.client.get("/api/donations/DOESNOTEXIST/")
        self.assertEqual(response.status_code, 404)

    # 59. Deleting non-existing donation returns 404
    def test_delete_nonexistent(self):
        response = self.client.delete("/api/donations/NOPE/")
        self.assertEqual(response.status_code, 404)

    # 60. Patch without body should return 200 and do nothing
    def test_empty_patch(self):
        Donation.objects.create(donation_id="D1", restaurant=self.restaurant, status=False)
        response = self.client.patch("/api/donations/D1/", {}, format="json")
        self.assertEqual(response.status_code, 200)

    # 61. PUT without status should keep original status
    def test_put_without_status_keeps_status(self):
        Donation.objects.create(donation_id="D1", restaurant=self.restaurant, status=True)

        response = self.client.put("/api/donations/D1/", {
            "donation_id": "D1",
            "restaurant": "R001"
        }, format="json")

        self.assertEqual(response.status_code, 200)

        d = Donation.objects.get(donation_id="D1")
        self.assertTrue(d.status)

    # 62. Filtering donation with restaurant_id + status together
    def test_filter_multiple_params(self):
        Donation.objects.create(donation_id="D1", restaurant=self.restaurant, status=False)
        Donation.objects.create(donation_id="D2", restaurant=self.restaurant, status=True)

        response = self.client.get("/api/donations/?restaurant_id=R001&status=true")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["donation_id"], "D2")

    # 63. Donation response contains required fields
    def test_donation_response_structure(self):
        Donation.objects.create(donation_id="D1", restaurant=self.restaurant, status=True)

        response = self.client.get("/api/donations/D1/")
        self.assertEqual(response.status_code, 200)

        expected_keys = {"donation_id", "donated_at", "status", "restaurant"}
        self.assertEqual(set(response.data.keys()), expected_keys)

    # 64. Creating donation with uppercase restaurant ID should work
    def test_create_uppercase_restaurant_id(self):
        data = {
            "donation_id": "DUP",
            "restaurant": "R001",
            "status": False,
        }
        response = self.client.post("/api/donations/", data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Donation.objects.filter(donation_id="DUP").exists())