from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from .models import RestaurantChain


class RestaurantChainAPITests(APITestCase):

    def setUp(self):
        self.client = APIClient()

    # 1. Create a restaurant chain successfully
    def test_create_chain(self):
        payload = {"chain_id": "CHAIN10", "chain_name": "New Chain"}
        res = self.client.post("/api/restaurant-chains/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(RestaurantChain.objects.filter(chain_id="CHAIN10").exists())

    # 2. List restaurant chains
    def test_list_chains(self):
        RestaurantChain.objects.create(chain_id="CHAIN11", chain_name="Chain 11")
        res = self.client.get("/api/restaurant-chains/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    # 3. Delete a restaurant chain
    def test_delete_chain(self):
        chain = RestaurantChain.objects.create(chain_id="CHAIN12", chain_name="Chain 12")
        res = self.client.delete(f"/api/restaurant-chains/{chain.chain_id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(RestaurantChain.objects.filter(chain_id="CHAIN12").exists())

    # 4. Create chain requires chain_name
    def test_create_chain_requires_name(self):
        payload = {"chain_id": "CHAIN13"}
        res = self.client.post("/api/restaurant-chains/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(RestaurantChain.objects.filter(chain_id="CHAIN13").exists())

    # 5. Updating chain name via PUT works
    def test_update_chain_name(self):
        chain = RestaurantChain.objects.create(chain_id="CHAIN14", chain_name="Old Name")
        payload = {"chain_id": "CHAIN14", "chain_name": "Updated Name"}
        res = self.client.put(f"/api/restaurant-chains/{chain.chain_id}/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        chain.refresh_from_db()
        self.assertEqual(chain.chain_name, "Updated Name")

    # 6. Partial update via PATCH updates only provided fields
    def test_patch_chain_name(self):
        chain = RestaurantChain.objects.create(chain_id="CHAIN15", chain_name="Patch Name")
        res = self.client.patch(
            f"/api/restaurant-chains/{chain.chain_id}/",
            {"chain_name": "Patched"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        chain.refresh_from_db()
        self.assertEqual(chain.chain_name, "Patched")

    # 7. Retrieving chain detail returns chain data
    def test_get_chain_detail(self):
        chain = RestaurantChain.objects.create(chain_id="CHAIN16", chain_name="Detail Chain")
        res = self.client.get(f"/api/restaurant-chains/{chain.chain_id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["chain_id"], chain.chain_id)
        self.assertEqual(res.data["chain_name"], chain.chain_name)

    # 8. Creating duplicate chain_id fails
    def test_create_duplicate_chain_id_fails(self):
        RestaurantChain.objects.create(chain_id="CHAIN17", chain_name="First")
        payload = {"chain_id": "CHAIN17", "chain_name": "Duplicate"}
        res = self.client.post("/api/restaurant-chains/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
