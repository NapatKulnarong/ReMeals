#!/bin/bash
# Script to load all fixtures in the correct dependency order
# This will skip duplicates if data already exists

cd "$(dirname "$0")"

echo "Loading fixtures in dependency order..."
echo ""

# Check if running in Docker
if [ -f /.dockerenv ] || [ -n "$RUNNING_IN_DOCKER" ]; then
    PYTHON_CMD="python"
    echo "Running in Docker container..."
else
    PYTHON_CMD="python3"
    # Try to activate virtual environment if it exists
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi
    echo "Running locally..."
fi

# Load fixtures in dependency order
FIXTURES=(
    "fixtures/001_restaurant_chains.json"
    "fixtures/002_restaurants.json"
    "fixtures/003_warehouses.json"
    "fixtures/004_communities.json"
    "fixtures/005_users.json"
    "fixtures/006_user_roles.json"
    "fixtures/007_donations.json"
    "fixtures/008_food_items.json"
    "fixtures/011_impactrecord.json"
)

for fixture in "${FIXTURES[@]}"; do
    echo "Loading $fixture..."
    $PYTHON_CMD manage.py loaddata "$fixture" --verbosity=0 2>&1 | grep -v "objects imported automatically" || echo "  (some objects may already exist)"
done

echo ""
echo "Done! Checking impact records..."
$PYTHON_CMD manage.py shell -c "from impactrecord.models import ImpactRecord; print(f'Impact records in database: {ImpactRecord.objects.count()}')" 2>&1 | grep -v "objects imported automatically"
