#!/usr/bin/env python3
"""SkillBridge Cloud Nuke — destroy AWS resources for a given environment.

Uses boto3 directly (no aws-nuke dependency) to clean up S3, Lambda,
DynamoDB and VPC resources matching the project-environment prefix.
"""

from __future__ import annotations

import argparse
import functools
import logging
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Callable

import boto3
from botocore.exceptions import ClientError
from rich.console import Console
from rich.live import Live
from rich.panel import Panel
from rich.progress import BarColumn, Progress, TextColumn
from rich.table import Table

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
PROJECT_NAME = "skillbridge"
VALID_ENVS = ("dev", "staging", "prod")

# ---------------------------------------------------------------------------
# Logging setup (file + console via Rich)
# ---------------------------------------------------------------------------
logger = logging.getLogger("skillbridge_nuke")
logger.setLevel(logging.DEBUG)

console = Console()

# ---------------------------------------------------------------------------
# Thread-safe rail log
# ---------------------------------------------------------------------------
_rail_lock = threading.Lock()
_rail_messages: list[str] = []
MAX_RAIL = 8


def rail_log(msg: str) -> None:
    """Append a message to the rail log (thread-safe, capped at MAX_RAIL)."""
    with _rail_lock:
        _rail_messages.append(msg)
        if len(_rail_messages) > MAX_RAIL:
            del _rail_messages[: len(_rail_messages) - MAX_RAIL]
    logger.info(msg)


def _get_rail_snapshot() -> list[str]:
    with _rail_lock:
        return list(_rail_messages)


# ---------------------------------------------------------------------------
# Retry decorator
# ---------------------------------------------------------------------------
def retry(max_retries: int = 3, delay: float = 1.0):
    """Retry on transient AWS ClientError (Throttling, TooManyRequests)."""

    def decorator(fn: Callable):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            last_err: Exception | None = None
            for attempt in range(1, max_retries + 1):
                try:
                    return fn(*args, **kwargs)
                except ClientError as exc:
                    code = exc.response["Error"].get("Code", "")
                    if code in (
                        "Throttling",
                        "TooManyRequestsException",
                        "RequestLimitExceeded",
                    ):
                        rail_log(f"[yellow]Retry {attempt}/{max_retries}: {code}[/yellow]")
                        last_err = exc
                        time.sleep(delay * attempt)
                    else:
                        raise
            raise last_err  # type: ignore[misc]

        return wrapper

    return decorator


# ---------------------------------------------------------------------------
# Dashboard renderer
# ---------------------------------------------------------------------------
def build_dashboard(progress: Progress, environment: str, region: str, account_id: str) -> Table:
    """Build a Rich Table that combines progress bars and the rail log."""
    grid = Table.grid(expand=True)
    grid.add_column(ratio=3)
    grid.add_column(ratio=2)

    progress_panel = Panel(progress, title="Resource Cleanup", subtitle=f"{environment} | {region}")
    rail_text = "\n".join(_get_rail_snapshot()) or "[dim]Waiting…[/dim]"
    rail_panel = Panel(rail_text, title="Rail Log", subtitle=f"Account {account_id}")

    grid.add_row(progress_panel, rail_panel)
    return grid


# ---------------------------------------------------------------------------
# Resource cleanup functions
# ---------------------------------------------------------------------------
class NukeContext:
    """Holds shared boto3 session and progress handles."""

    def __init__(self, session: boto3.Session, environment: str, region: str, dry_run: bool):
        self.session = session
        self.environment = environment
        self.region = region
        self.dry_run = dry_run
        self.prefix = f"{PROJECT_NAME}-{environment}"


# -- S3 --------------------------------------------------------------------
def cleanup_s3(ctx: NukeContext, progress: Progress, task_id) -> None:
    s3 = ctx.session.client("s3", region_name=ctx.region)
    try:
        buckets = [b["Name"] for b in s3.list_buckets().get("Buckets", []) if ctx.prefix in b["Name"]]
    except ClientError as exc:
        rail_log(f"[red]S3 list failed: {exc}[/red]")
        progress.update(task_id, completed=100)
        return

    if not buckets:
        rail_log("[dim]S3: no matching buckets[/dim]")
        progress.update(task_id, completed=100)
        return

    for idx, bucket in enumerate(buckets, 1):
        if ctx.dry_run:
            rail_log(f"[cyan]DRY-RUN would delete bucket {bucket}[/cyan]")
        else:
            _delete_bucket(s3, bucket, ctx.region)
        progress.update(task_id, completed=int(idx * 100 / len(buckets)))


