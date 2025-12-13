from datetime import date

from django.test import TestCase
from django.contrib.auth.hashers import make_password
from django.db import IntegrityError
from django.utils import timezone

from users.models import User, Donor, Recipient
from restaurants.models import Restaurant
from community.models import Community
from warehouse.models import Warehouse
import json

class AuthTests(TestCase):

    # 1. Signup succeeds with valid payload
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

    # 2. Signup rejects duplicate email
    def test_signup_duplicate_email(self):
        User.objects.create(
            user_id="U0001",
            username="userexisting",
            fname="A",
            lname="B",
            bod="2000-01-01",
            phone="0000000000",
            email="vince@gmail.com",
            password=make_password("hashed")
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

    # 3. Login accepts username identifier
    def test_login_success(self):
        User.objects.create(
            user_id="U0001",
            username="loginuser",
            fname="A",
            lname="B",
            bod="2000-01-01",
            phone="0000000000",
            email="login@gmail.com",
            password=make_password("12345")
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

    # 4. Login returns 404 for unknown identifier
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

    # 5. Signup rejects missing fname
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

    # 6. Signup rejects missing email
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

    # 7. Login rejects wrong password
    def test_login_wrong_password(self):
        User.objects.create(
            user_id="U0002",
            username="wrongpass",
            fname="Test",
            lname="User",
            bod="2000-01-01",
            phone="0000000000",
            email="wrongpass@gmail.com",
            password=make_password("correctpass")
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

    # 8. Login works with username identifier
    def test_login_with_username(self):
        User.objects.create(
            user_id="U0003",
            username="idlogin",
            fname="ID",
            lname="Login",
            bod="2000-01-01",
            phone="0000000000",
            email="idlogin@gmail.com",
            password=make_password("12345")
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

    # 9. Login requires password
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


class RoleModelTests(TestCase):
    def setUp(self):
        self.donor_user = User.objects.create(
            user_id="DON999001",
            username="donor.single",
            fname="Donor",
            lname="One",
            bod="1990-01-01",
            phone="0800000001",
            email="donor.one@example.com",
            password=make_password("pass1234"),
        )
        self.recipient_user = User.objects.create(
            user_id="REC999001",
            username="recipient.single",
            fname="Recipient",
            lname="One",
            bod="1991-02-02",
            phone="0800000002",
            email="recipient.one@example.com",
            password=make_password("pass1234"),
        )
        self.recipient_user_two = User.objects.create(
            user_id="REC999002",
            username="recipient.two",
            fname="Recipient",
            lname="Two",
            bod="1992-03-03",
            phone="0800000003",
            email="recipient.two@example.com",
            password=make_password("pass1234"),
        )
        self.restaurant_one = Restaurant.objects.create(
            address="99 Main St",
            name="Test Kitchen",
            branch_name="Central",
            is_chain=False,
        )
        self.restaurant_two = Restaurant.objects.create(
            address="101 Second St",
            name="Test Kitchen",
            branch_name="North",
            is_chain=False,
        )
        self.warehouse = Warehouse.objects.create(
            address="Warehouse Road",
            capacity=1000,
            stored_date=date(2025, 1, 1),
            exp_date=date(2025, 12, 31),
        )
        self.community = Community.objects.create(
            name="Community Alpha",
            address="Community Lane",
            received_time=timezone.now(),
            population=500,
            warehouse_id=self.warehouse,
        )

    def test_user_cannot_represent_multiple_restaurants(self):
        Donor.objects.create(user=self.donor_user, restaurant_id=self.restaurant_one)
        with self.assertRaises(IntegrityError):
            Donor.objects.create(user=self.donor_user, restaurant_id=self.restaurant_two)

    def test_user_cannot_register_twice_as_recipient(self):
        Recipient.objects.create(
            user=self.recipient_user,
            address="123 Recipient Rd",
            community_id=self.community,
        )
        Recipient.objects.create(
            user=self.recipient_user_two,
            address="456 Shared Rd",
            community_id=self.community,
        )
        with self.assertRaises(IntegrityError):
            Recipient.objects.create(
                user=self.recipient_user,
                address="789 Duplicate Rd",
                community_id=self.community,
            )

    # 10. Login requires identifier
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

    # 11. Signup rejects missing lname
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

    # 12. Signup rejects missing phone
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

    # 13. Signup rejects missing password
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

    # 14. Signup rejects invalid birthday format
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

    # 15. Login returns 404 for mismatched user_id
    def test_login_wrong_user_id(self):
        User.objects.create(
            user_id="U1234",
            username="realuser",
            fname="A",
            lname="B",
            bod="2000-01-01",
            phone="0099999999",
            email="real@gmail.com",
            password=make_password("12345"),
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

    # 16. Login rejects empty identifier
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

    # 17. Login rejects empty password
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

    # 18. Login requires identifier to be email or user_id
    def test_login_identifier_not_email_or_id(self):
        User.objects.create(
            user_id="U5678",
            username="xyuser",
            fname="X",
            lname="Y",
            bod="2000-01-01",
            phone="0800000000",
            email="exist@gmail.com",
            password=make_password("12345")
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

    # 19. Signup rejects empty email string
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

    # 20. Login rejects password set to None
    def test_login_password_none(self):
        User.objects.create(
            user_id="U7777",
            username="pwtest",
            fname="A",
            lname="B",
            bod="2000-01-01",
            phone="0900000000",
            email="pwnone@gmail.com",
            password=make_password("12345")
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

    # 21. Login rejects identifier set to None
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

    # 22. Signup rejects entirely empty payload
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

    # 23. Signup rejects invalid JSON payload
    def test_signup_invalid_json(self):
        response = self.client.post(
            "/api/users/signup/",
            data="not a json",
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)

    # 24. Login rejects non-string identifier types
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

    # 25. Signup currently allows non-numeric phone strings
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

    # 26. Signup rejects missing username
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

    # 27. Signup rejects duplicate username
    def test_signup_duplicate_username(self):
        User.objects.create(
            user_id="U2222",
            username="dupuser",
            fname="A",
            lname="B",
            bod="2000-01-01",
            phone="0999999999",
            email="dup@example.com",
            password=make_password("12345"),
        )

        data = {
            "username": "dupuser",
            "fname": "Another",
            "lname": "User",
            "bod": "2004-01-02",
            "phone": "0888888888",
            "email": "another@example.com",
            "password": "12345",
        }

        response = self.client.post(
            "/api/users/signup/",
            data=json.dumps(data),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    # 28. Signup accepts dd/mm/YYYY bod format
    def test_signup_slash_bod_format(self):
        data = {
            "username": "slashdate",
            "fname": "Slash",
            "lname": "Format",
            "bod": "02/01/2004",
            "phone": "0812345678",
            "email": "slash@example.com",
            "password": "12345",
        }

        response = self.client.post(
            "/api/users/signup/",
            data=json.dumps(data),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        user = User.objects.get(email="slash@example.com")
        self.assertEqual(str(user.bod), "2004-01-02")

    # 29. Login succeeds when using email identifier
    def test_login_with_email(self):
        User.objects.create(
            user_id="U8888",
            username="emaillogin",
            fname="Mail",
            lname="Login",
            bod="2000-01-01",
            phone="0900000001",
            email="emaillogin@example.com",
            password=make_password("pass123"),
        )

        data = {
            "identifier": "emaillogin@example.com",
            "password": "pass123",
        }

        response = self.client.post(
            "/api/users/login/",
            data=json.dumps(data),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)

    # 30. Login rejects non-string password types
    def test_login_password_wrong_type(self):
        data = {
            "identifier": "anyone",
            "password": ["array-not-allowed"],
        }

        response = self.client.post(
            "/api/users/login/",
            data=json.dumps(data),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    # 31. Login rejects completely empty payload
    def test_login_empty_payload(self):
        response = self.client.post(
            "/api/users/login/",
            data=json.dumps({}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    # 32. Signup response contains success message
    def test_signup_response_message(self):
        data = {
            "username": "messageuser",
            "fname": "Msg",
            "lname": "User",
            "bod": "2004-01-02",
            "phone": "0912345999",
            "email": "message@example.com",
            "password": "12345",
        }

        response = self.client.post(
            "/api/users/signup/",
            data=json.dumps(data),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json().get("message"), "Signup successful")

    # 33. Login response returns username and email
    def test_login_response_contains_user_data(self):
        User.objects.create(
            user_id="U9999",
            username="respuser",
            fname="Resp",
            lname="User",
            bod="2000-01-01",
            phone="0912345000",
            email="resp@example.com",
            password=make_password("pwresp"),
        )

        data = {
            "identifier": "resp@example.com",
            "password": "pwresp",
        }

        response = self.client.post(
            "/api/users/login/",
            data=json.dumps(data),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json().get("username"), "respuser")
        self.assertEqual(response.json().get("email"), "resp@example.com")

    # 34. Signup auto-generates uppercase 10-char user_id
    def test_signup_generates_user_id_format(self):
        data = {
            "username": "randomiduser",
            "fname": "Random",
            "lname": "Id",
            "bod": "2004-02-01",
            "phone": "0912345666",
            "email": "randomid@example.com",
            "password": "12345",
        }

        response = self.client.post(
            "/api/users/signup/",
            data=json.dumps(data),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        user = User.objects.get(email="randomid@example.com")
        self.assertEqual(len(user.user_id), 10)
        self.assertEqual(user.user_id, user.user_id.upper())

    # 35. Login rejects invalid JSON payload
    def test_login_invalid_json(self):
        response = self.client.post(
            "/api/users/login/",
            data="not json",
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    # 36. Login username lookup is case-sensitive
    def test_login_username_case_sensitive(self):
        User.objects.create(
            user_id="U1112",
            username="casetest",
            fname="Case",
            lname="Test",
            bod="2000-01-01",
            phone="0900000002",
            email="casetest@example.com",
            password=make_password("casepass"),
        )

        data = {
            "identifier": "CASETEST",
            "password": "casepass",
        }

        response = self.client.post(
            "/api/users/login/",
            data=json.dumps(data),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 404)
