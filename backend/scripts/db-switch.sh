#!/bin/bash

# Database mode switcher script
# Usage: ./scripts/db-switch.sh [test|prod]

ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: .env file not found at $ENV_FILE"
    exit 1
fi

case "$1" in
    "test")
        echo "🔄 Switching to TEST database mode..."
        # Update DB_MODE to test
        if grep -q "^DB_MODE=" "$ENV_FILE"; then
            sed -i.bak 's/^DB_MODE=.*/DB_MODE=test/' "$ENV_FILE"
        else
            echo "DB_MODE=test" >> "$ENV_FILE"
        fi
        echo "✅ Database mode set to TEST"
        echo "📋 Test database will be used for all operations"
        ;;
    
    "prod"|"production")
        echo "🔄 Switching to PRODUCTION database mode..."
        # Update DB_MODE to production
        if grep -q "^DB_MODE=" "$ENV_FILE"; then
            sed -i.bak 's/^DB_MODE=.*/DB_MODE=production/' "$ENV_FILE"
        else
            echo "DB_MODE=production" >> "$ENV_FILE"
        fi
        echo "✅ Database mode set to PRODUCTION"
        echo "⚠️  Production database will be used for all operations"
        ;;
    
    "status")
        echo "📋 Current database configuration:"
        echo ""
        if grep -q "^DB_MODE=" "$ENV_FILE"; then
            CURRENT_MODE=$(grep "^DB_MODE=" "$ENV_FILE" | cut -d'=' -f2)
            echo "Current mode: $CURRENT_MODE"
        else
            echo "Current mode: production (default)"
        fi
        
        echo ""
        echo "Available databases:"
        if grep -q "^DATABASE_URL=" "$ENV_FILE"; then
            echo "✅ Production database configured"
        else
            echo "❌ Production database NOT configured"
        fi
        
        if grep -q "^TEST_DATABASE_URL=" "$ENV_FILE"; then
            echo "✅ Test database configured"
        else
            echo "❌ Test database NOT configured"
        fi
        ;;
    
    *)
        echo "🛠️  Database Mode Switcher"
        echo ""
        echo "Usage:"
        echo "  ./scripts/db-switch.sh test        - Switch to test database"
        echo "  ./scripts/db-switch.sh prod        - Switch to production database"
        echo "  ./scripts/db-switch.sh status      - Show current configuration"
        echo ""
        echo "Current mode: $(grep '^DB_MODE=' "$ENV_FILE" 2>/dev/null | cut -d'=' -f2 || echo 'production (default)')"
        ;;
esac