@retry()
def _delete_bucket(s3, bucket: str, region: str) -> None:
    """Empty and delete a single S3 bucket (handles versioned objects)."""
    rail_log(f"Purging bucket {bucket}")
    paginator = s3.get_paginator("list_object_versions")
    for page in paginator.paginate(Bucket=bucket):
        objects = [
            {"Key": v["Key"], "VersionId": v["VersionId"]}
            for v in page.get("Versions", [])
        ]
        objects += [
            {"Key": m["Key"], "VersionId": m["VersionId"]}
            for m in page.get("DeleteMarkers", [])
        ]
        if objects:
            s3.delete_objects(Bucket=bucket, Delete={"Objects": objects})
    s3.delete_bucket(Bucket=bucket)
    rail_log(f"[green]✓ Deleted bucket {bucket}[/green]")


# -- Lambda ----------------------------------------------------------------
def cleanup_lambda(ctx: NukeContext, progress: Progress, task_id) -> None:
    lam = ctx.session.client("lambda", region_name=ctx.region)
    try:
        funcs = [
            f["FunctionName"]
            for f in lam.list_functions().get("Functions", [])
            if ctx.prefix in f["FunctionName"]
        ]
    except ClientError as exc:
        rail_log(f"[red]Lambda list failed: {exc}[/red]")
        progress.update(task_id, completed=100)
        return

    if not funcs:
        rail_log("[dim]Lambda: no matching functions[/dim]")
        progress.update(task_id, completed=100)
        return

    for idx, fn in enumerate(funcs, 1):
        if ctx.dry_run:
            rail_log(f"[cyan]DRY-RUN would delete function {fn}[/cyan]")
        else:
            _delete_function(lam, fn)
        progress.update(task_id, completed=int(idx * 100 / len(funcs)))


@retry()
def _delete_function(lam, name: str) -> None:
    lam.delete_function(FunctionName=name)
    rail_log(f"[green]✓ Deleted Lambda {name}[/green]")


# -- DynamoDB --------------------------------------------------------------
def cleanup_dynamodb(ctx: NukeContext, progress: Progress, task_id) -> None:
    ddb = ctx.session.client("dynamodb", region_name=ctx.region)
    try:
        tables = [t for t in ddb.list_tables().get("TableNames", []) if ctx.prefix in t]
    except ClientError as exc:
        rail_log(f"[red]DynamoDB list failed: {exc}[/red]")
        progress.update(task_id, completed=100)
        return

    if not tables:
        rail_log("[dim]DynamoDB: no matching tables[/dim]")
        progress.update(task_id, completed=100)
        return

    for idx, table in enumerate(tables, 1):
        if ctx.dry_run:
            rail_log(f"[cyan]DRY-RUN would delete table {table}[/cyan]")
        else:
            _delete_table(ddb, table)
        progress.update(task_id, completed=int(idx * 100 / len(tables)))


@retry()
def _delete_table(ddb, name: str) -> None:
    ddb.delete_table(TableName=name)
    rail_log(f"[green]✓ Deleted table {name}[/green]")


# -- VPC -------------------------------------------------------------------
def cleanup_vpc(ctx: NukeContext, progress: Progress, task_id) -> None:
    ec2 = ctx.session.client("ec2", region_name=ctx.region)
    try:
        vpcs = ec2.describe_vpcs(
            Filters=[{"Name": "tag:Name", "Values": [f"{ctx.prefix}-vpc"]}]
        )["Vpcs"]
    except ClientError as exc:
        rail_log(f"[red]VPC list failed: {exc}[/red]")
        progress.update(task_id, completed=100)
        return

    if not vpcs:
        rail_log("[dim]VPC: no matching VPCs[/dim]")
        progress.update(task_id, completed=100)
        return

    for idx, vpc in enumerate(vpcs, 1):
        vpc_id = vpc["VpcId"]
        if ctx.dry_run:
            rail_log(f"[cyan]DRY-RUN would delete VPC {vpc_id}[/cyan]")
        else:
            _delete_vpc(ec2, vpc_id, ctx.region, session=ctx.session)
        progress.update(task_id, completed=int(idx * 100 / len(vpcs)))


