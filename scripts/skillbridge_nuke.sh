#!/usr/bin/env bash
set -euo pipefail

# ========================================
# SkillBridge SOC-Style Cloud Control Console
# Animated Parallel Cloud Cleanup with Rail Log
# ========================================

PROJECT_NAME="${PROJECT_NAME:-skillbridge}"
ENVIRONMENT="${1:-}"
AWS_REGION="${2:-us-east-1}"
MAX_PARALLEL=5
LOG_FILE="skillbridge-soc-$(date +%s).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# ---------------------------
# Logging
# ---------------------------
RAIL_LOG=()
log_rail() {
    local msg="$1"
    # keep last 3 messages
    RAIL_LOG+=("$msg")
    if [ "${#RAIL_LOG[@]}" -gt 3 ]; then
        RAIL_LOG=("${RAIL_LOG[@]: -3}")
    fi
    local row=$(tput lines)
    for i in "${!RAIL_LOG[@]}"; do
        tput cup $((row-3+i)) 0
        tput el
        echo -e "${RAIL_LOG[$i]}"
    done
}

# ---------------------------
# Validate environment and deps
# ---------------------------
if [[ -z "$ENVIRONMENT" ]] || [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo -e "${RED}ERROR: Environment must be dev|staging|prod${NC}"
    exit 1
fi

for dep in aws jq xargs tput; do
    command -v "$dep" >/dev/null || { echo -e "${RED}Missing dependency: $dep${NC}"; exit 1; }
done

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --region "$AWS_REGION")
log_rail "Connected to AWS account: $ACCOUNT_ID"

if [[ "$ENVIRONMENT" == "prod" ]]; then
    read -p "${RED}Type DESTROY to confirm production deletion: ${NC}" CONFIRM
    [[ "$CONFIRM" != "DESTROY" ]] && { log_rail "Cancelled"; exit 1; }
fi

# ---------------------------
# Retry wrapper
# ---------------------------
retry() {
    local retries=3 count=0
    until "$@"; do
        count=$((count+1))
        [[ $count -ge $retries ]] && { log_rail "Command failed: $*"; return 1; }
        log_rail "${YELLOW}Retrying ($count/$retries)...${NC}"
        sleep 1
    done
}

# ---------------------------
# Dashboard helpers
# ---------------------------
declare -A PROGRESS STATUS
RESOURCE_TYPES=("S3" "Lambda" "DynamoDB" "VPC")
for type in "${RESOURCE_TYPES[@]}"; do
    PROGRESS[$type]=0
    STATUS[$type]="Pending"
done

draw_dashboard() {
    tput civis
    clear
    echo -e "${CYAN}================ SkillBridge SOC Cloud Destroy Dashboard ================${NC}"
    echo -e "Environment: ${ENVIRONMENT} | Region: ${AWS_REGION} | Account: ${ACCOUNT_ID}"
    echo
    for type in "${RESOURCE_TYPES[@]}"; do
        printf "%-15s : [%-50s] %3d%% %s\n" "$type" "$(printf '#%.0s' $(seq 1 $((PROGRESS[$type]/2))))" "${PROGRESS[$type]}" "${STATUS[$type]}"
    done
}

update_progress() {
    local type="$1"
    local percent="$2"
    local status="$3"
    PROGRESS[$type]=$percent
    STATUS[$type]="$status"
    draw_dashboard
}

