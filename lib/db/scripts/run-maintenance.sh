#!/bin/bash

# Database maintenance script runner
echo "Starting database maintenance at $(date)"

# Load environment variables if .env file exists
if [ -f .env ]; then
    source .env
fi

# Use the environment variables from .env
DB_USER=${POSTGRES_USER:-zacharytylerroth}
DB_NAME=${POSTGRES_DB:-crypto_repos}
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_PASSWORD=${POSTGRES_PASSWORD:-postgres}

echo "Running maintenance on database: $DB_NAME as user: $DB_USER"

# Create logs directory if it doesn't exist
LOGS_DIR="logs/db"
mkdir -p "$LOGS_DIR"

# Run maintenance script
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f lib/db/sql/maintenance.sql

# Check if maintenance completed successfully
if [ $? -eq 0 ]; then
    echo "Maintenance completed successfully at $(date)" | tee -a "$LOGS_DIR/maintenance.log"
else
    echo "Maintenance failed at $(date)" | tee -a "$LOGS_DIR/maintenance.log"
    exit 1
fi 