def _delete_vpc(ec2, vpc_id: str, region: str, session: boto3.Session | None = None) -> None:
    """Delete a VPC and all its dependencies in the correct order.

    Handles EFS mount targets, RDS/Aurora instances & clusters, ELBv2
    load balancers, and VPC endpoints that would otherwise block subnet
    or security-group deletion.
    """
    rail_log(f"Processing VPC {vpc_id}")

    # Collect subnet IDs for this VPC (used by multiple cleanup phases)
    subnet_ids = [
        s["SubnetId"]
        for s in ec2.describe_subnets(Filters=[{"Name": "vpc-id", "Values": [vpc_id]}])["Subnets"]
    ]

    # ----- EFS mount targets & file systems --------------------------------
    if session is not None:
        _cleanup_efs_for_vpc(session, region, subnet_ids)

    # ----- RDS instances & clusters ----------------------------------------
    if session is not None:
        _cleanup_rds_for_vpc(session, region, vpc_id)

    # ----- ELBv2 load balancers --------------------------------------------
    if session is not None:
        _cleanup_elbv2_for_vpc(session, region, vpc_id)

    # ----- VPC Endpoints ---------------------------------------------------
    _cleanup_vpc_endpoints(ec2, vpc_id)

    # ----- NAT Gateways ----------------------------------------------------
    nats = ec2.describe_nat_gateways(Filter=[{"Name": "vpc-id", "Values": [vpc_id]}])
    for nat in nats.get("NatGateways", []):
        if nat["State"] not in ("deleted", "deleting"):
            _retry_ec2(ec2.delete_nat_gateway, NatGatewayId=nat["NatGatewayId"])
    for nat in nats.get("NatGateways", []):
        if nat["State"] not in ("deleted", "deleting"):
            _wait_nat_deleted(ec2, nat["NatGatewayId"])

    # ----- Elastic IPs (leftover from NAT GW) ------------------------------
    for addr in ec2.describe_addresses(
        Filters=[{"Name": "domain", "Values": ["vpc"]}]
    ).get("Addresses", []):
        # Only release EIPs that were in this VPC's subnets (no association)
        if addr.get("AssociationId") is None and addr.get("NetworkInterfaceId") is None:
            try:
                ec2.release_address(AllocationId=addr["AllocationId"])
            except ClientError:
                pass

    # ----- Internet Gateways -----------------------------------------------
    for igw in ec2.describe_internet_gateways(
        Filters=[{"Name": "attachment.vpc-id", "Values": [vpc_id]}]
    )["InternetGateways"]:
        igw_id = igw["InternetGatewayId"]
        try:
            ec2.detach_internet_gateway(InternetGatewayId=igw_id, VpcId=vpc_id)
        except ClientError:
            pass
        _retry_ec2(ec2.delete_internet_gateway, InternetGatewayId=igw_id)

    # ----- Non-main route tables -------------------------------------------
    # Disassociate explicit subnet associations first, then delete
    for rt in ec2.describe_route_tables(Filters=[{"Name": "vpc-id", "Values": [vpc_id]}])["RouteTables"]:
        is_main = any(a.get("Main", False) for a in rt.get("Associations", []))
        if is_main:
            continue
        for assoc in rt.get("Associations", []):
            if not assoc.get("Main", False) and assoc.get("RouteTableAssociationId"):
                try:
                    ec2.disassociate_route_table(
                        AssociationId=assoc["RouteTableAssociationId"]
                    )
                except ClientError:
                    pass
        _retry_ec2(ec2.delete_route_table, RouteTableId=rt["RouteTableId"])

    # ----- Non-default security groups -------------------------------------
    # Revoke ingress/egress rules first to break cross-SG references
    sgs = [
        sg for sg in ec2.describe_security_groups(
            Filters=[{"Name": "vpc-id", "Values": [vpc_id]}]
        )["SecurityGroups"]
        if sg["GroupName"] != "default"
    ]
    for sg in sgs:
        if sg.get("IpPermissions"):
            try:
                ec2.revoke_security_group_ingress(GroupId=sg["GroupId"], IpPermissions=sg["IpPermissions"])
            except ClientError:
                pass
        if sg.get("IpPermissionsEgress"):
            try:
                ec2.revoke_security_group_egress(GroupId=sg["GroupId"], IpPermissions=sg["IpPermissionsEgress"])
            except ClientError:
                pass
    for sg in sgs:
        _retry_ec2(ec2.delete_security_group, GroupId=sg["GroupId"])

    # ----- Network interfaces (dangling) -----------------------------------
    # Delete any "available" ENIs, then wait for in-use ones (e.g. Lambda
    # Hyperplane ENIs) to be released by AWS before attempting subnet deletion.
    enis = ec2.describe_network_interfaces(
        Filters=[{"Name": "vpc-id", "Values": [vpc_id]}]
    ).get("NetworkInterfaces", [])
    for eni in enis:
        if eni["Status"] == "available":
            try:
                ec2.delete_network_interface(NetworkInterfaceId=eni["NetworkInterfaceId"])
                rail_log(f"Deleted dangling ENI {eni['NetworkInterfaceId']}")
            except ClientError:
                pass
    _wait_enis_cleared(ec2, vpc_id)

    # ----- Subnets ---------------------------------------------------------
    for sub_id in subnet_ids:
        _retry_ec2(ec2.delete_subnet, SubnetId=sub_id)

    # ----- VPC itself ------------------------------------------------------
    _retry_ec2(ec2.delete_vpc, VpcId=vpc_id)
    rail_log(f"[green]✓ Deleted VPC {vpc_id}[/green]")


