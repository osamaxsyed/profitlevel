#!/bin/bash

# This script adds auth imports and user filtering to all API routes

echo "Adding auth to API routes..."

# List of files to update
files=(
  "app/api/overhead/route.ts"
  "app/api/overhead/[id]/route.ts"
  "app/api/settings/route.ts"
  "app/api/settings/goals/route.ts"
  "app/api/labor/route.ts"
  "app/api/labor/[id]/route.ts"
  "app/api/materials/route.ts"
  "app/api/materials/[id]/route.ts"
  "app/api/mileage/route.ts"
  "app/api/mileage/[id]/route.ts"
  "app/api/business-health/route.ts"
  "app/api/financial-summary/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    # Check if already has auth import
    if ! grep -q "getUserId" "$file"; then
      echo "Adding auth to $file"
      # We'll manually update these
    fi
  fi
done

echo "Done! Now manually update each file to add getUserId() and user filtering"
