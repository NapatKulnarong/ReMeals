#!/usr/bin/env python
"""
Simple script to generate Django password hash for fixtures.
Run this script and copy the output hash to replace placeholder passwords in 005_users.json
"""
import sys
import os
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 're_meals_api.settings')
django.setup()

from django.contrib.auth.hashers import make_password

# Generate hash for password123
password = "password123"
hashed = make_password(password)

print("="*70)
print("DJANGO PASSWORD HASH GENERATOR")
print("="*70)
print(f"\nPassword: {password}")
print(f"\nGenerated Hash:\n{hashed}")
print("\n" + "="*70)
print("INSTRUCTIONS:")
print("="*70)
print("1. Copy the hash above")
print("2. Open fixtures/005_users.json")
print("3. Replace all 'password' field values with this hash")
print("4. Save the file")
print("5. Load fixtures with: python manage.py loaddata fixtures/*.json")
print("="*70 + "\n")
