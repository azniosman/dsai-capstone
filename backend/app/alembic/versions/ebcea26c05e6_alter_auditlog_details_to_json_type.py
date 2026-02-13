"""Alter AuditLog details to JSON type

Revision ID: ebcea26c05e6
Revises: 661d229b4654
Create Date: 2026-02-13 13:22:06.755772
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'ebcea26c05e6'
down_revision: Union[str, None] = '661d229b4654'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('audit_logs', 'details',
               existing_type=sa.TEXT(),
               type_=sa.JSON(),
               existing_nullable=True,
               postgresql_using='details::json')


def downgrade() -> None:
    op.alter_column('audit_logs', 'details',
               existing_type=sa.JSON(),
               type_=sa.TEXT(),
               existing_nullable=True,
               postgresql_using='details::text')
