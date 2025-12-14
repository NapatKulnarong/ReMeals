#!/bin/bash
# Script to load impact record fixtures
# Usage: ./load_impact_fixtures.sh

echo "Loading impact record fixtures..."

# Check if running in Docker
if [ -f /.dockerenv ] || [ -n "$RUNNING_IN_DOCKER" ]; then
    echo "Running in Docker container..."
    python manage.py loaddata fixtures/011_impactrecord.json
else
    echo "Running locally..."
    # Try to activate virtual environment if it exists
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi
    python3 manage.py loaddata fixtures/011_impactrecord.json || python manage.py loaddata fixtures/011_impactrecord.json
fi

echo "Done! Check the impact dashboard to see if data appears."
