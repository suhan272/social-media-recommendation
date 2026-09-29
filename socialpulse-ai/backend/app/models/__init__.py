from app.database import Base
from app.models.user import User
from app.models.account import Account
from app.models.post import Post

# This ensures all models are imported so Base.metadata.create_all() finds them.
