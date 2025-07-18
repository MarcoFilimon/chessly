"""Add user-tournament relationship

Revision ID: 855f592e156b
Revises: 2c20ea127345
Create Date: 2025-07-18 18:09:59.782743

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '855f592e156b'
down_revision: Union[str, Sequence[str], None] = '2c20ea127345'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tournaments', sa.Column('manager_id', sa.Integer(), nullable=False))
    op.create_foreign_key(
        'fk_tournaments_manager_id_users',  # <-- Add a name here
        'tournaments',
        'users',
        ['manager_id'],
        ['id'],
        ondelete='CASCADE'
    )

def downgrade() -> None:
    op.drop_constraint('fk_tournaments_manager_id_users', 'tournaments', type_='foreignkey')
    op.drop_column('tournaments', 'manager_id')
