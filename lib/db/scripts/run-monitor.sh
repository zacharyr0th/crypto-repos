#!/bin/bash

# Database monitoring script runner
echo "Starting database monitoring at $(date)"

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

# Create logs directory if it doesn't exist
LOGS_DIR="logs/db"
mkdir -p "$LOGS_DIR"

# Generate timestamp for the report
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$LOGS_DIR/db_health_${TIMESTAMP}.txt"

echo "Database Health Report - $(date)" > "$REPORT_FILE"
echo "=================================" >> "$REPORT_FILE"

# Function to run a query and append results to report
run_query() {
    local section_name="$1"
    local query_sql="$2"
    
    echo -e "\n$section_name" >> "$REPORT_FILE"
    echo "------------------------" >> "$REPORT_FILE"
    
    # Run the SQL and capture the output directly
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
        -c "$query_sql" \
        >> "$REPORT_FILE" 2>/dev/null
}

# Run each monitoring section by extracting queries from the monitor.sql file
run_query "Index Sizes and Usage Statistics" "$(sed -n '/-- 1\. Index sizes and usage statistics/,/-- 2\./p' lib/db/sql/monitor.sql | grep -v '^--')"
run_query "Table Statistics" "$(sed -n '/-- 2\. Table statistics/,/-- 3\./p' lib/db/sql/monitor.sql | grep -v '^--')"
run_query "Cache Hit Ratios" "$(sed -n '/-- 3\. Cache hit ratios/,/-- 4\./p' lib/db/sql/monitor.sql | grep -v '^--')"
run_query "Index Usage Statistics" "$(sed -n '/-- 4\. Index usage statistics/,/-- 5\./p' lib/db/sql/monitor.sql | grep -v '^--')"
run_query "Table Bloat Estimation" "$(sed -n '/-- 5\. Bloat estimation/,$p' lib/db/sql/monitor.sql | grep -v '^--')"

echo -e "\nReport generated at: $REPORT_FILE"

# Check for potential issues
{
    echo -e "\nPotential Issues:"
    echo "----------------"
    
    # Check for unused indexes
    echo "Checking for unused indexes..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
        SELECT i.schemaname || '.' || idx.tablename || '.' || idx.indexname as index,
               pg_size_pretty(pg_relation_size(idx.indexname::regclass)) as size
        FROM pg_stat_user_indexes i
        JOIN pg_indexes idx ON i.indexrelname = idx.indexname AND i.schemaname = idx.schemaname
        WHERE i.idx_scan = 0 AND i.schemaname = 'public'
        ORDER BY pg_relation_size(idx.indexname::regclass) DESC;"
    
    # Check for tables without recent analysis
    echo -e "\nChecking for tables without recent analysis..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
        SELECT t.relname as table_name,
               t.last_analyze::date as last_analyzed
        FROM pg_stat_user_tables t
        WHERE t.last_analyze < NOW() - INTERVAL '7 days'
        AND t.schemaname = 'public';"
    
    # Check for high bloat tables
    echo -e "\nChecking for tables with high bloat..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
        SELECT t.schemaname || '.' || t.relname as table_name,
               pg_size_pretty(pg_relation_size(t.relid)) as size,
               t.n_dead_tup as dead_tuples
        FROM pg_stat_user_tables t
        WHERE t.n_dead_tup > 10000
        AND t.schemaname = 'public'
        ORDER BY t.n_dead_tup DESC;"
} >> "$REPORT_FILE"

# If any serious issues are found, send an alert (you can modify this part)
if grep -q "Unused" "$REPORT_FILE" || grep -q "high bloat" "$REPORT_FILE"; then
    echo "⚠️ Warning: Database health issues detected. Please check the report at $REPORT_FILE"
else
    echo "✅ Database health check completed successfully"
fi 