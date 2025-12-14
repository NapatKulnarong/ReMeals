from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from django.db import transaction
from django.utils import timezone

from users.models import User, Admin, Donor, DeliveryStaff, Recipient
from restaurants.models import Restaurant
from restaurant_chain.models import RestaurantChain
from warehouse.models import Warehouse
from community.models import Community
from donation_request.models import DonationRequest


class Command(BaseCommand):
    help = 'Seed database with sample users for each role'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing seed data before creating new data',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing seed data...'))
            self.clear_seed_data()

        self.stdout.write(self.style.SUCCESS('Starting data seed...'))

        try:
            with transaction.atomic():
                # Create restaurant chains
                chains = self.create_restaurant_chains()
                self.stdout.write(self.style.SUCCESS(f'✓ Created {len(chains)} restaurant chains'))

                # Create restaurants
                restaurants = self.create_restaurants(chains)
                self.stdout.write(self.style.SUCCESS(f'✓ Created {len(restaurants)} restaurants'))

                # Create warehouses
                warehouses = self.create_warehouses()
                self.stdout.write(self.style.SUCCESS(f'✓ Created {len(warehouses)} warehouses'))

                # Create communities
                communities = self.create_communities(warehouses)
                self.stdout.write(self.style.SUCCESS(f'✓ Created {len(communities)} communities'))

                # Create users
                users = self.create_users()
                self.stdout.write(self.style.SUCCESS(f'✓ Created {len(users)} users'))

                # Assign roles
                self.assign_roles(users, restaurants, communities)
                self.stdout.write(self.style.SUCCESS('✓ Assigned user roles'))

            self.stdout.write(self.style.SUCCESS('\n✅ Database seeded successfully!'))
            self.print_credentials()

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Error seeding database: {str(e)}'))
            raise

    def clear_seed_data(self):
        """Clear all seed data"""
        # Roles will cascade delete when users are deleted
        User.objects.filter(user_id__startswith='SEED').delete()
        Restaurant.objects.filter(restaurant_id__startswith='RES').delete()
        RestaurantChain.objects.filter(chain_id__startswith='CHA').delete()
        Warehouse.objects.filter(warehouse_id__startswith='WAR').delete()
        Community.objects.filter(community_id__startswith='COM').delete()

    def create_restaurant_chains(self):
        """Create sample restaurant chains"""
        chains = [
            RestaurantChain(chain_id='CHA001', chain_name='KFC Thailand'),
            RestaurantChain(chain_id='CHA002', chain_name='The Pizza Company'),
            RestaurantChain(chain_id='CHA003', chain_name='Sizzler'),
        ]
        return RestaurantChain.objects.bulk_create(chains, ignore_conflicts=True)

    def create_restaurants(self, chains):
        """Create sample restaurants"""
        restaurants = [
            Restaurant(
                restaurant_id='RES001',
                name='KFC',
                branch_name='Central World',
                address='999/9 Rama I Rd, Pathum Wan, Bangkok 10330',
                is_chain=True,
                chain=RestaurantChain.objects.get(chain_id='CHA001')
            ),
            Restaurant(
                restaurant_id='RES002',
                name='KFC',
                branch_name='Siam Paragon',
                address='991 Rama I Rd, Pathum Wan, Bangkok 10330',
                is_chain=True,
                chain=RestaurantChain.objects.get(chain_id='CHA001')
            ),
            Restaurant(
                restaurant_id='RES003',
                name='The Pizza Company',
                branch_name='Mega Bangna',
                address='39 Bangna-Trad Road, Bang Kaeo, Bang Phli, Samut Prakan 10540',
                is_chain=True,
                chain=RestaurantChain.objects.get(chain_id='CHA002')
            ),
            Restaurant(
                restaurant_id='RES004',
                name='Sizzler',
                branch_name='EmQuartier',
                address='693, 695 Sukhumvit Rd, Khlong Tan Nuea, Watthana, Bangkok 10110',
                is_chain=True,
                chain=RestaurantChain.objects.get(chain_id='CHA003')
            ),
        ]
        return Restaurant.objects.bulk_create(restaurants, ignore_conflicts=True)

    def create_warehouses(self):
        """Create sample warehouses"""
        warehouses = [
            Warehouse(
                warehouse_id='WAR001',
                address='123 Warehouse District, Lat Krabang, Bangkok 10520',
                capacity=5000.0,
                stored_date='2025-01-01',
                exp_date='2025-12-31'
            ),
            Warehouse(
                warehouse_id='WAR002',
                address='456 Storage Avenue, Bang Phli, Samut Prakan 10540',
                capacity=3000.0,
                stored_date='2025-01-01',
                exp_date='2025-12-31'
            ),
            Warehouse(
                warehouse_id='WAR003',
                address='789 Cold Storage Road, Nonthaburi 11000',
                capacity=4000.0,
                stored_date='2025-01-01',
                exp_date='2025-12-31'
            ),
        ]
        return Warehouse.objects.bulk_create(warehouses, ignore_conflicts=True)

    def create_communities(self, warehouses):
        """Create sample communities"""
        from django.utils import timezone

        communities = [
            Community(
                community_id='COM001',
                name='Klong Toey Community',
                address='Klong Toey, Bangkok 10110',
                received_time=timezone.now(),
                population=500,
                warehouse_id=Warehouse.objects.get(warehouse_id='WAR001')
            ),
            Community(
                community_id='COM002',
                name='Bang Khen Community Center',
                address='Bang Khen, Bangkok 10220',
                received_time=timezone.now(),
                population=300,
                warehouse_id=Warehouse.objects.get(warehouse_id='WAR002')
            ),
            Community(
                community_id='COM003',
                name='Pathum Thani Relief Center',
                address='Pathum Thani 12000',
                received_time=timezone.now(),
                population=750,
                warehouse_id=Warehouse.objects.get(warehouse_id='WAR003')
            ),
        ]
        return Community.objects.bulk_create(communities, ignore_conflicts=True)

    def create_users(self):
        """Create sample users with hashed passwords"""
        password = make_password('password123')

        users = [
            User(
                user_id='SEED001',
                username='admin',
                fname='System',
                lname='Administrator',
                bod='1990-01-01',
                phone='0812345001',
                email='admin@remeals.com',
                password=password
            ),
            User(
                user_id='SEED002',
                username='donor1',
                fname='Somchai',
                lname='Restaurant',
                bod='1985-05-15',
                phone='0812345002',
                email='donor1@remeals.com',
                password=password
            ),
            User(
                user_id='SEED003',
                username='donor2',
                fname='Pensri',
                lname='Kitchen',
                bod='1988-08-20',
                phone='0812345003',
                email='donor2@remeals.com',
                password=password
            ),
            User(
                user_id='SEED004',
                username='delivery1',
                fname='Manee',
                lname='Driver',
                bod='1992-03-10',
                phone='0812345004',
                email='delivery1@remeals.com',
                password=password
            ),
            User(
                user_id='SEED005',
                username='delivery2',
                fname='Niran',
                lname='Transport',
                bod='1995-07-25',
                phone='0812345005',
                email='delivery2@remeals.com',
                password=password
            ),
            User(
                user_id='SEED006',
                username='recipient1',
                fname='Suwan',
                lname='Community',
                bod='1980-11-05',
                phone='0812345006',
                email='recipient1@remeals.com',
                password=password
            ),
            User(
                user_id='SEED007',
                username='recipient2',
                fname='Amporn',
                lname='Relief',
                bod='1983-02-14',
                phone='0812345007',
                email='recipient2@remeals.com',
                password=password
            ),
        ]
        return User.objects.bulk_create(users, ignore_conflicts=True)

    def assign_roles(self, users, restaurants, communities):
        """Assign roles to users"""
        # Admin (user is the primary key)
        Admin.objects.get_or_create(
            user=User.objects.get(user_id='SEED001')
        )

        # Donors (user is the primary key)
        Donor.objects.get_or_create(
            user=User.objects.get(user_id='SEED002'),
            defaults={'restaurant_id': Restaurant.objects.get(restaurant_id='RES001')}
        )
        Donor.objects.get_or_create(
            user=User.objects.get(user_id='SEED003'),
            defaults={'restaurant_id': Restaurant.objects.get(restaurant_id='RES003')}
        )

        # Delivery Staff (user is the primary key)
        DeliveryStaff.objects.get_or_create(
            user=User.objects.get(user_id='SEED004'),
            defaults={
                'assigned_area': 'Bangkok Central',
                'is_available': True
            }
        )
        DeliveryStaff.objects.get_or_create(
            user=User.objects.get(user_id='SEED005'),
            defaults={
                'assigned_area': 'Samut Prakan',
                'is_available': True
            }
        )

        # Donation requests for recipients
        request_one, _ = DonationRequest.objects.get_or_create(
            request_id='REQSEED001',
            defaults={
                'title': 'Seed Request One',
                'community_name': 'Community Alpha',
                'recipient_address': '123 Klong Toey, Bangkok 10110',
                'expected_delivery': timezone.now(),
                'people_count': 100,
                'contact_phone': '0800000001',
                'notes': 'Seed donation request',
                'community': communities[0],
            }
        )
        request_two, _ = DonationRequest.objects.get_or_create(
            request_id='REQSEED002',
            defaults={
                'title': 'Seed Request Two',
                'community_name': 'Community Beta',
                'recipient_address': '456 Bang Khen, Bangkok 10220',
                'expected_delivery': timezone.now(),
                'people_count': 150,
                'contact_phone': '0800000002',
                'notes': 'Seed donation request',
                'community': communities[1],
            }
        )

        # Recipients (user is the primary key)
        Recipient.objects.get_or_create(
            user=User.objects.get(user_id='SEED006'),
            defaults={
                'address': '123 Klong Toey, Bangkok 10110',
                'donation_request': request_one,
            }
        )
        Recipient.objects.get_or_create(
            user=User.objects.get(user_id='SEED007'),
            defaults={
                'address': '456 Bang Khen, Bangkok 10220',
                'donation_request': request_two,
            }
        )

    def print_credentials(self):
        """Print login credentials for seeded users"""
        self.stdout.write('\n' + '='*70)
        self.stdout.write(self.style.SUCCESS('SEEDED USER CREDENTIALS'))
        self.stdout.write('='*70)
        self.stdout.write('\nAll users have password: password123\n')

        credentials = [
            ('Admin', 'admin', 'admin@remeals.com', 'System Administrator'),
            ('Donor', 'donor1', 'donor1@remeals.com', 'KFC Central World'),
            ('Donor', 'donor2', 'donor2@remeals.com', 'The Pizza Company'),
            ('Delivery', 'delivery1', 'delivery1@remeals.com', 'Bangkok Central'),
            ('Delivery', 'delivery2', 'delivery2@remeals.com', 'Samut Prakan'),
            ('Recipient', 'recipient1', 'recipient1@remeals.com', 'Klong Toey'),
            ('Recipient', 'recipient2', 'recipient2@remeals.com', 'Bang Khen'),
        ]

        for role, username, email, details in credentials:
            self.stdout.write(f'\n{role:12} | {username:12} | {email:25} | {details}')

        self.stdout.write('\n' + '='*70 + '\n')