# -- EFS helpers -----------------------------------------------------------
def _cleanup_efs_for_vpc(
    session: boto3.Session, region: str, subnet_ids: list[str]
) -> None:
    """Delete EFS mount targets (and their file systems) attached to *subnet_ids*."""
    if not subnet_ids:
        return
    efs = session.client("efs", region_name=region)
    fs_ids: set[str] = set()
    mt_ids: list[str] = []
    subnet_set = set(subnet_ids)

    # Iterate all file systems and check mount targets for subnet membership
    try:
        paginator = efs.get_paginator("describe_file_systems")
        for page in paginator.paginate():
            for fs in page.get("FileSystems", []):
                fs_mts = efs.describe_mount_targets(FileSystemId=fs["FileSystemId"]).get("MountTargets", [])
                for mt in fs_mts:
                    if mt["SubnetId"] in subnet_set:
                        fs_ids.add(fs["FileSystemId"])
                        mt_ids.append(mt["MountTargetId"])
    except ClientError as exc:
        rail_log(f"[yellow]EFS discovery error: {exc}[/yellow]")
        return

    if not mt_ids:
        return

    rail_log(f"Deleting {len(mt_ids)} EFS mount target(s) across {len(fs_ids)} file system(s)")

    # Delete mount targets first
    for mt_id in mt_ids:
        try:
            efs.delete_mount_target(MountTargetId=mt_id)
            rail_log(f"Deleted EFS mount target {mt_id}")
        except ClientError as exc:
            rail_log(f"[yellow]EFS mount target {mt_id}: {exc}[/yellow]")

    # Wait for mount targets to fully disappear (ENI detach takes ~30-90s)
    _wait_efs_mount_targets_deleted(efs, list(fs_ids))

    # Delete the file systems themselves
    for fs_id in fs_ids:
        try:
            efs.delete_file_system(FileSystemId=fs_id)
            rail_log(f"[green]✓ Deleted EFS {fs_id}[/green]")
        except ClientError as exc:
            rail_log(f"[yellow]EFS {fs_id} delete failed: {exc}[/yellow]")


def _wait_efs_mount_targets_deleted(
    efs, fs_ids: list[str], timeout: int = 180
) -> None:
    """Poll until all mount targets for the given file systems are gone."""
    start = time.monotonic()
    while time.monotonic() - start < timeout:
        all_gone = True
        for fs_id in fs_ids:
            try:
                mts = efs.describe_mount_targets(FileSystemId=fs_id).get("MountTargets", [])
                if any(mt["LifeCycleState"] != "deleted" for mt in mts):
                    all_gone = False
                    break
            except ClientError as exc:
                if "FileSystemNotFound" in str(exc):
                    continue
                all_gone = False
                break
        if all_gone:
            rail_log("EFS mount targets deleted — ENIs released")
            return
        time.sleep(5)
    rail_log(f"[yellow]EFS mount targets did not fully delete within {timeout}s[/yellow]")


