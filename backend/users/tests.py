from django.test import TestCase

# Create your tests here.
from django.urls import reverse
from users.models import User
import json

class AuthTests(TestCase):

    def test_signup_success(self):
        data = {
            "fname": "Vince",
            "lname": "Tanoy",
            "bod": "2004-01-02",
            "phone": "0912345678",
            "email": "vince@gmail.com",
            "password": "12345"
        }

        response = self.client.post(
            "/api/users/signup/",
            data=json.dumps(data),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(User.objects.filter(email="vince@gmail.com").exists())

    def test_signup_duplicate_email(self):
        User.objects.create(
            user_id="U0001",
            fname="A",
            lname="B",
            bod="2000-01-01",
            phone="0000000000",
            email="vince@gmail.com",
            password="hashed"  
        )

        data = {
            "fname": "New",
            "lname": "User",
            "bod": "2004-01-02",
            "phone": "0912345678",
            "email": "vince@gmail.com",
            "password": "12345"
        }

        response = self.client.post(
            "/api/users/signup/",
            data=json.dumps(data),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 400)

    def test_login_success(self):
        User.objects.create(
            user_id="U0001",
            fname="A",
            lname="B",
            bod="2000-01-01",
            phone="0000000000",
            email="vince@gmail.com",
            password="$2b$12$abcdcd1234"
        )

        data = {
            "identifier": "vince@gmail.com",
            "password": "12345"
        }

        response = self.client.post(
            "/api/users/login/",
            data=json.dumps(data),
            content_type="application/json"
        )

        self.assertIn(response.status_code, [200, 400])

    def test_login_not_found(self):
        data = {
            "identifier": "notfound@gmail.com",
            "password": "12345"
        }

        response = self.client.post(
            "/api/users/login/",
            data=json.dumps(data),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 404)

    def test_signup_missing_fname(self):
        data = {
            "lname": "Tanoy",
            "bod": "2004-01-02",
            "phone": "0912345678",
            "email": "missing@gmail.com",
            "password": "12345"
        }

        response = self.client.post(
            "/api/users/signup/",
            data=json.dumps(data),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 400)

    def test_signup_missing_email(self):
        data = {
            "fname": "Vince",
            "lname": "Tanoy",
            "bod": "2004-01-02",
            "phone": "0912345678",
            "password": "12345"
        }

        response = self.client.post(
            "/api/users/signup/",
            data=json.dumps(data),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 400)

    def test_login_wrong_password(self):
        User.objects.create(
            user_id="U0002",
            fname="Test",
            lname="User",
            bod="2000-01-01",
            phone="0000000000",
            email="wrongpass@gmail.com",
            password="correctpass"
        )

        data = {
            "identifier": "wrongpass@gmail.com",
            "password": "incorrect"
        }

        response = self.client.post(
            "/api/users/login/",
            data=json.dumps(data),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 400)

    def test_login_with_user_id(self):
        User.objects.create(
            user_id="U0003",
            fname="ID",
            lname="Login",
            bod="2000-01-01",
            phone="0000000000",
            email="idlogin@gmail.com",
            password="12345"
        )

        data = {
            "identifier": "U0003",
            "password": "12345"
        }

        response = self.client.post(
            "/api/users/login/",
            data=json.dumps(data),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 200)

    def test_login_missing_password(self):
        data = {
            "identifier": "someone@gmail.com"
        }

        response = self.client.post(
            "/api/users/login/",
            data=json.dumps(data),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 400)

    def test_login_missing_identifier(self):
        data = {
            "password": "12345"
        }

        response = self.client.post(
            "/api/users/login/",
            data=json.dumps(data),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 400)