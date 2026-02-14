from app.database import SessionLocal
from app.models.user import User, Role
from app.auth import hash_password, create_access_token

db = SessionLocal()
try:
    print("Checking for existing user...")
    user = db.query(User).filter(User.email == "admin@example.com").first()
    if not user:
        print("Creating admin user...")
        user = User(
            email="admin@example.com",
            hashed_password=hash_password("password123"),
            name="Admin User",
            role=Role.ADMIN,
            tenant_id=1,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"User created with ID: {user.id}")
    else:
        print(f"User already exists with ID: {user.id}")
    
    token = create_access_token(data={"sub": str(user.id), "role": "admin"}, tenant_id=1)
    print(f"TOKEN: {token}")

except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