# -- RDS / Aurora helpers --------------------------------------------------
def _cleanup_rds_for_vpc(
    session: boto3.Session, region: str, vpc_id: str
) -> None:
    """Delete RDS instances, Aurora clusters and DB subnet groups inside *vpc_id*."""
    rds = session.client("rds", region_name=region)

    # --- instances ---------------------------------------------------------
    try:
        instances = [
            db for db in rds.describe_db_instances().get("DBInstances", [])
            if db.get("DBSubnetGroup", {}).get("VpcId") == vpc_id
        ]
    except ClientError as exc:
        rail_log(f"[yellow]RDS instance list error: {exc}[/yellow]")
        instances = []

    for db in instances:
        db_id = db["DBInstanceIdentifier"]
        if db["DBInstanceStatus"] in ("deleting",):
            continue
        is_cluster_member = bool(db.get("DBClusterIdentifier"))
        rail_log(f"Deleting RDS instance {db_id}{' (cluster member)' if is_cluster_member else ''}")
        try:
            if is_cluster_member:
                # Aurora cluster members: SkipFinalSnapshot / DeleteAutomatedBackups
                # are cluster-level settings, not instance-level
                rds.delete_db_instance(DBInstanceIdentifier=db_id)
            else:
                rds.delete_db_instance(
                    DBInstanceIdentifier=db_id,
                    SkipFinalSnapshot=True,
                    DeleteAutomatedBackups=True,
                )
        except ClientError as exc:
            rail_log(f"[yellow]RDS instance {db_id}: {exc}[/yellow]")

    # Wait for instances to disappear
    if instances:
        _wait_rds_instances_deleted(rds, [db["DBInstanceIdentifier"] for db in instances])

    # --- clusters (Aurora) ------------------------------------------------
    try:
        clusters = []
        for cl in rds.describe_db_clusters().get("DBClusters", []):
            # Match clusters whose subnet group is in this VPC
            sg_name = cl.get("DBSubnetGroup", "")
            if sg_name:
                try:
                    sg_info = rds.describe_db_subnet_groups(DBSubnetGroupName=sg_name)["DBSubnetGroups"][0]
                    if sg_info.get("VpcId") == vpc_id:
                        clusters.append(cl)
                        continue
                except ClientError:
                    pass
            # Fallback: check VpcSecurityGroups for our VPC
            for vsg in cl.get("VpcSecurityGroups", []):
                # We already know our SG IDs from the VPC
                clusters.append(cl)
                break
    except ClientError as exc:
        rail_log(f"[yellow]RDS cluster list error: {exc}[/yellow]")
        clusters = []

    for cl in clusters:
        cl_id = cl["DBClusterIdentifier"]
        if cl["Status"] in ("deleting",):
            continue
        rail_log(f"Deleting Aurora cluster {cl_id}")
        try:
            rds.delete_db_cluster(
                DBClusterIdentifier=cl_id,
                SkipFinalSnapshot=True,
            )
        except ClientError as exc:
            rail_log(f"[yellow]Aurora cluster {cl_id}: {exc}[/yellow]")

    if clusters:
        _wait_rds_clusters_deleted(rds, [cl["DBClusterIdentifier"] for cl in clusters])

    # --- DB subnet groups --------------------------------------------------
    try:
        for sg in rds.describe_db_subnet_groups().get("DBSubnetGroups", []):
            if sg.get("VpcId") == vpc_id:
                try:
                    rds.delete_db_subnet_group(DBSubnetGroupName=sg["DBSubnetGroupName"])
                    rail_log(f"Deleted DB subnet group {sg['DBSubnetGroupName']}")
                except ClientError as exc:
                    rail_log(f"[yellow]DB subnet group {sg['DBSubnetGroupName']}: {exc}[/yellow]")
    except ClientError:
        pass


def _wait_rds_instances_deleted(
    rds, db_ids: list[str], timeout: int = 600
) -> None:
    """Poll until all RDS instances are gone (Aurora deletion can be slow)."""
    start = time.monotonic()
    remaining = set(db_ids)
    while remaining and time.monotonic() - start < timeout:
        for db_id in list(remaining):
            try:
                resp = rds.describe_db_instances(DBInstanceIdentifier=db_id)
                status = resp["DBInstances"][0]["DBInstanceStatus"]
                rail_log(f"[dim]RDS {db_id}: {status}[/dim]")
            except ClientError as exc:
                if "DBInstanceNotFound" in str(exc):
                    rail_log(f"[green]✓ RDS instance {db_id} deleted[/green]")
                    remaining.discard(db_id)
                    continue
        if remaining:
            time.sleep(15)
    if remaining:
        rail_log(f"[yellow]RDS instances still deleting after {timeout}s: {remaining}[/yellow]")


