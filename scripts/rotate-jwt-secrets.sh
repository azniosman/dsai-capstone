#!/bin/bash
# JWT Secret Rotation Script
# 
# This script rotates JWT secrets safely without disrupting active sessions.
# 
# Usage:
#   ./scripts/rotate-jwt-secrets.sh [options]
#
# Options:
#   --dry-run         Show what would be changed without making changes
#   --force           Skip confirmation prompts
#   --backup          Create backup of current secrets before rotation
#   --help            Show this help message
#
# Security Notes:
#   - All active sessions will be invalidated
#   - Plan rotation during low-traffic periods
#   - Update secrets in all environments (load balancers, services, etc.)
#   - Store old secrets securely for token validation during transition

set -e

# Configuration
ENV_FILE="${ENV_FILE:-.env}"
BACKUP_DIR="${BACKUP_DIR:-.secrets-backup}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Flags
DRY_RUN=false
FORCE=false
BACKUP=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --backup)
      BACKUP=true
      shift
      ;;
    --help)
      echo "JWT Secret Rotation Script"
      echo ""
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --dry-run    Show what would be changed without making changes"
      echo "  --force      Skip confirmation prompts"
      echo "  --backup     Create backup of current secrets before rotation"
      echo "  --help       Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Functions
log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

# Generate secure random string
generate_secret() {
  openssl rand -hex 32
}

# Check if .env file exists
check_env_file() {
  if [ ! -f "$ENV_FILE" ]; then
    log_error "Environment file not found: $ENV_FILE"
    exit 1
  fi
}

# Backup current secrets
backup_secrets() {
  log_info "Creating backup of current secrets..."
  
  mkdir -p "$BACKUP_DIR"
  local backup_file="$BACKUP_DIR/secrets_backup_$TIMESTAMP.env"
  
  # Extract only secret-related lines
  grep -E "(JWT_SECRET|REFRESH_TOKEN_SECRET|INTERNAL_AUTOMATION_TOKEN)=" "$ENV_FILE" > "$backup_file" 2>/dev/null || true
  
  if [ -f "$backup_file" ]; then
    chmod 600 "$backup_file"
    log_success "Backup created: $backup_file"
    echo ""
    echo "IMPORTANT: Store this backup securely. It contains valid secrets."
    echo "Delete after confirming rotation was successful."
  else
    log_warning "No secrets found to backup"
  fi
}

# Generate new secrets
generate_new_secrets() {
  log_info "Generating new JWT secrets..."
  echo ""
  
  NEW_JWT_SECRET=$(generate_secret)
  NEW_REFRESH_SECRET=$(generate_secret)
  NEW_INTERNAL_TOKEN=$(generate_secret)
  
  echo "Generated new secrets:"
  echo "  JWT_SECRET: ${NEW_JWT_SECRET:0:16}... (${#NEW_JWT_SECRET} chars)"
  echo "  REFRESH_TOKEN_SECRET: ${NEW_REFRESH_SECRET:0:16}... (${#NEW_REFRESH_SECRET} chars)"
  echo "  INTERNAL_AUTOMATION_TOKEN: ${NEW_INTERNAL_TOKEN:0:16}... (${#NEW_INTERNAL_TOKEN} chars)"
  echo ""
}

# Update .env file
update_env_file() {
  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would update $ENV_FILE with new secrets"
    return
  fi
  
  log_info "Updating $ENV_FILE..."
  
  # Create a temporary file
  local temp_file=$(mktemp)
  
  # Update each secret
  while IFS= read -r line; do
    if [[ "$line" =~ ^JWT_SECRET= ]]; then
      echo "JWT_SECRET=$NEW_JWT_SECRET" >> "$temp_file"
    elif [[ "$line" =~ ^REFRESH_TOKEN_SECRET= ]]; then
      echo "REFRESH_TOKEN_SECRET=$NEW_REFRESH_SECRET" >> "$temp_file"
    elif [[ "$line" =~ ^INTERNAL_AUTOMATION_TOKEN= ]]; then
      echo "INTERNAL_AUTOMATION_TOKEN=$NEW_INTERNAL_TOKEN" >> "$temp_file"
    else
      echo "$line" >> "$temp_file"
    fi
  done < "$ENV_FILE"
  
  # Replace original file
  mv "$temp_file" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  
  log_success "Updated $ENV_FILE"
}

# Verify secrets are set
verify_secrets() {
  log_info "Verifying new secrets..."
  
  # Source the env file to check
  export $(grep -v '^#' "$ENV_FILE" | xargs)
  
  if [ -z "$JWT_SECRET" ] || [ -z "$REFRESH_TOKEN_SECRET" ] || [ -z "$INTERNAL_AUTOMATION_TOKEN" ]; then
    log_error "One or more secrets are not set correctly"
    exit 1
  fi
  
  # Verify minimum lengths
  if [ ${#JWT_SECRET} -lt 32 ]; then
    log_error "JWT_SECRET must be at least 32 characters"
    exit 1
  fi
  
  if [ ${#REFRESH_TOKEN_SECRET} -lt 32 ]; then
    log_error "REFRESH_TOKEN_SECRET must be at least 32 characters"
    exit 1
  fi
  
  if [ ${#INTERNAL_AUTOMATION_TOKEN} -lt 32 ]; then
    log_error "INTERNAL_AUTOMATION_TOKEN must be at least 32 characters"
    exit 1
  fi
  
  log_success "All secrets verified"
}

# Confirm rotation
confirm_rotation() {
  if [ "$FORCE" = true ]; then
    return
  fi
  
  echo ""
  log_warning "WARNING: This will invalidate all active sessions!"
  echo ""
  echo "All users will need to log in again."
  echo "All automation tokens will need to be updated."
  echo ""
  read -p "Are you sure you want to proceed? (yes/no): " confirm
  
  if [ "$confirm" != "yes" ]; then
    log_info "Rotation cancelled"
    exit 0
  fi
}

# Main execution
main() {
  echo "=============================================="
  echo "  JWT Secret Rotation Script"
  echo "=============================================="
  echo ""
  
  # Check environment file
  check_env_file
  
  # Show current state
  log_info "Current environment file: $ENV_FILE"
  
  # Backup if requested
  if [ "$BACKUP" = true ]; then
    backup_secrets
  fi
  
  # Confirm before proceeding
  confirm_rotation
  
  # Generate new secrets
  generate_new_secrets
  
  # Update environment file
  update_env_file
  
  # Verify
  if [ "$DRY_RUN" = false ]; then
    verify_secrets
  fi
  
  echo ""
  echo "=============================================="
  echo "  Rotation Complete"
  echo "=============================================="
  echo ""
  
  if [ "$DRY_RUN" = false ]; then
    log_success "JWT secrets have been rotated"
    echo ""
    echo "Next steps:"
    echo "  1. Restart all services to pick up new secrets"
    echo "  2. Update secrets in AWS Secrets Manager (if used)"
    echo "  3. Update CI/CD pipeline secrets"
    echo "  4. Notify users that they need to log in again"
    echo "  5. Update any automation scripts using INTERNAL_AUTOMATION_TOKEN"
    echo ""
    log_warning "Keep the backup file secure until you confirm everything works!"
  else
    log_info "This was a dry run. No changes were made."
    echo ""
    echo "To perform actual rotation, run without --dry-run"
  fi
}

# Run main function
main