# ---------------------------
# S3 Cleanup
# ---------------------------
cleanup_s3() {
    local buckets
    read -r -a buckets <<< "$(aws s3api list-buckets \
        --query "Buckets[?contains(Name,'${PROJECT_NAME}-${ENVIRONMENT}')].Name" \
        --output text --region "$AWS_REGION" || true)"
    local total=${#buckets[@]}
    local idx=0
    for bucket in "${buckets[@]}"; do
        idx=$((idx+1))
        update_progress "S3" $((idx*100/total)) "Deleting"
        log_rail "Purging bucket $bucket"
        retry bash -c "
            aws s3api list-object-versions --bucket '$bucket' --region '$AWS_REGION' --output json | \
            jq -r '.Versions[]? | \"\(.Key) \(.VersionId)\"' | \
            while read -r key version; do
                aws s3api delete-object --bucket '$bucket' --key \"\$key\" --version-id \"\$version\" --region '$AWS_REGION'
            done
            aws s3api list-object-versions --bucket '$bucket' --region '$AWS_REGION' --output json | \
            jq -r '.DeleteMarkers[]? | \"\(.Key) \(.VersionId)\"' | \
            while read -r key version; do
                aws s3api delete-object --bucket '$bucket' --key \"\$key\" --version-id \"\$version\" --region '$AWS_REGION'
            done
            aws s3api delete-bucket --bucket '$bucket' --region '$AWS_REGION'
        "
    done
    update_progress "S3" 100 "✓ Completed"
}

# ---------------------------
# Lambda Cleanup
# ---------------------------
cleanup_lambda() {
    local funcs
    read -r -a funcs <<< "$(aws lambda list-functions --region "$AWS_REGION" \
        --query "Functions[?contains(FunctionName,'${PROJECT_NAME}-${ENVIRONMENT}')].FunctionName" --output text || true)"
    local total=${#funcs[@]}
    local idx=0
    for f in "${funcs[@]}"; do
        idx=$((idx+1))
        update_progress "Lambda" $((idx*100/total)) "Deleting"
        retry aws lambda delete-function --function-name "$f" --region "$AWS_REGION"
        log_rail "Deleted Lambda $f"
    done
    update_progress "Lambda" 100 "✓ Completed"
}

# ---------------------------
# DynamoDB Cleanup
# ---------------------------
cleanup_dynamodb() {
    local tables
    read -r -a tables <<< "$(aws dynamodb list-tables --region "$AWS_REGION" \
        --query "TableNames[?contains(@,'${PROJECT_NAME}-${ENVIRONMENT}')]" --output text || true)"
    local total=${#tables[@]}
    local idx=0
    for t in "${tables[@]}"; do
        idx=$((idx+1))
        update_progress "DynamoDB" $((idx*100/total)) "Deleting"
        retry aws dynamodb delete-table --table-name "$t" --region "$AWS_REGION"
        log_rail "Deleted Table $t"
    done
    update_progress "DynamoDB" 100 "✓ Completed"
}

# ---------------------------
# VPC Cleanup with full dependency resolution
# ---------------------------
cleanup_vpc() {
    local vpcs
    read -r -a vpcs <<< "$(aws ec2 describe-vpcs --region "$AWS_REGION" \
        --filters "Name=tag:Name,Values=${PROJECT_NAME}-${ENVIRONMENT}-vpc" \
        --query 'Vpcs[].VpcId' --output text || true)"
    local total=${#vpcs[@]}
    local idx=0
    for vpc in "${vpcs[@]}"; do
        idx=$((idx+1))
        update_progress "VPC" $((idx*100/total)) "Deleting"
        log_rail "Processing VPC $vpc"

        # Delete NAT gateways
        local nat_ids
        read -r -a nat_ids <<< "$(aws ec2 describe-nat-gateways --filter Name=vpc-id,Values=$vpc --query 'NatGateways[].NatGatewayId' --output text)"
        for nat in "${nat_ids[@]}"; do
            retry aws ec2 delete-nat-gateway --nat-gateway-id "$nat" --region "$AWS_REGION"
        done

        # Delete subnets
        local subnets
        read -r -a subnets <<< "$(aws ec2 describe-subnets --filters Name=vpc-id,Values=$vpc --query 'Subnets[].SubnetId' --output text)"
        for s in "${subnets[@]}"; do
            retry aws ec2 delete-subnet --subnet-id "$s" --region "$AWS_REGION"
        done

        # Delete non-main route tables
        local rts
        read -r -a rts <<< "$(aws ec2 describe-route-tables --filters Name=vpc-id,Values=$vpc --query 'RouteTables[?Associations[?Main==`false`]].RouteTableId' --output text)"
        for rt in "${rts[@]}"; do
            retry aws ec2 delete-route-table --route-table-id "$rt" --region "$AWS_REGION"
        done

        # Delete IGWs
        local igws
        read -r -a igws <<< "$(aws ec2 describe-internet-gateways --filters Name=attachment.vpc-id,Values=$vpc --query 'InternetGateways[].InternetGatewayId' --output text)"
        for igw in "${igws[@]}"; do
            aws ec2 detach-internet-gateway --internet-gateway-id "$igw" --vpc-id "$vpc" --region "$AWS_REGION"
            retry aws ec2 delete-internet-gateway --internet-gateway-id "$igw" --region "$AWS_REGION"
        done

        # Delete non-default security groups
        local sgs
        read -r -a sgs <<< "$(aws ec2 describe-security-groups --filters Name=vpc-id,Values=$vpc --query 'SecurityGroups[?GroupName!=`default`].GroupId' --output text)"
        for sg in "${sgs[@]}"; do
            retry aws ec2 delete-security-group --group-id "$sg" --region "$AWS_REGION"
        done

        # Delete VPC
        retry aws ec2 delete-vpc --vpc-id "$vpc" --region "$AWS_REGION"
        log_rail "✓ VPC $vpc deleted"
    done
    update_progress "VPC" 100 "✓ Completed"
}

# ---------------------------
# Residue Scan
# ---------------------------
residue_scan() {
    local s3 lambdas tables
    s3=$(aws s3api list-buckets --region "$AWS_REGION" --query "Buckets[?contains(Name,'${PROJECT_NAME}-${ENVIRONMENT}')].Name" --output text)
    lambdas=$(aws lambda list-functions --region "$AWS_REGION" --query "Functions[?contains(FunctionName,'${PROJECT_NAME}-${ENVIRONMENT}')].FunctionName" --output text)
    tables=$(aws dynamodb list-tables --region "$AWS_REGION" --query "TableNames[?contains(@,'${PROJECT_NAME}-${ENVIRONMENT}')]" --output text)
    if [[ -z "$s3" && -z "$lambdas" && -z "$tables" ]]; then
        log_rail "${GREEN}✓ FULL CLOUD CLEANUP SUCCESSFUL${NC}"
    else
        log_rail "${RED}Residual resources detected!${NC}"
    fi
}

# ---------------------------
# MAIN EXECUTION
# ---------------------------
main() {
    draw_dashboard
    cleanup_s3 &
    cleanup_lambda &
    cleanup_dynamodb &
    cleanup_vpc &
    wait
    residue_scan
    tput cnorm
    log_rail "${GREEN}Destroy process completed.${NC}"
}

main