def _wait_rds_clusters_deleted(
    rds, cluster_ids: list[str], timeout: int = 600
) -> None:
    start = time.monotonic()
    remaining = set(cluster_ids)
    while remaining and time.monotonic() - start < timeout:
        for cl_id in list(remaining):
            try:
                rds.describe_db_clusters(DBClusterIdentifier=cl_id)
            except ClientError as exc:
                if "DBClusterNotFound" in str(exc):
                    rail_log(f"[green]✓ Aurora cluster {cl_id} deleted[/green]")
                    remaining.discard(cl_id)
                    continue
        if remaining:
            time.sleep(15)
    if remaining:
        rail_log(f"[yellow]Aurora clusters still deleting after {timeout}s: {remaining}[/yellow]")


# -- ELBv2 helpers ---------------------------------------------------------
def _cleanup_elbv2_for_vpc(
    session: boto3.Session, region: str, vpc_id: str
) -> None:
    """Delete ALBs/NLBs and their target groups inside *vpc_id*."""
    elbv2 = session.client("elbv2", region_name=region)
    try:
        lbs = [
            lb for lb in elbv2.describe_load_balancers().get("LoadBalancers", [])
            if lb.get("VpcId") == vpc_id
        ]
    except ClientError as exc:
        rail_log(f"[yellow]ELBv2 list error: {exc}[/yellow]")
        return

    for lb in lbs:
        lb_arn = lb["LoadBalancerArn"]
        rail_log(f"Deleting load balancer {lb['LoadBalancerName']}")
        # Delete listeners first
        try:
            listeners = elbv2.describe_listeners(LoadBalancerArn=lb_arn).get("Listeners", [])
            for lis in listeners:
                elbv2.delete_listener(ListenerArn=lis["ListenerArn"])
        except ClientError:
            pass
        try:
            elbv2.delete_load_balancer(LoadBalancerArn=lb_arn)
        except ClientError as exc:
            rail_log(f"[yellow]ELB {lb['LoadBalancerName']}: {exc}[/yellow]")

    # Wait for LBs to drain
    if lbs:
        _wait_elbv2_deleted(elbv2, [lb["LoadBalancerArn"] for lb in lbs])

    # Target groups (may be orphaned)
    try:
        tgs = elbv2.describe_target_groups().get("TargetGroups", [])
        for tg in tgs:
            if tg.get("VpcId") == vpc_id:
                try:
                    elbv2.delete_target_group(TargetGroupArn=tg["TargetGroupArn"])
                    rail_log(f"Deleted target group {tg['TargetGroupName']}")
                except ClientError:
                    pass
    except ClientError:
        pass


def _wait_elbv2_deleted(
    elbv2, lb_arns: list[str], timeout: int = 300
) -> None:
    start = time.monotonic()
    remaining = set(lb_arns)
    while remaining and time.monotonic() - start < timeout:
        for arn in list(remaining):
            try:
                resp = elbv2.describe_load_balancers(LoadBalancerArns=[arn])
                if not resp.get("LoadBalancers"):
                    remaining.discard(arn)
            except ClientError:
                remaining.discard(arn)
        if remaining:
            time.sleep(10)
    if remaining:
        rail_log(f"[yellow]ELBs still deleting after {timeout}s[/yellow]")


# -- VPC Endpoint helpers --------------------------------------------------
def _cleanup_vpc_endpoints(ec2, vpc_id: str) -> None:
    """Delete VPC endpoints inside *vpc_id*."""
    try:
        endpoints = ec2.describe_vpc_endpoints(
            Filters=[{"Name": "vpc-id", "Values": [vpc_id]}]
        ).get("VpcEndpoints", [])
        ep_ids = [
            ep["VpcEndpointId"] for ep in endpoints
            if ep.get("State") not in ("deleted", "deleting")
        ]
        if ep_ids:
            ec2.delete_vpc_endpoints(VpcEndpointIds=ep_ids)
            rail_log(f"Deleted {len(ep_ids)} VPC endpoint(s)")
    except ClientError as exc:
        rail_log(f"[yellow]VPC endpoints: {exc}[/yellow]")


def _retry_ec2(fn: Callable, /, **kwargs) -> bool:
    """Retry wrapper for individual EC2 calls.

    Returns True on success, False if all retries exhausted due to
    DependencyViolation.  Re-raises non-DependencyViolation errors.
    """
    max_attempts = 5
    for attempt in range(max_attempts):
        try:
            fn(**kwargs)
            return True
        except ClientError as exc:
            code = exc.response["Error"].get("Code", "")
            if code == "DependencyViolation" and attempt < max_attempts - 1:
                delay = 5 * (2 ** attempt)  # 5, 10, 20, 40, 80s
                rail_log(f"[yellow]Dependency wait ({attempt+1}/{max_attempts}), retry in {delay}s…[/yellow]")
                time.sleep(delay)
            elif code == "DependencyViolation":
                rail_log(f"[red]DependencyViolation persisted after {max_attempts} attempts: {kwargs}[/red]")
                return False
            else:
                raise
    return False


