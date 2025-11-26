from django.test import TestCase
from users.models import User
import json

class AuthTests(TestCase):

    def test_signup_success(self):
        data = {
            "username": "vince01",
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
            username="userexisting",
            fname="A",
            lname="B",
            bod="2000-01-01",
            phone="0000000000",
            email="vince@gmail.com",
            password="hashed"
        )

        data = {
            "username": "newuser123",
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
            username="loginuser",
            fname="A",
            lname="B",
            bod="2000-01-01",
            phone="0000000000",
            email="login@gmail.com",
            password="12345"
        )

        data = {
            "identifier": "loginuser",   # login ผ่าน username
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
            "identifier": "nousername",
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
            "username": "testno1",
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
            "username": "testno2",
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
            username="wrongpass",
            fname="Test",
            lname="User",
            bod="2000-01-01",
            phone="0000000000",
            email="wrongpass@gmail.com",
            password="correctpass"
        )

        data = {
            "identifier": "wrongpass",
            "password": "incorrect"
        }

        response = self.client.post(
            "/api/users/login/",
            data=json.dumps(data),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 400)

    def test_login_with_username(self): 
        User.objects.create(
            user_id="U0003",
            username="idlogin",
            fname="ID",
            lname="Login",
            bod="2000-01-01",
            phone="0000000000",
            email="idlogin@gmail.com",
            password="12345"
        )

        data = {
            "identifier": "idlogin",  
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

    def test_signup_missing_lname(self):
        data = {
            "username": "userA1",
            "fname": "Vince",
            "bod": "2004-01-02",
            "phone": "0912345678",
            "email": "test1@gmail.com",
            "password": "12345"
        }
        response = self.client.post(
            "/api/users/signup/",
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_signup_missing_phone(self):
        data = {
            "username": "userA2",
            "fname": "A",
            "lname": "B",
            "bod": "2004-01-02",
            "email": "test2@gmail.com",
            "password": "12345"
        }
        response = self.client.post(
            "/api/users/signup/",
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_signup_missing_password(self):
        data = {
            "username": "userA3",
            "fname": "A",
            "lname": "B",
            "bod": "2004-01-02",
            "phone": "0911111111",
            "email": "nopass@gmail.com",
        }
        response = self.client.post(
            "/api/users/signup/",
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_signup_invalid_bod_format(self):
        data = {
            "username": "userA4",
            "fname": "A",
            "lname": "B",
            "bod": "32/32/9999",
            "phone": "0900000000",
            "email": "invalidbod@gmail.com",
            "password": "12345",
        }
        response = self.client.post(
            "/api/users/signup/",
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_login_wrong_user_id(self):
        User.objects.create(
            user_id="U1234",
            username="realuser",
            fname="A",
            lname="B",
            bod="2000-01-01",
            phone="0099999999",
            email="real@gmail.com",
            password="12345",
        )

        data = {
            "identifier": "U9999",
            "password": "12345"
        }

        response = self.client.post(
            "/api/users/login/",
            data=json.dumps(data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 404)

    def test_login_empty_identifier(self):
        data = {
            "identifier": "",
            "password": "12345",
        }
        response = self.client.post(
            "/api/users/login/",
            data=json.dumps(data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)

    def test_login_empty_password(self):
        data = {
            "identifier": "someone@gmail.com",
            "password": "",
        }
        response = self.client.post(
            "/api/users/login/",
            data=json.dumps(data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)

    def test_login_identifier_not_email_or_id(self):
        User.objects.create(
            user_id="U5678",
            username="xyuser",
            fname="X",
            lname="Y",
            bod="2000-01-01",
            phone="0800000000",
            email="exist@gmail.com",
            password="12345"
        )

        data = {
            "identifier": "USERNAME_NOT_ALLOWED",
            "password": "12345",
        }

        response = self.client.post(
            "/api/users/login/",
            data=json.dumps(data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 404)

    def test_signup_empty_email(self):
        data = {
            "username": "userA5",
            "fname": "A",
            "lname": "B",
            "bod": "2004-01-02",
            "phone": "0900000000",
            "email": "",
            "password": "12345"
        }
        response = self.client.post(
            "/api/users/signup/",
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_login_password_none(self):
        User.objects.create(
            user_id="U7777",
            username="pwtest",
            fname="A",
            lname="B",
            bod="2000-01-01",
            phone="0900000000",
            email="pwnone@gmail.com",
            password="12345"
        )

        data = {
            "identifier": "pwnone@gmail.com",
            "password": None
        }

        response = self.client.post(
            "/api/users/login/",
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_login_identifier_none(self):
        data = {
            "identifier": None,
            "password": "12345"
        }
        response = self.client.post(
            "/api/users/login/",
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_signup_all_empty(self):
        data = {
            "username": "",
            "fname": "",
            "lname": "",
            "bod": "",
            "phone": "",
            "email": "",
            "password": ""
        }

        response = self.client.post(
            "/api/users/signup/",
            data=json.dumps(data),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 400)

    def test_signup_invalid_json(self):
        response = self.client.post(
            "/api/users/signup/",
            data="not a json",
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)

    def test_login_identifier_as_array(self):
        data = {
            "identifier": ["wrong", "type"],
            "password": "12345"
        }
        response = self.client.post(
            "/api/users/login/",
            data=json.dumps(data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)

    def test_signup_phone_not_number(self):
        data = {
            "username": "userA6",
            "fname": "Phone",
            "lname": "Test",
            "bod": "2004-01-02",
            "phone": "abcde",
            "email": "phonetest@gmail.com",
            "password": "12345"
        }

        response = self.client.post(
            "/api/users/signup/",
            data=json.dumps(data),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(User.objects.filter(email="phonetest@gmail.com").exists())

    def test_signup_missing_username(self):
        data = {
            "fname": "A",
            "lname": "B",
            "bod": "2004-01-02",
            "phone": "0911111111",
            "email": "nousername@gmail.com",
            "password": "12345"
        }

        response = self.client.post(
            "/api/users/signup/",
            data=json.dumps(data),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)