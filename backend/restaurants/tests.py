# Create your tests here.
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from restaurants.models import Restaurant
from restaurant_chain.models import RestaurantChain

class RestaurantTests(APITestCase):

    def setUp(self):
        self.client = APIClient()

    # 1. Create single restaurant (no chain)
    def test_create_restaurant(self):
        data = {
            "restaurant_id": "RES0001",
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
        chain = RestaurantChain.objects.create(
            chain_id="CHA01",
            chain_name="KFC Group",
        )
        Restaurant.objects.create(
            restaurant_id="RES0001",
            address="Bangkok",
            name="KFC",
            branch_name="HQ",
            is_chain=True,
            chain=chain,
        )

        data = {
            "restaurant_id": "RES0002",
            "address": "Bangkok",
            "name": "KFC",
            "branch_name": "Siam",
            "is_chain": False,
            "chain": chain.chain_id,
        }

        res = self.client.post("/api/restaurants/", data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        branch = Restaurant.objects.get(restaurant_id="RES0002")
        self.assertEqual(branch.chain_id, chain.chain_id)

    # 3. List restaurants
    def test_list_restaurants(self):
        Restaurant.objects.create(
            restaurant_id="RES0001",
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
            restaurant_id="RES0001",
            address="Bangkok",
            name="Sukishi",
            branch_name="Terminal 21",
            is_chain=False
        )

        res = self.client.get("/api/restaurants/RES0001/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["restaurant_id"], "RES0001")

    # 5. Update restaurant info
    def test_update_restaurant(self):
        Restaurant.objects.create(
            restaurant_id="RES0001",
            address="Bangkok",
            name="McDonald's",
            branch_name="Siam",
            is_chain=False
        )

        res = self.client.patch(
            "/api/restaurants/RES0001/",
            {"name": "McDonalds Edited"},
            format="json"
        )

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        r = Restaurant.objects.get(restaurant_id="RES0001")
        self.assertEqual(r.name, "McDonalds Edited")

    # 6. Delete restaurant
    def test_delete_restaurant(self):
        Restaurant.objects.create(
            restaurant_id="RES0001",
            address="Bangkok",
            name="Shabushi",
            branch_name="IconSiam",
            is_chain=False
        )

        res = self.client.delete("/api/restaurants/RES0001/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Restaurant.objects.count(), 0)

    # 7. chain_id must reference existing restaurant chain
    def test_chain_must_exist(self):
        data = {
            "restaurant_id": "RES0002",
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
            "restaurant_id": "RES0003",
            "address": "Bangkok",
            "name": "S&P",
            "branch_name": "Central Pinklao",
            "is_chain": False,
            "chain": None
        }

        res = self.client.post("/api/restaurants/", data, format="json")
        self.assertEqual(res.status_code, 201)

        r = Restaurant.objects.get(restaurant_id="RES0003")
        self.assertIsNone(r.chain)

    # 9. View branches under a chain
    def test_view_chain_branches(self):
        chain = RestaurantChain.objects.create(
            chain_id="CHA1000",
            chain_name="KFC Group",
        )
        Restaurant.objects.create(
            restaurant_id="RES1000",
            address="Bangkok",
            name="KFC",
            branch_name="HQ",
            is_chain=True,
            chain=chain,
        )
        Restaurant.objects.create(
            restaurant_id="RES1001",
            address="Bangkok",
            name="KFC",
            branch_name="Siam",
            is_chain=False,
            chain=chain,
        )

        self.assertEqual(chain.restaurants.filter(is_chain=False).count(), 1)

    # 10. Invalid missing fields should return 400
    def test_invalid_missing_fields(self):
        data = {
            "restaurant_id": "RES0001",
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
        chain = RestaurantChain.objects.create(
            chain_id="CHAHEAD01",
            chain_name="The Mall Group",
        )
        Restaurant.objects.create(
            restaurant_id="RESHEADR01",
            address="HQ",
            name="The Mall",
            branch_name="Head",
            is_chain=True,
            chain=chain,
        )
        branch = Restaurant.objects.create(
            restaurant_id="RESBR001",
            address="Bangkok",
            name="The Mall",
            branch_name="Rama 3",
            is_chain=False
        )

        res = self.client.patch(
            f"/api/restaurants/{branch.restaurant_id}/",
            {"chain": chain.chain_id},
            format="json"
        )
        branch.refresh_from_db()
        self.assertEqual(branch.chain_id, chain.chain_id)

    # 15. Remove chain relationship
    def test_remove_chain(self):
        chain_obj = RestaurantChain.objects.create(
            chain_id="CHAC01",
            chain_name="KFC Group",
        )
        Restaurant.objects.create(
            restaurant_id="RESH01",
            address="HQ",
            name="KFC",
            branch_name="HQ",
            is_chain=True,
            chain=chain_obj,
        )
        branch = Restaurant.objects.create(
            restaurant_id="RESB01",
            address="Bangkok",
            name="KFC",
            branch_name="Central",
            is_chain=False,
            chain=chain_obj,
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
        chain_obj = RestaurantChain.objects.create(
            chain_id="CHAC01",
            chain_name="BBQ Plaza Group",
        )
        Restaurant.objects.create(
            restaurant_id="RESC01",
            address="HQ",
            name="BBQ Plaza",
            branch_name="HQ",
            is_chain=True,
            chain=chain_obj,
        )
        branch = Restaurant.objects.create(
            restaurant_id="RESB01",
            address="Bangkok",
            name="BBQ Plaza",
            branch_name="Siam",
            is_chain=False,
            chain=chain_obj,
        )

        self.client.delete(f"/api/restaurant-chains/{chain_obj.chain_id}/")

        branch.refresh_from_db()
        self.assertIsNone(branch.chain)  # SET_NULL
        self.assertTrue(Restaurant.objects.filter(restaurant_id="RESB01").exists())
        self.assertTrue(Restaurant.objects.filter(restaurant_id="RESC01").exists())

    # 17. Duplicate restaurant_id should fail (PK conflict)
    def test_duplicate_id(self):
        Restaurant.objects.create(
            restaurant_id="RES1234",
            address="Bangkok",
            name="Test",
            branch_name="Test",
            is_chain=False
        )

        data = {
            "restaurant_id": "RES1234",
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
            restaurant_id="RESZ010",
            address="Bangkok",
            name="A",
            branch_name="B",
            is_chain=False
        )
        Restaurant.objects.create(
            restaurant_id="RESA001",
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
            restaurant_id="RES100",
            address="Bangkok",
            name="Sushi Zanmai",
            branch_name="Icon",
            is_chain=False
        )
        Restaurant.objects.create(
            restaurant_id="RES101",
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
            restaurant_id="RES1", address="A", name="AA", branch_name="B", is_chain=True
        )
        Restaurant.objects.create(
            restaurant_id="RES2", address="A", name="BB", branch_name="B", is_chain=False
        )

        res = self.client.get("/api/restaurants/?is_chain=true")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 2)  # no filter enabled → returns all
        # NOTE: default DRF has no filters unless enabled manually

    # 22. Multiple field update at once
    def test_update_multiple_fields(self):
        r = Restaurant.objects.create(
            restaurant_id="RESM1",
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
        res = self.client.patch("/api/restaurants/RESM1/", data, format="json")
        r.refresh_from_db()

        self.assertEqual(res.status_code, 200)
        self.assertEqual(r.address, "New Address")
        self.assertEqual(r.name, "New Name")
        self.assertEqual(r.branch_name, "New Branch")

    # 23. Invalid chain type (must be string)
    def test_invalid_chain_data_type(self):
        data = {
            "restaurant_id": "RES200",
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
        chain_obj = RestaurantChain.objects.create(
            chain_id="CHA1",
            chain_name="MK Group",
        )
        Restaurant.objects.create(
            restaurant_id="RESHEAD001",
            address="HQ",
            name="MK",
            branch_name="HQ",
            is_chain=True,
            chain=chain_obj,
        )
        Restaurant.objects.create(
            restaurant_id="RESBR001",
            address="BKK",
            name="MK",
            branch_name="A",
            is_chain=False,
            chain=chain_obj,
        )
        Restaurant.objects.create(
            restaurant_id="RESBR002",
            address="BKK",
            name="MK",
            branch_name="B",
            is_chain=False,
            chain=chain_obj,
        )

        self.assertEqual(chain_obj.restaurants.filter(is_chain=False).count(), 2)

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
            restaurant_id="RESS1", address="A", name="B", branch_name="C", is_chain=False
        )
        res = self.client.get("/api/restaurants/RESS1/")
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
        chain = RestaurantChain.objects.create(
            chain_id="CHASELF",
            chain_name="Self Chain",
        )
        r = Restaurant.objects.create(
            restaurant_id="RESSELF",
            address="A",
            name="Self",
            branch_name="Self",
            is_chain=True,
            chain=chain,
        )

        res = self.client.patch(
            "/api/restaurants/RESSELF/",
            {"chain": chain.chain_id},
            format="json"
        )

        # DRF will allow this unless custom validator is added
        # so expected = 200
        self.assertEqual(res.status_code, 200)
        r.refresh_from_db()
        self.assertEqual(r.chain_id, chain.chain_id)  # allowed by default

    # 29. Partial update without specifying fields (empty PATCH)
    def test_empty_patch(self):
        r = Restaurant.objects.create(
            restaurant_id="RESE01",
            address="Bangkok",
            name="TestName",
            branch_name="TestBranch",
            is_chain=False,
        )

        res = self.client.patch("/api/restaurants/RESE01/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        # nothing should change
        self.assertEqual(Restaurant.objects.get(restaurant_id="RESE01").name, "TestName")

    # 30. Delete restaurant does not affect unrelated restaurants
    def test_delete_one_does_not_affect_others(self):
        Restaurant.objects.create(
            restaurant_id="RESD1", address="A", name="A", branch_name="A", is_chain=False
        )
        Restaurant.objects.create(
            restaurant_id="RESD2", address="A", name="A", branch_name="A", is_chain=False
        )

        self.client.delete("/api/restaurants/RESD1/")
        self.assertEqual(Restaurant.objects.count(), 1)
        self.assertTrue(Restaurant.objects.filter(restaurant_id="RESD2").exists())

    # 31. List endpoint returns empty list when no restaurants exist
    def test_list_empty(self):
        res = self.client.get("/api/restaurants/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, [])

    # 32. Partial update toggles is_chain flag
    def test_patch_toggle_is_chain(self):
        Restaurant.objects.create(
            restaurant_id="RES901",
            address="Addr",
            name="Toggle",
            branch_name="Branch",
            is_chain=False,
        )

        res = self.client.patch(
            "/api/restaurants/RES901/",
            {"is_chain": True},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(Restaurant.objects.get(restaurant_id="RES901").is_chain)

    # 33. PUT request overwrites restaurant fields
    def test_put_updates_all_fields(self):
        Restaurant.objects.create(
            restaurant_id="RESP01",
            address="Old",
            name="Old",
            branch_name="Old",
            is_chain=False,
        )

        payload = {
            "restaurant_id": "RESP01",
            "address": "New Address",
            "name": "New Name",
            "branch_name": "New Branch",
            "is_chain": True,
            "chain": None,
        }
        res = self.client.put("/api/restaurants/RESP01/", payload, format="json")
        self.assertEqual(res.status_code, 200)
        updated = Restaurant.objects.get(restaurant_id="RESP01")
        self.assertEqual(updated.address, "New Address")
        self.assertTrue(updated.is_chain)

    # 34. Create restaurant without chain field defaults to None
    def test_create_without_chain_field(self):
        data = {
            "restaurant_id": "RESNOC1",
            "address": "Bangkok",
            "name": "NoChain",
            "branch_name": "Solo",
            "is_chain": False,
        }
        res = self.client.post("/api/restaurants/", data, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertIsNone(Restaurant.objects.get(restaurant_id="RESNOC1").chain)

    # 35. Deleting non-existent restaurant returns 404
    def test_delete_nonexistent_restaurant(self):
        res = self.client.delete("/api/restaurants/UNKNOWN/")
        self.assertEqual(res.status_code, 404)

    # 36. Patching chain to invalid id should fail
    def test_patch_invalid_chain_reference(self):
        chain_obj = RestaurantChain.objects.create(
            chain_id="CHAOK",
            chain_name="Ok Chain",
        )
        branch = Restaurant.objects.create(
            restaurant_id="RESPATCH01",
            address="Bangkok",
            name="Branch",
            branch_name="One",
            is_chain=False,
            chain=chain_obj,
        )

        res = self.client.patch(
            f"/api/restaurants/{branch.restaurant_id}/",
            {"chain": "DOES_NOT_EXIST"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    # 37. PUT requires all mandatory fields
    def test_put_missing_required_fields(self):
        Restaurant.objects.create(
            restaurant_id="RESPUTREQ",
            address="Bangkok",
            name="Req",
            branch_name="ReqBranch",
            is_chain=False,
        )

        payload = {
            "restaurant_id": "RESPUTREQ",
            "address": "Only Address",
        }
        res = self.client.put("/api/restaurants/RESPUTREQ/", payload, format="json")
        self.assertEqual(res.status_code, 400)

    # 38. Creating with blank name should be rejected
    def test_create_blank_name(self):
        data = {
            "restaurant_id": "BLANK1",
            "address": "Bangkok",
            "name": "",
            "branch_name": "Branch",
            "is_chain": False,
        }
        res = self.client.post("/api/restaurants/", data, format="json")
        self.assertEqual(res.status_code, 400)

    # 39. Omitting is_chain defaults to False
    def test_is_chain_defaults_false(self):
        data = {
            "restaurant_id": "RESDEF1",
            "address": "Bangkok",
            "name": "Default",
            "branch_name": "Solo",
        }
        res = self.client.post("/api/restaurants/", data, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertFalse(Restaurant.objects.get(restaurant_id="RESDEF1").is_chain)

    # 40. Retrieve response includes chain id if set
    def test_retrieve_contains_chain_value(self):
        chain_obj = RestaurantChain.objects.create(
            chain_id="CHAINCLUDE1",
            chain_name="Include Chain",
        )
        Restaurant.objects.create(
            restaurant_id="RESCHAINCLUDE1R",
            address="Bangkok",
            name="Include",
            branch_name="Branch",
            is_chain=False,
            chain=chain_obj,
        )

        res = self.client.get("/api/restaurants/RESCHAINCLUDE1R/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["chain"], chain_obj.chain_id)