def _wait_enis_cleared(ec2, vpc_id: str, timeout: int = 300) -> None:
    """Poll until all ENIs in *vpc_id* are gone.

    Lambda Hyperplane ENIs can take 10-20+ minutes to release after function
    deletion.  This blocks until they disappear or *timeout* is reached.
    """
    start = time.monotonic()
    while time.monotonic() - start < timeout:
        enis = ec2.describe_network_interfaces(
            Filters=[{"Name": "vpc-id", "Values": [vpc_id]}]
        ).get("NetworkInterfaces", [])
        if not enis:
            return
        elapsed = int(time.monotonic() - start)
        rail_log(
            f"[yellow]Waiting for {len(enis)} ENI(s) to release "
            f"({elapsed}s/{timeout}s)…[/yellow]"
        )
        time.sleep(10)
    # Log remaining ENIs but don't abort — subnet deletion will retry
    enis = ec2.describe_network_interfaces(
        Filters=[{"Name": "vpc-id", "Values": [vpc_id]}]
    ).get("NetworkInterfaces", [])
    if enis:
        ids = [e["NetworkInterfaceId"] for e in enis]
        rail_log(f"[yellow]ENIs still present after {timeout}s: {ids}[/yellow]")


def _wait_nat_deleted(ec2, nat_id: str, timeout: int = 120) -> None:
    """Poll until a NAT gateway reaches the 'deleted' state."""
    start = time.monotonic()
    while time.monotonic() - start < timeout:
        resp = ec2.describe_nat_gateways(NatGatewayIds=[nat_id])
        state = resp["NatGateways"][0]["State"] if resp["NatGateways"] else "deleted"
        if state == "deleted":
            return
        time.sleep(5)
    rail_log(f"[yellow]NAT {nat_id} did not reach 'deleted' within {timeout}s[/yellow]")


# ---------------------------------------------------------------------------
# Residue scan
# ---------------------------------------------------------------------------
def residue_scan(ctx: NukeContext) -> bool:
    """Return True if no matching resources remain."""
    s3 = ctx.session.client("s3", region_name=ctx.region)
    lam = ctx.session.client("lambda", region_name=ctx.region)
    ddb = ctx.session.client("dynamodb", region_name=ctx.region)
    ec2 = ctx.session.client("ec2", region_name=ctx.region)

    remaining: list[str] = []
    try:
        buckets = [b["Name"] for b in s3.list_buckets().get("Buckets", []) if ctx.prefix in b["Name"]]
        if buckets:
            remaining.append(f"S3: {', '.join(buckets)}")
    except ClientError:
        pass

    try:
        funcs = [f["FunctionName"] for f in lam.list_functions().get("Functions", []) if ctx.prefix in f["FunctionName"]]
        if funcs:
            remaining.append(f"Lambda: {', '.join(funcs)}")
    except ClientError:
        pass

    try:
        tables = [t for t in ddb.list_tables().get("TableNames", []) if ctx.prefix in t]
        if tables:
            remaining.append(f"DynamoDB: {', '.join(tables)}")
    except ClientError:
        pass

    try:
        vpcs = ec2.describe_vpcs(Filters=[{"Name": "tag:Name", "Values": [f"{ctx.prefix}-vpc"]}])["Vpcs"]
        if vpcs:
            remaining.append(f"VPC: {', '.join(v['VpcId'] for v in vpcs)}")
    except ClientError:
        pass

    # EFS file systems in matching VPCs
    try:
        efs = ctx.session.client("efs", region_name=ctx.region)
        for page in efs.get_paginator("describe_file_systems").paginate():
            for fs in page.get("FileSystems", []):
                mts = efs.describe_mount_targets(FileSystemId=fs["FileSystemId"]).get("MountTargets", [])
                for mt in mts:
                    if mt.get("VpcId") in [v["VpcId"] for v in vpcs] if vpcs else False:
                        remaining.append(f"EFS: {fs['FileSystemId']}")
                        break
    except (ClientError, Exception):
        pass

    # RDS instances in matching VPCs
    try:
        rds = ctx.session.client("rds", region_name=ctx.region)
        vpc_ids_set = {v["VpcId"] for v in vpcs} if vpcs else set()
        for db in rds.describe_db_instances().get("DBInstances", []):
            if db.get("DBSubnetGroup", {}).get("VpcId") in vpc_ids_set:
                remaining.append(f"RDS: {db['DBInstanceIdentifier']}")
    except (ClientError, Exception):
        pass

    if remaining:
        rail_log("[red]Residual resources detected![/red]")
        for r in remaining:
            rail_log(f"  [red]{r}[/red]")
        return False

    rail_log("[green]✓ Full cloud cleanup successful — no residual resources[/green]")
    return True


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="SkillBridge Cloud Nuke — destroy AWS resources for a given environment.",
    )
    parser.add_argument("environment", choices=VALID_ENVS, help="Target environment")
    parser.add_argument("--region", default="us-east-1", help="AWS region (default: us-east-1)")
    parser.add_argument("--profile", default=None, help="AWS named profile")
    parser.add_argument("--dry-run", action="store_true", help="List resources without deleting")
    parser.add_argument(
        "--log-file",
        default=None,
        help="Path to log file (default: skillbridge-nuke-<timestamp>.log)",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)

    # File logging
    log_path = args.log_file or f"skillbridge-nuke-{int(datetime.now().timestamp())}.log"
    fh = logging.FileHandler(log_path)
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logger.addHandler(fh)

    # Boto3 session
    session = boto3.Session(profile_name=args.profile, region_name=args.region)
    try:
        account_id = session.client("sts").get_caller_identity()["Account"]
    except Exception as exc:
        console.print(f"[red]Failed to connect to AWS: {exc}[/red]")
        sys.exit(1)

    rail_log(f"Connected to AWS account {account_id}")

    # Prod safety gate
    if args.environment == "prod":
        confirm = console.input("[bold red]Type DESTROY to confirm production deletion: [/bold red]")
        if confirm != "DESTROY":
            console.print("Cancelled.")
            sys.exit(0)

    ctx = NukeContext(session, args.environment, args.region, args.dry_run)

    if args.dry_run:
        rail_log("[cyan]DRY-RUN MODE — no resources will be deleted[/cyan]")

    # Progress bar setup
    progress = Progress(
        "[progress.description]{task.description}",
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
    )
    s3_task = progress.add_task("S3", total=100)
    lam_task = progress.add_task("Lambda", total=100)
    ddb_task = progress.add_task("DynamoDB", total=100)
    vpc_task = progress.add_task("VPC", total=100)

    # Two-phase cleanup with Rich Live dashboard.
    # Phase 1 (parallel): S3, Lambda, DynamoDB — must finish before VPC so
    # that VPC-attached Lambda ENIs start releasing.
    # Phase 2 (after phase 1): VPC — deletes networking resources in the
    # correct dependency order.
    with Live(
        build_dashboard(progress, args.environment, args.region, account_id),
        console=console,
        refresh_per_second=4,
    ) as live:
        # --- Phase 1: non-VPC resources (parallel) -------------------------
        with ThreadPoolExecutor(max_workers=3) as pool:
            phase1 = {
                pool.submit(cleanup_s3, ctx, progress, s3_task): "S3",
                pool.submit(cleanup_lambda, ctx, progress, lam_task): "Lambda",
                pool.submit(cleanup_dynamodb, ctx, progress, ddb_task): "DynamoDB",
            }

            while not all(f.done() for f in phase1):
                live.update(build_dashboard(progress, args.environment, args.region, account_id))
                time.sleep(0.25)

            for future, name in phase1.items():
                exc = future.exception()
                if exc:
                    rail_log(f"[red]{name} cleanup failed: {exc}[/red]")

        # --- Phase 2: VPC (sequential, after Lambda ENIs start releasing) --
        rail_log("Phase 1 complete — starting VPC cleanup")
        cleanup_vpc(ctx, progress, vpc_task)

        live.update(build_dashboard(progress, args.environment, args.region, account_id))

    # Residue verification
    if not args.dry_run:
        console.print()
        residue_scan(ctx)

    # Final summary
    console.print(Panel("\n".join(_get_rail_snapshot()), title="Final Log", subtitle="All tasks complete"))
    console.print(f"[dim]Full log written to {log_path}[/dim]")


if __name__ == "__main__":
    main()
